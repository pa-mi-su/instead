// Authenticated self-deletion only. No account id is accepted from the caller.
// Storage is removed through the Storage API before Auth cascades database rows.
export function createDeletionHandler(
  config: { url: string; serviceKey: string },
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
  const reply = (status: number, message: string) =>
    new Response(JSON.stringify({ message }), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  const adminHeaders = {
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
    'Content-Type': 'application/json',
  };
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Use POST.');
    const authorization = request.headers.get('Authorization');
    if (
      !authorization?.startsWith('Bearer ') ||
      !config.url ||
      !config.serviceKey
    )
      return reply(401, 'Sign in to delete your own account.');
    try {
      const identity = await fetcher(`${config.url}/auth/v1/user`, {
        headers: { apikey: config.serviceKey, Authorization: authorization },
      });
      if (!identity.ok)
        return reply(401, 'Sign in to delete your own account.');
      const user = await identity.json();
      if (
        !user?.email_confirmed_at ||
        user.is_anonymous ||
        typeof user.id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(user.id)
      )
        return reply(403, 'A verified account is required.');

      const state = await fetcher(
        `${
          config.url
        }/rest/v1/community_account_controls?user_id=eq.${encodeURIComponent(
          user.id,
        )}&select=deletion_requested_at`,
        { headers: adminHeaders },
      );
      if (!state.ok)
        return reply(
          503,
          'Deletion is pending. Please try again or contact support.',
        );
      const rows = await state.json();
      if (!Array.isArray(rows) || !rows[0]?.deletion_requested_at)
        return reply(
          409,
          'Confirm an account deletion request in the app first.',
        );
      const folderResult = await fetcher(
        `${
          config.url
        }/rest/v1/community_photo_folders?user_id=eq.${encodeURIComponent(
          user.id,
        )}&select=folder_id`,
        { headers: adminHeaders },
      );
      if (!folderResult.ok)
        return reply(
          503,
          'Deletion is pending. Please try again or contact support.',
        );
      const folderRows = await folderResult.json();
      if (
        !Array.isArray(folderRows) ||
        folderRows.some(
          row =>
            typeof row.folder_id !== 'string' ||
            !/^[0-9a-f-]{36}$/i.test(row.folder_id),
        )
      )
        throw new Error('Invalid photo folder');
      const folders = [
        ...new Set([user.id, ...folderRows.map(row => row.folder_id)]),
      ];
      for (const folder of folders) {
        const prefix = `${folder}/`;
        let empty = false;
        for (let batch = 0; batch < 20; batch++) {
          const listed = await fetcher(
            `${config.url}/storage/v1/object/list/recipe-photos`,
            {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
            },
          );
          if (!listed.ok)
            return reply(
              503,
              'Photo deletion is pending. Please try again or contact support.',
            );
          const files = await listed.json();
          if (!Array.isArray(files))
            throw new Error('Invalid storage response');
          if (!files.length) {
            empty = true;
            break;
          }
          if (
            files.some(
              file =>
                typeof file.name !== 'string' ||
                !/^[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(file.name),
            )
          )
            throw new Error('Unexpected storage path');
          const removed = await fetcher(
            `${config.url}/storage/v1/object/recipe-photos`,
            {
              method: 'DELETE',
              headers: adminHeaders,
              body: JSON.stringify({
                prefixes: files.map(file => prefix + file.name),
              }),
            },
          );
          if (!removed.ok)
            return reply(
              503,
              'Photo deletion is pending. Please try again or contact support.',
            );
        }
        if (!empty) return reply(503, 'Deletion is pending. Contact support.');
      }
      const avatarPrefix = `${user.id}/`;
      const avatarList = await fetcher(
        `${config.url}/storage/v1/object/list/profile-avatars`,
        {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            prefix: avatarPrefix,
            limit: 1000,
            offset: 0,
          }),
        },
      );
      if (!avatarList.ok)
        return reply(
          503,
          'Avatar deletion is pending. Please try again or contact support.',
        );
      const avatars = await avatarList.json();
      if (
        !Array.isArray(avatars) ||
        avatars.some(
          file =>
            typeof file.name !== 'string' ||
            !/^avatar\.(jpeg|png|webp)$/.test(file.name),
        )
      )
        throw new Error('Unexpected avatar path');
      if (avatars.length) {
        const removed = await fetcher(
          `${config.url}/storage/v1/object/profile-avatars`,
          {
            method: 'DELETE',
            headers: adminHeaders,
            body: JSON.stringify({
              prefixes: avatars.map(file => avatarPrefix + file.name),
            }),
          },
        );
        if (!removed.ok)
          return reply(
            503,
            'Avatar deletion is pending. Please try again or contact support.',
          );
      }
      const deleted = await fetcher(
        `${config.url}/auth/v1/admin/users/${user.id}`,
        {
          method: 'DELETE',
          headers: adminHeaders,
          body: JSON.stringify({ should_soft_delete: false }),
        },
      );
      if (!deleted.ok && deleted.status !== 404)
        return reply(
          503,
          'Account deletion is pending. Please try again or contact support.',
        );
      return reply(200, 'Account deleted.');
    } catch {
      return reply(
        503,
        'Deletion is pending. Please try again or contact support.',
      );
    }
  };
}
declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Promise<Response>) => void;
};
if (typeof Deno !== 'undefined')
  Deno.serve(
    createDeletionHandler({
      url: Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    }),
  );
