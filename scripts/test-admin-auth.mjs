import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import {
  isIdle,
  hasRecentMfa,
  ADMIN_IDLE_MS,
  ADMIN_MFA_MS,
} from '../website/admin/auth-security.mjs';
const now = 1792184400000;
const jwt = claims =>
  'header.' +
  Buffer.from(JSON.stringify(claims)).toString('base64url') +
  '.signature';
test('admin CSP allows same-origin recipe catalog and configured Supabase requests', async () => {
  const html = await readFile(
    new URL('../website/admin/index.html', import.meta.url),
    'utf8',
  );
  const policy = html.match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  )?.[1];

  assert.ok(policy, 'admin Content Security Policy exists');
  assert.match(policy, /connect-src 'self' __SUPABASE_ORIGIN__/);
});
test('admin review keeps only the reason field and rejects directly to Trash', async () => {
  const source = await readFile(
    new URL('../website/admin/admin.mjs', import.meta.url),
    'utf8',
  );
  const html = await readFile(
    new URL('../website/admin/index.html', import.meta.url),
    'utf8',
  );

  assert.match(source, /Review reason \/ action note/);
  assert.doesNotMatch(source, /Reviewer qualifications|Evidence sources/);
  assert.match(source, /Reject and move to Trash/);
  assert.match(source, /decision: 'rejected'/);
  assert.match(source, /\$\('filter'\)\.value = 'trash'/);
  assert.doesNotMatch(html, /<option value="rejected">/);
});
test('admin idle handling expires old, missing, and invalid timestamps', () => {
  assert.equal(isIdle({ last_activity: now - ADMIN_IDLE_MS + 1 }, now), false);
  assert.equal(isIdle({ last_activity: now - ADMIN_IDLE_MS }, now), true);
  assert.equal(isIdle({}, now), true);
  assert.equal(isIdle({ last_activity: now + 120000 }, now), true);
});
test('MFA navigation rejects email-only, expired, wrong-method, and malformed claims', () => {
  assert.equal(
    hasRecentMfa(
      jwt({ aal: 'aal1', amr: [{ method: 'otp', timestamp: now / 1000 }] }),
      now,
    ),
    false,
  );
  assert.equal(
    hasRecentMfa(
      jwt({ aal: 'aal2', amr: [{ method: 'totp', timestamp: now / 1000 }] }),
      now,
    ),
    true,
  );
  assert.equal(
    hasRecentMfa(
      jwt({
        aal: 'aal2',
        amr: [{ method: 'totp', timestamp: (now - ADMIN_MFA_MS) / 1000 }],
      }),
      now,
    ),
    false,
  );
  assert.equal(
    hasRecentMfa(
      jwt({ aal: 'aal2', amr: [{ method: 'otp', timestamp: now / 1000 }] }),
      now,
    ),
    false,
  );
  assert.equal(
    hasRecentMfa(
      jwt({
        aal: 'aal2',
        amr: [{ method: 'totp', timestamp: (now + 120000) / 1000 }],
      }),
      now,
    ),
    false,
  );
  assert.equal(hasRecentMfa('bad token', now), false);
});

test('email challenges expire at five minutes and reset invalidates them', async () => {
  const { EmailChallenge, ADMIN_EMAIL_CODE_MS } = await import(
    '../website/admin/auth-security.mjs'
  );
  const challenge = new EmailChallenge();
  assert.equal(challenge.current(now), null);
  challenge.start('review@example.com', now);
  assert.deepEqual(challenge.current(now + ADMIN_EMAIL_CODE_MS - 1), {
    email: 'review@example.com',
  });
  assert.equal(challenge.current(now + ADMIN_EMAIL_CODE_MS), null);
  assert.equal(challenge.current(now - 1), null);
  challenge.start('other@example.com', now);
  challenge.reset();
  assert.equal(challenge.current(now), null);
});
test('login reset removes old code screens, credentials, and disabled controls', async () => {
  const { resetLoginForm } = await import('../website/admin/auth-security.mjs');
  const nodes = Object.fromEntries(
    [
      'email-form',
      'code-form',
      'mfa-form',
      'email',
      'code',
      'mfa-code',
      'mfa-start',
      'send',
    ].map(id => [
      id,
      {
        value: 'stale secret',
        hidden: false,
        disabled: true,
        textContent: 'Resend in 59s',
        reset() {},
        querySelectorAll() {
          return [nodes.send, nodes.code];
        },
      },
    ]),
  );
  resetLoginForm(id => nodes[id]);
  assert.equal(nodes['code-form'].hidden, true);
  for (const id of ['email', 'code', 'mfa-code'])
    assert.equal(nodes[id].value, '');
  assert.equal(nodes.send.disabled, false);
  assert.equal(nodes['mfa-start'].disabled, false);
  assert.equal(nodes.send.textContent, 'Send sign-in code');
});

