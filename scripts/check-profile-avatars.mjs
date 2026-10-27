import { pathToFileURL } from 'node:url';
import { Buffer } from 'node:buffer';

// Readiness probes use only a public key and no user session or real image.
export async function checkProfileAvatars({ url, key }, fetcher = fetch) {
  if (!url || !key)
    throw new Error('Configure the public Supabase URL and key.');
  if (!key.startsWith('sb_publishable_')) {
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role;
    } catch {}
    if (role !== 'anon')
      throw new Error('Use a publishable/anon key, never a privileged key.');
  }
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  const bucket = await fetcher(
    `${base}/storage/v1/object/public/profile-avatars/__instead_readiness_probe__`,
    {
      headers,
      signal: AbortSignal.timeout(15000),
    },
  );
  const storage = await bucket.json();
  if (
    !(
      [400, 404].includes(bucket.status) &&
      (storage.code === 'NoSuchKey' ||
        /object not found/i.test(storage.message ?? ''))
    )
  )
    throw new Error(
      'Avatar storage is not ready. Apply supabase/profile-avatars.sql before releasing Android or iOS.',
    );
  const rpc = await fetcher(
    `${base}/rest/v1/rpc/community_profile_avatar_set`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_avatar_path: null }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await rpc.json();
  if (!([401, 403].includes(rpc.status) && result.code === '42501'))
    throw new Error(
      'Avatar save function is missing or its anonymous-access protection is incorrect. Apply supabase/profile-avatars.sql.',
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await checkProfileAvatars({
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_PUBLISHABLE_KEY,
    });
    console.log(
      'Avatar storage and protected save function are ready for Android and iOS.',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
