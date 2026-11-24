import { pathToFileURL } from 'node:url';

export async function checkBackendHealth({
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_PUBLISHABLE_KEY,
  request = fetch,
} = {}) {
  if (!url || !key) throw new Error('Missing public Supabase configuration.');
  const base = new URL(url);
  if (
    base.protocol !== 'https:' ||
    !base.hostname.endsWith('.supabase.co') ||
    base.username ||
    base.password ||
    base.port ||
    base.pathname !== '/' ||
    base.search ||
    base.hash
  )
    throw new Error('Expected an HTTPS Supabase project origin.');
  if (!key.startsWith('sb_publishable_'))
    throw new Error('Only a public publishable key is allowed.');

  for (const [name, path, valid] of [
    [
      'Authentication settings',
      '/auth/v1/settings',
      value => value?.external?.email === true,
    ],
    [
      'Published guide database',
      '/rest/v1/guides?select=id&published=eq.true&limit=1',
      value =>
        Array.isArray(value) &&
        value.length <= 1 &&
        value.every(row => typeof row?.id === 'string'),
    ],
  ]) {
    let response;
    try {
      response = await request(new URL(path, base), {
        method: 'GET',
        headers: { apikey: key, Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error(`${name}: connection failed or timed out.`);
    }
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}.`);
    let value;
    try {
      value = await response.json();
    } catch {
      throw new Error(`${name}: invalid JSON response.`);
    }
    if (!valid(value)) throw new Error(`${name}: unexpected response.`);
    console.log(`${name}: OK`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  checkBackendHealth().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