test('session-ended modal wipes auth state immediately and shows clean login only after OK', async () => {
  const { runInNewContext } = await import('node:vm');
  const { resetLoginForm, EmailChallenge } = await import(
    '../website/admin/auth-security.mjs'
  );
  const source = await readFile(
    new URL('../website/admin/admin.mjs', import.meta.url),
    'utf8',
  );
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id))
      nodes.set(id, {
        hidden: false,
        value: 'old secret',
        disabled: true,
        textContent: '',
        reset() {},
        querySelectorAll() {
          return [];
        },
        replaceChildren() {},
        removeAttribute() {},
        focus() {
          this.focused = true;
        },
      });
    return nodes.get(id);
  };
  let acknowledge;
  let revoked;
  const context = {
    $,
    resetLoginForm,
    EmailChallenge,
    clearTimeout() {},
    clearInterval() {},
    closeNotice() {},
    sessionStorage: { removeItem() {} },
    dialog: () =>
      new Promise(resolve => {
        acknowledge = resolve;
      }),
    request: async (...args) => {
      revoked = args;
    },
  };
  runInNewContext(
    `
    let session = { access_token: 'old-token' }, epoch = 0, authEpoch = 0;
    let cooldown, codeTimer, idleTimer, mfaFactor, unfinishedFactor, builtinItems, builtinEditingId, builtinSearch, signoutPending;
    const storageKey = 'test'; const emailChallenge = new EmailChallenge();
    ${source.slice(
      source.indexOf('function clearSession()'),
      source.indexOf('function saveSession('),
    )}
    ${source.slice(
      source.indexOf('async function signOutAdmin('),
      source.indexOf('async function beginAdmin('),
    )}
    globalThis.endSession = signOutAdmin;
    globalThis.sessionIsCleared = () => session === null;
  `,
    context,
  );
  const pending = context.endSession('Session expired');
  assert.equal(context.sessionIsCleared(), true);
  assert.equal($('login').hidden, true);
  assert.equal($('workspace').hidden, true);
  assert.equal($('code-form').hidden, true);
  assert.equal($('email').value, '');
  assert.equal($('code').value, '');
  assert.equal(revoked[0], '/auth/v1/logout?scope=local');
  const duplicate = context.endSession('Duplicate timeout');
  acknowledge();
  await Promise.all([pending, duplicate]);
  assert.equal($('login').hidden, false);
  assert.equal($('email').focused, true);
  assert.equal($('send').textContent, 'Send sign-in code');
});

test('late email verification cannot recreate a session after reset', async () => {
  const { runInNewContext } = await import('node:vm');
  const { EmailChallenge } = await import('../website/admin/auth-security.mjs');
  const source = await readFile(
    new URL('../website/admin/admin.mjs', import.meta.url),
    'utf8',
  );
  const handlers = new Map();
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id))
      nodes.set(id, {
        value: '12345678',
        disabled: false,
        addEventListener(type, handler) {
          handlers.set(`${id}:${type}`, handler);
        },
      });
    return nodes.get(id);
  };
  let respond;
  let saved = false;
  let revoked = false;
  const challenge = new EmailChallenge();
  challenge.start('review@example.com');
  const context = {
    $,
    emailChallenge: challenge,
    clearTimeout() {},
    clearInterval() {},
    saveSession() {
      saved = true;
    },
    beginAdmin() {
      throw new Error('Must not open admin');
    },
    request: route =>
      route === '/auth/v1/verify'
        ? new Promise(resolve => {
            respond = resolve;
          })
        : ((revoked = true), Promise.resolve()),
  };
  runInNewContext(
    `let authEpoch = 1, signoutPending = null, codeTimer, cooldown;
    globalThis.invalidate = () => { authEpoch += 1; emailChallenge.reset(); };
    ${source.slice(
      source.indexOf("$('code-form').addEventListener('submit'"),
      source.indexOf("$('signout').addEventListener"),
    )}
  `,
    context,
  );
  const pending = handlers.get('code-form:submit')({
    preventDefault() {},
    submitter: { disabled: false },
  });
  context.invalidate();
  respond({ access_token: 'late-token' });
  await pending;
  assert.equal(saved, false);
  assert.equal(revoked, true);
});

