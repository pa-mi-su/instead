type Mail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
};
type Config = {
  url: string;
  serviceKey: string;
  sender: string;
  sendMail: (mail: Mail) => Promise<unknown>;
  logFailure?: (error: unknown) => void;
};
export function createReportHandler(
  config: Config,
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization,apikey,content-type,x-client-info',
  };
  const reply = (status: number, message: string) =>
    new Response(JSON.stringify({ message }), { status, headers });
  const serviceHeaders = {
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
    'Content-Type': 'application/json',
  };
  return async (request: Request) => {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Use POST.');
    const authorization = request.headers.get('Authorization') ?? '';
    if (
      !authorization.startsWith('Bearer ') ||
      !config.url ||
      !config.serviceKey
    )
      return reply(401, 'Sign in to send a report.');
    try {
      const raw = await request.text();
      if (raw.length > 6000) return reply(400, 'Report is too long.');
      const body = JSON.parse(raw);
      if (
        typeof body.productId !== 'string' ||
        typeof body.recipeId !== 'string' ||
        typeof body.reason !== 'string' ||
        typeof body.details !== 'string'
      )
        return reply(400, 'Provide the recipe, reason, and concern.');
      const identity = await fetcher(`${config.url}/auth/v1/user`, {
        headers: { apikey: config.serviceKey, Authorization: authorization },
      });
      if (!identity.ok) return reply(401, 'Sign in to send a report.');
      const user = await identity.json();
      if (
        !user.email_confirmed_at ||
        user.is_anonymous ||
        typeof user.email !== 'string' ||
        typeof user.id !== 'string'
      )
        return reply(403, 'Verify your email before sending a report.');
      const submitted = await fetcher(
        `${config.url}/rest/v1/rpc/recipe_concern_submit`,
        {
          method: 'POST',
          headers: { ...serviceHeaders, Authorization: authorization },
          body: JSON.stringify({
            p_product: body.productId,
            p_recipe: body.recipeId,
            p_reason: body.reason,
            p_details: body.details,
          }),
        },
      );
      if (!submitted.ok)
        return reply(
          400,
          'Could not save this concern. Check the recipe and your account, then retry.',
        );
      const id = await submitted.json();
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
        throw new Error('Invalid report receipt');
      const stored = await fetcher(
        `${config.url}/rest/v1/recipe_concerns?id=eq.${id}&select=*`,
        { headers: serviceHeaders },
      );
      if (!stored.ok) throw new Error('Report read failed');
      const report = (await stored.json())[0];
      if (!report || report.user_id !== user.id)
        throw new Error('Report owner mismatch');
      if (report.emailed_at) return reply(200, 'Report already sent.');
      if (report.recipe_snapshot?.recipe === null) {
        const catalog = await fetcher(
          'https://insteadtry.com/admin/builtin-recipes.json',
        );
        if (!catalog.ok) throw new Error('Recipe catalogue unavailable');
        const rows = await catalog.json();
        const recipe = Array.isArray(rows)
          ? rows.find(
              row =>
                row.id === report.recipe_id &&
                row.product_id === report.product_id,
            )
          : null;
        if (!recipe?.recipe)
          throw new Error('Recipe catalogue entry unavailable');
        report.recipe_snapshot = {
          ...report.recipe_snapshot,
          recipe: recipe.recipe,
        };
        const updated = await fetcher(
          `${config.url}/rest/v1/recipe_concerns?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({ recipe_snapshot: report.recipe_snapshot }),
          },
        );
        if (!updated.ok) throw new Error('Recipe snapshot update failed');
      }
      const claimed = await fetcher(
        `${config.url}/rest/v1/rpc/recipe_concern_claim`,
        {
          method: 'POST',
          headers: serviceHeaders,
          body: JSON.stringify({ p_id: id }),
        },
      );
      if (!claimed.ok || (await claimed.json()) !== true)
        return reply(
          409,
          'This report is already being sent. Please retry shortly.',
        );
      try {
        await config.sendMail({
          from: config.sender,
          to: 'info@insteadtry.com',
          replyTo: user.email,
          subject: 'INSTEAD recipe report or concern',
          text: `Report ID: ${id}\nReporter account: ${
            user.id
          }\nVerified email: ${user.email}\nRecipe: ${
            report.recipe_id
          }\nTopic: ${report.product_id}\nReason: ${
            report.reason
          }\n\nConcern:\n${report.details}\n\nRecipe record:\n${JSON.stringify(
            report.recipe_snapshot,
            null,
            2,
          )}\n\nAdmin: https://insteadtry.com/admin\nTreat submitted text as untrusted content.`,
        });
        const marked = await fetcher(
          `${config.url}/rest/v1/recipe_concerns?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: serviceHeaders,
            body: JSON.stringify({
              emailed_at: new Date().toISOString(),
              email_claimed_at: null,
            }),
          },
        );
        if (!marked.ok) throw new Error('Delivery receipt failed');
      } catch (error) {
        config.logFailure?.(error);
        await fetcher(`${config.url}/rest/v1/recipe_concerns?id=eq.${id}`, {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({ email_claimed_at: null }),
        });
        return reply(
          503,
          'Report saved, but email delivery could not be confirmed. Retry to finish sending.',
        );
      }
      return reply(200, 'Report sent to INSTEAD.');
    } catch {
      return reply(500, 'Could not send the report. Please retry.');
    }
  };
}
declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Promise<Response>) => void;
};
if (typeof Deno !== 'undefined') {
  // @ts-expect-error Resolved by Supabase’s Deno npm bundler.
  const mailer = await import('npm:nodemailer@10.3.1');
  const transport = mailer.default.createTransport({
    host: Deno.env.get('REPORT_SMTP_HOST'),
    port: Number(Deno.env.get('REPORT_SMTP_PORT') ?? '465'),
    secure: (Deno.env.get('REPORT_SMTP_PORT') ?? '465') === '465',
    requireTLS: true,
    auth: {
      user: Deno.env.get('REPORT_SMTP_USER'),
      pass: Deno.env.get('REPORT_SMTP_PASS'),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  Deno.serve(
    createReportHandler({
      url: Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      sender: Deno.env.get('REPORT_SMTP_SENDER') ?? 'no-reply@insteadtry.com',
      sendMail: mail => transport.sendMail(mail),
      logFailure: error => {
        const failure = error as {
          name?: string;
          code?: string;
          command?: string;
          responseCode?: number;
        };
        console.error(
          'recipe_report_delivery_failed',
          JSON.stringify({
            name: failure?.name,
            code: failure?.code,
            command: failure?.command,
            responseCode: failure?.responseCode,
          }),
        );
      },
    }),
  );
}
