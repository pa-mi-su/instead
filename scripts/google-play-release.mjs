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