test('admin restore confirmation distinguishes single recipe from contributor scope', async () => {
  const { restorationPlan } = await import(
    '../website/admin/user-activity.mjs'
  );
  const user = { user_id: 'reporter', email: 'reporter@example.invalid' };
  const row = {
    scope: 'recipe',
    product_id: 'guide',
    recipe_id: 'builtin:one',
    title: '<unsafe title>',
  };
  const recipe = restorationPlan(user, row);
  assert.equal(recipe.payload.p_scope, 'recipe');
  assert.equal(recipe.payload.p_contributor, null);
  assert.equal(recipe.payload.p_recipe, 'builtin:one');
  assert.match(recipe.message, /only\?/);
  assert.match(recipe.message, /report stays on file/);
  const contributor = restorationPlan(user, {
    ...row,
    scope: 'contributor',
    contributor_id: 'author',
    contributor: 'Example',
    affected_recipes: 2,
  });
  assert.deepEqual(contributor.payload, {
    p_user: 'reporter',
    p_email: 'reporter@example.invalid',
    p_scope: 'contributor',
    p_product: null,
    p_recipe: null,
    p_contributor: 'author',
  });
  assert.match(contributor.message, /all their recipes/);
  assert.match(contributor.message, /including other guides/);
  assert.match(contributor.message, /Other accounts are unchanged/);
});

// Minimal DOM adapter exercises asynchronous UI behavior without a browser dependency.
function activityHarness() {
  const node = (tag, text, className) => ({
    tag,
    text,
    className,
    children: [],
    attributes: {},
    append(...entries) {
      this.children.push(...entries);
    },
    replaceChildren(...entries) {
      this.children = entries;
    },
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    remove() {},
  });
  const root = node('section');
  const find = (entry, label) =>
    entry.text === label
      ? entry
      : entry.children.map(child => find(child, label)).find(Boolean);
  const button = (label, callback) =>
    Object.assign(node('button', label), { click: callback });
  return { root, element: node, button, find: label => find(root, label) };
}
test('admin activity ignores late private responses after session changes', async () => {
  const { mountUserActivity } = await import(
    '../website/admin/user-activity.mjs'
  );
  const h = activityHarness();
  let current = true,
    resolve;
  const pending = new Promise(done => {
    resolve = done;
  });
  mountUserActivity(
    h.root,
    { user_id: 'example' },
    {
      ...h,
      request: () => pending,
      token: async () => 'fixture',
      isCurrent: () => current,
      dialog: async () => null,
    },
  );
  const load = h.find('View account details & activity').click();
  await Promise.resolve();
  current = false;
  h.root.replaceChildren();
  resolve({ user: { email: 'private@example.invalid' }, stats: {} });
  await load;
  assert.equal(h.root.children.length, 0);
});
test('admin restore cancellation makes no mutation; confirmation sends exact scope and reason', async () => {
  const { mountUserActivity } = await import(
    '../website/admin/user-activity.mjs'
  );
  const h = activityHarness(),
    calls = [],
    dialogs = [];
  const user = { user_id: 'reporter', email: 'reporter@example.invalid' };
  let note = null;
  const row = {
    id: 'guide:recipe',
    title: '<img onerror=bad>',
    scope: 'contributor',
    product_id: 'guide',
    recipe_id: 'recipe',
    contributor_id: 'author',
    contributor: 'Fixture',
    affected_recipes: 2,
    published: true,
  };
  mountUserActivity(h.root, user, {
    ...h,
    token: async () => 'fixture',
    isCurrent: () => true,
    dialog: async options => {
      dialogs.push(options);
      return options.reason ? note : true;
    },
    request: async (path, payload) => {
      calls.push({ path, payload });
      if (path.endsWith('restore_exclusion'))
        return { restored: true, affected_recipes: 2 };
      return {
        user,
        stats: {},
        items: payload.p_section === 'exclusions' ? [row] : [],
        total: payload.p_section === 'exclusions' ? 1 : 0,
      };
    },
  });
  await h.find('View account details & activity').click();
  await h.find('Hidden recipes').click();
  assert.ok(
    h.find('<img onerror=bad>'),
    'untrusted title remains a text argument',
  );
  await h.find('Restore contributor & their recipes').click();
  assert.equal(
    calls.filter(call => call.path.endsWith('restore_exclusion')).length,
    0,
  );
  note = 'User requested restoration';
  await h.find('Restore contributor & their recipes').click();
  const mutations = calls.filter(call =>
    call.path.endsWith('restore_exclusion'),
  );
  assert.equal(mutations.length, 1);
  assert.deepEqual(mutations[0].payload, {
    p_user: 'reporter',
    p_email: user.email,
    p_scope: 'contributor',
    p_product: null,
    p_recipe: null,
    p_contributor: 'author',
    p_note: note,
  });
  assert.equal(dialogs[0].reasonMaxLength, 1000);
  assert.match(
    dialogs.at(-1).message,
    /Reports and global publication are unchanged/,
  );
});
