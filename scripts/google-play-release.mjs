export function playRelease({ track, status = 'completed', name, fraction }) {
  if (!['internal', 'alpha', 'beta', 'production'].includes(track))
    throw new Error(`Unsupported Google Play track: ${track}`);
  if (!['completed', 'draft', 'inProgress'].includes(status))
    throw new Error(`Unsupported new Google Play release status: ${status}`);
  const release = { name, status };
  if (status === 'inProgress') {
    const value = Number(fraction);
    if (track === 'internal' || !(value > 0 && value < 1))
      throw new Error(
        'A staged rollout requires a non-internal track and a fraction between 0 and 1.',
      );
    release.userFraction = value;
  } else if (fraction) {
    throw new Error(
      'A rollout fraction is only valid for inProgress releases.',
    );
  }
  return release;
}

export class PlayRequestError extends Error {
  constructor(status, body) {
    super(
      `Google Play request failed with HTTP ${status}: ${body.slice(0, 1000)}`,
    );
    this.status = status;
    try {
      this.playMessage = JSON.parse(body).error?.message ?? '';
    } catch {
      this.playMessage = '';
    }
  }
}

export function reviewMode(value = 'auto') {
  if (!['auto', 'save'].includes(value))
    throw new Error(`Unsupported Google Play review mode: ${value}`);
  return value;
}

export async function commitPlayEdit({ request, editUrl, mode = 'auto' }) {
  reviewMode(mode);
  // Never let an upload implicitly cancel a review already in progress.
  const commit = save => {
    const url = new URL(`${editUrl}:commit`);
    url.searchParams.set('changesInReviewBehavior', 'ERROR_IF_IN_REVIEW');
    if (save) url.searchParams.set('changesNotSentForReview', 'true');
    return request(url.toString(), { method: 'POST' });
  };
  if (mode === 'save') {
    await commit(true);
    return 'saved-for-review';
  }
  try {
    await commit(false);
    return 'committed';
  } catch (error) {
    // Retry only Google's explicit, actionable rejection response, using the
    // SAME edit and bundle. Do not retry auth, review conflicts or ambiguous
    // network/5xx failures that may already have committed successfully.
    if (
      !(error instanceof PlayRequestError) ||
      error.status !== 400 ||
      !/changesNotSentForReview\s+to\s+true/i.test(error.playMessage)
    )
      throw error;
    await commit(true);
    return 'saved-for-review';
  }
}
