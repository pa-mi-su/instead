// Self-deletion, or explicit admin deletion authorized by an MFA-protected RPC.
// Storage is removed through the Storage API before Auth cascades database rows.
export function createDeletionHandler(
  config: { url: string; serviceKey: string },
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Safe, read-only deployment handshake: legacy functions reject GET rather
    // than interpreting the administrator's request as self-deletion.
    if (
      request.method === 'GET' &&
      new URL(request.url).searchParams.get('action') === 'capabilities'
    )
      return new Response(JSON.stringify({ adminDeletionVersion: 1 }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
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

      // A target id alone never changes the self-deletion path.
      const body = await request.json().catch(() => ({}));
      if (body?.action && body.action !== 'admin-delete')
        return reply(400, 'Unknown deletion action.');
      if (body?.action === 'admin-delete') {
        if (
          typeof body.user_id !== 'string' ||
          !/^[0-9a-f-]{36}$/i.test(body.user_id) ||
          typeof body.email !== 'string' ||
          typeof body.reason !== 'string'
        )
          return reply(
            400,
            'A target account, confirmation email, and reason are required.',
          );
        const authorized = await fetcher(
          `${config.url}/rest/v1/rpc/community_admin_prepare_deletion`,
          {
            method: 'POST',
            headers: { ...adminHeaders, Authorization: authorization },
            body: JSON.stringify({
              p_user: body.user_id,
              p_email: body.email,
              p_note: body.reason,
            }),
          },
        );
        if (!authorized.ok)
          return reply(
            authorized.status >= 500
              ? 503
              : authorized.status === 403 || authorized.status === 401
              ? 403
              : 409,
            'Deletion was not authorized. Check admin MFA, the account email, and the reason. Admin accounts cannot be deleted here.',
          );
        const target = await authorized.json();
        if (target !== body.user_id || target === user.id)
          return reply(403, 'Invalid deletion authorization.');
        user.id = target;
      }

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
          body?.action === 'admin-delete'
            ? 'Admin deletion preparation is missing. Apply the current admin-user-deletion database migration and retry.'
            : 'Confirm an account deletion request in the app first.',
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
