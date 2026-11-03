type Mail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};
type ReportEmail = {
  id: string;
  recipe_id: string;
  product_id: string;
  reason: string;
  details: string;
  recipe_snapshot: Record<string, unknown>;
};

// User-supplied content is always text, never email markup or a link target.
export function formatReportEmail(
  report: ReportEmail,
  user: { id: string; email: string },
) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      char =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[char]!),
    );
  const string = (value: unknown) => (typeof value === 'string' ? value : '');
  const snapshot = report.recipe_snapshot;
  const recipe =
    snapshot.recipe && typeof snapshot.recipe === 'object'
      ? (snapshot.recipe as Record<string, unknown>)
      : snapshot;
  const title = string(recipe.name) || string(snapshot.title) || 'Recipe';
  const sections: [string, unknown][] = [
    ['Ingredients & quantities', recipe.ingredients],
    ['Equipment', recipe.equipment],
    ['Instructions', recipe.instructions],
    ['Storage & shelf life', recipe.storage ?? recipe.storage_notes],
    ['Cautions', recipe.cautions],
    ['Source', recipe.source],
  ];
  const lines = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : string(value)
          .split(/\r?\n/)
          .filter(line => line.trim());
  const heading = (label: string) =>
    `<h2 style="margin:24px 0 8px;color:#194c3d;font-size:17px;line-height:24px;">${escape(
      label,
    )}</h2>`;
  const paragraph = (value: string) =>
    `<p style="margin:0 0 12px;line-height:25px;white-space:pre-wrap;overflow-wrap:anywhere;">${escape(
      value,
    )}</p>`;
  const recipeHtml = sections
    .map(([label, value]) => {
      const content = lines(value);
      if (!content.length) return '';
      return (
        heading(label) +
        (Array.isArray(value)
          ? `<${
              label === 'Instructions' ? 'ol' : 'ul'
            } style="margin:0;padding-left:24px;line-height:25px;">${content
              .map(item => `<li style="padding:0 0 6px;">${escape(item)}</li>`)
              .join('')}</${label === 'Instructions' ? 'ol' : 'ul'}>`
          : paragraph(content.join('\n')))
      );
    })
    .join('');
  const metadata: [string, string][] = [
    ['Verified reporter email', user.email],
    ['Reporter account ID', user.id],
    ['Report ID', report.id],
    ['Recipe ID', report.recipe_id],
    ['Topic', report.product_id],
  ];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5ed;color:#253c34;font-family:Arial,Helvetica,sans-serif;font-size:15px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f5ed;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dce4da;border-radius:16px;">
<tr><td style="padding:28px 28px 24px;background:#194c3d;border-radius:16px 16px 0 0;color:#ffffff;">
<p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;font-weight:bold;color:#dff36b;">INSTEAD · RECIPE CONCERN</p>
<h1 style="margin:0;font-size:25px;line-height:33px;">${escape(title)}</h1>
</td></tr><tr><td style="padding:4px 28px 28px;">
${heading('Reason')}${paragraph(report.reason)}
${heading(
  'Reported concern',
)}<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:16px;background:#f6f8ee;border-left:4px solid #a7bfaa;">${paragraph(
    report.details,
  )}</td></tr></table>
<p style="margin:24px 0;"><a href="https://insteadtry.com/admin" style="display:inline-block;background:#194c3d;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:8px;">Open admin panel</a></p>
<p style="margin:0;color:#66756c;font-size:13px;line-height:20px;">Reply to this email to contact the verified reporter.</p>
${heading('Recipe details')}${
    recipeHtml || paragraph('Recipe details are unavailable.')
  }
<hr style="margin:28px 0;border:0;border-top:1px solid #dce4da;">
${heading('Reporter & reference details')}
${metadata
  .map(
    ([label, value]) =>
      `<p style="margin:0 0 12px;font-size:13px;line-height:20px;overflow-wrap:anywhere;word-break:break-word;"><strong>${escape(
        label,
      )}</strong><br>${escape(value)}</p>`,
  )
  .join('')}
<p style="margin:24px 0 0;color:#66756c;font-size:12px;line-height:19px;">Private support notification. Recipe and concern text are supplied for review and may contain inaccurate claims.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    'INSTEAD — Recipe concern',
    title,
    '',
    'Reason: ' + report.reason,
    '',
    'REPORTED CONCERN',
    report.details,
    '',
    'Open admin panel: https://insteadtry.com/admin',
    'Reply to this email to contact the verified reporter.',
    '',
    'RECIPE DETAILS',
    ...sections.flatMap(([label, value]) => {
      const content = lines(value);
      return content.length
        ? [label, ...content.map(item => '- ' + item), '']
        : [];
    }),
    'REPORTER & REFERENCE DETAILS',
    ...metadata.map(([label, value]) => label + ': ' + value),
    '',
    'Private support notification. Submitted text is provided for review, not endorsed by INSTEAD.',
  ].join('\n');
  return { html, text };
}

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
          ...formatReportEmail({ ...report, id }, user),
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
