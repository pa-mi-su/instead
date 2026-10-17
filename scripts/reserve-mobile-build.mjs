// Durable, append-only Git tags reserve one number per platform/job attempt.
// The floor includes release run 4, which was already running under the old formula.
export async function reserveBuild({
  platform,
  repository,
  sha,
  token,
  fetcher = fetch,
}) {
  if (!['android', 'ios'].includes(platform))
    throw new Error('Invalid platform');
  if (!repository || !sha || !token)
    throw new Error('Missing build reservation configuration');
  const prefix = `instead-build-${platform}-`;
  async function api(path, options = {}) {
    const response = await fetcher(
      `https://api.github.com/repos/${repository}${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...options.headers,
        },
      },
    );
    return response;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    let highest = 401;
    const response = await api(`/git/matching-refs/tags/${prefix}`);
    if (!response.ok)
      throw new Error(`Build reservation lookup failed (${response.status})`);
    const refs = await response.json();
    if (!Array.isArray(refs))
      throw new Error('Invalid build reservation response');
    for (const item of refs) {
      if (!item.ref?.startsWith(`refs/tags/${prefix}`)) continue;
      const suffix = item.ref.slice(`refs/tags/${prefix}`.length);
      if (/^\d+$/.test(suffix) && Number.isSafeInteger(Number(suffix)))
        highest = Math.max(highest, Number(suffix));
    }
    const number = highest + 1;
    const result = await api('/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/tags/${prefix}${number}`, sha }),
    });
    if (result.status === 201) return number;
    if (result.status !== 422)
      throw new Error(`Build reservation failed (${result.status})`);
    // A competing release may have reserved this number. Re-read before retrying.
  }
  throw new Error('Could not reserve a unique build number');
}
if (process.argv[1]?.endsWith('/reserve-mobile-build.mjs')) {
  const number = await reserveBuild({
    platform: process.env.BUILD_PLATFORM,
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.BUILD_SHA,
    token: process.env.GH_TOKEN,
  });
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_ENV, `INSTEAD_BUILD_NUMBER=${number}\n`);
  console.log(`Reserved ${process.env.BUILD_PLATFORM} build ${number}`);
}
