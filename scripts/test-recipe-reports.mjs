import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(
  new URL('../supabase/functions/report-recipe/index.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { createReportHandler, formatReportEmail } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const id = '00000000-0000-4000-8000-000000000001';
const user = {
  id: 'reporter',
  email: 'verified@example.test',
  email_confirmed_at: '2026-11-03',
};
function fixture({
  sent = false,
  failMail = false,
  signedIn = true,
  claimed = true,
  catalogue = false,
  limited = false,
} = {}) {
  const calls = [],
    mail = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options });
    let data;
    if (url.endsWith('/auth/v1/user'))
      return new Response(JSON.stringify(user), {
        status: signedIn ? 200 : 401,
      });
    if (url === 'https://insteadtry.com/admin/builtin-recipes.json')
      data = [
        {
          id: 'builtin:recipe',
          product_id: 'topic',
          recipe: { name: 'Full catalogue recipe', ingredients: ['Water'] },
        },
      ];
    else if (url.endsWith('/rpc/recipe_concern_submit')) {
      if (limited)
        return new Response(
          JSON.stringify({
            message: 'Too many actions. Please try again later.',
          }),
          { status: 400 },
        );
      data = id;
    } else if (url.endsWith('/rpc/recipe_concern_claim')) data = claimed;
    else if (options.method === 'PATCH') data = null;
    else
      data = [
        {
          user_id: user.id,
          recipe_id: 'builtin:recipe',
          product_id: 'topic',
          reason: 'Other',
          details: 'Concern text',
          recipe_snapshot: catalogue
            ? { title: 'Real server recipe', recipe: null }
            : { title: 'Real server recipe' },
          emailed_at: sent ? 'today' : null,
        },
      ];
    return new Response(JSON.stringify(data), { status: 200 });
  };
  const handler = createReportHandler(
    {
      url: 'https://project.test',
      serviceKey: 'server-only',
      sender: 'no-reply@insteadtry.com',
      sendMail: async message => {
        if (failMail) throw Error('SMTP error');
        mail.push(message);
      },
    },
    fetcher,
  );
  const request = () =>
    new Request('https://function.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer user-session' },
      body: JSON.stringify({
        recipeId: 'builtin:recipe',
        productId: 'topic',
        reason: 'Other',
        details: 'Concern text',
        email: 'forged@example.test',
        to: 'attacker@example.test',
      }),
    });
  return { handler, request, calls, mail };
}
test('report mail uses verified identity, stored recipe and a fixed recipient', async () => {
  const f = fixture();
  assert.equal((await f.handler(f.request())).status, 200);
  assert.equal(f.mail.length, 1);
  assert.equal(f.mail[0].to, 'info@insteadtry.com');
  assert.equal(f.mail[0].replyTo, user.email);
  assert.match(f.mail[0].text, /Real server recipe/);
  assert.doesNotMatch(f.mail[0].text, /forged|attacker/);
  const rpc = f.calls.find(call =>
    call.url.endsWith('/rpc/recipe_concern_submit'),
  );
  assert.equal(rpc.options.headers.Authorization, 'Bearer user-session');
  assert.match(f.calls.at(-1).options.body, /emailed_at/);
});
test('unauthenticated callers cannot create reports or send mail', async () => {
  const f = fixture({ signedIn: false });
  assert.equal((await f.handler(f.request())).status, 401);
  assert.equal(f.mail.length, 0);
  assert.equal(f.calls.length, 1);
});
test('email failure is not acknowledged as success and releases the retry claim', async () => {
  const f = fixture({ failMail: true });
  assert.equal((await f.handler(f.request())).status, 503);
  assert.deepEqual(JSON.parse(f.calls.at(-1).options.body), {
    email_claimed_at: null,
  });
});
test('duplicate completed reports and concurrent claims do not send another email', async () => {
  const done = fixture({ sent: true });
  assert.equal((await done.handler(done.request())).status, 200);
  assert.equal(done.mail.length, 0);
  const busy = fixture({ claimed: false });
  assert.equal((await busy.handler(busy.request())).status, 409);
  assert.equal(busy.mail.length, 0);
});

test('catalogue reports include canonical ingredients in the stored snapshot and email', async () => {
  const f = fixture({ catalogue: true });
  assert.equal((await f.handler(f.request())).status, 200);
  assert.match(f.mail[0].text, /Full catalogue recipe/);
  assert.match(f.mail[0].text, /Water/);
  const patches = f.calls.filter(call => call.options.method === 'PATCH');
  assert.match(patches[0].options.body, /recipe_snapshot/);
});

test('HTML and text present user-submitted recipe fields without raw JSON or executable markup', () => {
  const report = {
    id,
    recipe_id: 'recipe-id',
    product_id: 'topic',
    reason: 'Other',
    details: '<img src=x onerror="alert(1)">\nCheck quantities & storage.',
    recipe_snapshot: {
      title: 'Soap <test>',
      ingredients: 'Water\nSoap',
      instructions: 'Mix carefully',
      storage_notes: 'Keep dry',
      cautions: 'Do not eat',
      source: 'https://example.test/<unsafe>',
    },
  };
  const email = formatReportEmail(report, user);
  assert.match(email.html, /Soap &lt;test&gt;/);
  assert.match(email.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(email.html, /<img|<script|href="https:\/\/example/);
  assert.match(email.html, /Keep dry/);
  assert.match(email.html, /Verified reporter email/);
  assert.match(email.text, /REPORTED CONCERN/);
  assert.match(email.text, /Water\n- Soap/);
  assert.doesNotMatch(email.text, /"recipe_snapshot"|"ingredients":/);
});
test('catalogue recipe arrays render as readable lists, including numbered instructions', () => {
  const email = formatReportEmail(
    {
      id,
      recipe_id: 'catalogue',
      product_id: 'topic',
      reason: 'Other',
      details: 'Please review',
      recipe_snapshot: {
        title: 'Catalogue title',
        recipe: {
          name: 'Recipe name',
          ingredients: ['Water', 'Soap'],
          equipment: ['Jar'],
          instructions: ['Mix', 'Store'],
          storage: 'Keep dry',
          cautions: 'Use care',
        },
      },
    },
    user,
  );
  assert.match(email.html, /<ol[^>]*><li[^>]*>Mix/);
  assert.match(email.html, /<li[^>]*>Jar/);
  assert.match(email.text, /Recipe name/);
  assert.match(email.text, /Keep dry/);
});

test('rate-limited reports return 429 and never attempt email delivery', async () => {
  const f = fixture({ limited: true });
  const response = await f.handler(f.request());
  assert.equal(response.status, 429);
  assert.match((await response.json()).message, /limit reached/);
  assert.equal(f.mail.length, 0);
  assert.equal(
    f.calls.some(call => call.url.endsWith('/rpc/recipe_concern_claim')),
    false,
  );
});
