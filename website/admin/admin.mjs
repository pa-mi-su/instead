import { config } from './config.mjs';
import { ADMIN_IDLE_MS, isIdle, hasRecentMfa } from './auth-security.mjs';
const $ = id => document.getElementById(id);
const base = config.url.replace(/\/$/, '');
let session = null;
let view = 'recipe';
let offset = 0;
let epoch = 0;
let authEpoch = 0;
let refreshPromise = null;
let cooldown = null;
let busy = false;
let mfaFactor = null;
let unfinishedFactor = null;
let idleTimer = null;
const storageKey = 'instead:admin-session';
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function clearSession() {
  epoch += 1;
  authEpoch += 1;
  session = null;
  sessionStorage.removeItem(storageKey);
  $('items').replaceChildren();
  $('counts').replaceChildren();
  $('workspace').hidden = true;
  $('login').hidden = false;
  $('signout').hidden = true;
  $('mfa').hidden = true;
  $('mfa-setup').hidden = true;
  $('mfa-form').hidden = true;
  $('mfa-qr').removeAttribute('src');
  $('mfa-secret').value = '';
  $('mfa-code').value = '';
  mfaFactor = null;
  unfinishedFactor = null;
  clearTimeout(idleTimer);
}
function saveSession(data) {
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    last_activity: session?.last_activity ?? Date.now(),
  };
  sessionStorage.setItem(storageKey, JSON.stringify(session));
  armIdleTimer();
}
async function request(route, body, bearer, method = 'POST') {
  const response = await fetch(base + route, {
    method,
    cache: 'no-store',
    headers: {
      apikey: config.key,
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message =
      data.msg ||
      data.message ||
      data.error_description ||
      'Request failed. Please try again.';
    if (
      bearer === session?.access_token &&
      [401, 403].includes(response.status)
    )
      clearSession();
    throw new Error(message);
  }
  return data;
}
async function token() {
  if (!session?.access_token) throw new Error('Sign in to continue.');
  if (isIdle(session)) {
    await signOutAdmin(
      'Signed out after 15 minutes without activity. Sign in again.',
    );
    throw new Error('Your admin session timed out. Sign in again.');
  }
  if (Date.now() > session.expires_at - 60000) {
    if (!refreshPromise) {
      const generation = authEpoch;
      const refresh = session.refresh_token;
      refreshPromise = (async () => {
        try {
          const data = await request(
            '/auth/v1/token?grant_type=refresh_token',
            { refresh_token: refresh },
          );
          if (generation !== authEpoch)
            throw new Error('Session changed. Sign in again.');
          saveSession(data);
        } catch (error) {
          if (generation === authEpoch) clearSession();
          throw error;
        } finally {
          refreshPromise = null;
        }
      })();
    }
    await refreshPromise;
  }
  return session.access_token;
}
async function rpc(action, payload = {}) {
  return request(
    '/rest/v1/rpc/community_admin',
    { p_action: action, p_payload: payload },
    await token(),
  );
}
function armIdleTimer() {
  clearTimeout(idleTimer);
  if (!session) return;
  idleTimer = setTimeout(
    () =>
      signOutAdmin(
        'Signed out after 15 minutes without activity. Sign in again.',
      ),
    Math.max(0, ADMIN_IDLE_MS - (Date.now() - session.last_activity)),
  );
}
function recordActivity(event) {
  if (!session || !event.isTrusted) return;
  if (isIdle(session)) {
    signOutAdmin('Your admin session timed out. Sign in again.');
    return;
  }
  if (Date.now() - session.last_activity < 10000) return;
  session.last_activity = Date.now();
  sessionStorage.setItem(storageKey, JSON.stringify(session));
  armIdleTimer();
}
async function signOutAdmin(message = 'Signed out.') {
  const access = session?.access_token;
  clearSession();
  status(message);
  if (access) {
    try {
      await request('/auth/v1/logout?scope=local', {}, access);
    } catch {
      /* Local session and private data are already cleared. */
    }
  }
}
async function beginAdmin() {
  const generation = epoch;
  const access = await token();
  await request('/rest/v1/rpc/community_admin_mfa_state', {}, access);
  const user = await request('/auth/v1/user', {}, access, 'GET');
  if (generation !== epoch) return;
  const factors = user.factors || [];
  const verified = factors.find(
    factor => factor.factor_type === 'totp' && factor.status === 'verified',
  );
  if (verified && hasRecentMfa(session.access_token)) {
    await load();
    return;
  }
  $('login').hidden = true;
  $('workspace').hidden = true;
  $('mfa').hidden = false;
  $('signout').hidden = false;
  mfaFactor = verified?.id ?? null;
  unfinishedFactor =
    factors.find(
      factor =>
        factor.factor_type === 'totp' &&
        factor.status === 'unverified' &&
        factor.friendly_name === 'INSTEAD Admin',
    )?.id ?? null;
  $('mfa-start').hidden = !!verified;
  $('mfa-form').hidden = !verified;
  $('mfa-title').textContent = verified
    ? 'Enter your authenticator code'
    : 'Set up your authenticator';
  $('mfa-instructions').textContent = verified
    ? 'Open your authenticator and enter the current six-digit code for INSTEAD Admin.'
    : 'Choose Set up authenticator, scan the QR code in your authenticator app, then enter its six-digit code. You must complete this yourself; no one else needs your QR, setup key, or codes.';
  $('mfa-start').textContent = unfinishedFactor
    ? 'Replace unfinished authenticator setup'
    : 'Set up authenticator';
  status(
    'Email verified. Authenticator verification is required before any admin data is available.',
  );
  if (verified) $('mfa-code').focus();
}
$('mfa-start').addEventListener('click', async () => {
  const control = $('mfa-start');
  control.disabled = true;
  const generation = epoch;
  try {
    const access = await token();
    if (unfinishedFactor)
      await request(
        '/auth/v1/factors/' + encodeURIComponent(unfinishedFactor),
        {},
        access,
        'DELETE',
      );
    const factor = await request(
      '/auth/v1/factors',
      {
        factor_type: 'totp',
        friendly_name: 'INSTEAD Admin',
        issuer: 'INSTEAD',
      },
      access,
    );
    if (generation !== epoch) return;
    if (factor.type !== 'totp' || !factor.totp?.qr_code || !factor.totp?.secret)
      throw new Error('Authenticator setup was unavailable. Please try again.');
    mfaFactor = factor.id;
    unfinishedFactor = factor.id;
    $('mfa-qr').src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(factor.totp.qr_code);
    $('mfa-secret').value = factor.totp.secret;
    $('mfa-setup').hidden = false;
    $('mfa-form').hidden = false;
    control.hidden = true;
    $('mfa-code').focus();
    status(
      'Scan the setup QR privately, then enter the current six-digit code.',
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    control.disabled = false;
  }
});
$('mfa-form').addEventListener('submit', async event => {
  event.preventDefault();
  const control = event.submitter;
  control.disabled = true;
  const generation = epoch;
  try {
    if (!mfaFactor) throw new Error('Set up your authenticator first.');
    const access = await token();
    const path = '/auth/v1/factors/' + encodeURIComponent(mfaFactor);
    const challenge = await request(path + '/challenge', {}, access);
    const verified = await request(
      path + '/verify',
      { challenge_id: challenge.id, code: $('mfa-code').value.trim() },
      access,
    );
    if (generation !== epoch) return;
    saveSession(verified);
    session.last_activity = Date.now();
    sessionStorage.setItem(storageKey, JSON.stringify(session));
    armIdleTimer();
    $('mfa-code').value = '';
    $('mfa-secret').value = '';
    $('mfa-qr').removeAttribute('src');
    $('mfa-setup').hidden = true;
    $('mfa').hidden = true;
    await load();
  } catch (error) {
    status(error.message, true);
  } finally {
    control.disabled = false;
  }
});
for (const event of ['pointerdown', 'pointermove', 'keydown', 'touchstart'])
  document.addEventListener(event, recordActivity, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (session && isIdle(session))
    signOutAdmin('Your admin session timed out. Sign in again.');
});
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function button(label, callback, danger = false) {
  const el = element('button', label, danger ? 'danger' : '');
  el.type = 'button';
  el.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    el.disabled = true;
    try {
      await callback();
    } catch (error) {
      status(error.message, true);
    } finally {
      busy = false;
      el.disabled = false;
    }
  });
  return el;
}
function field(parent, label, multiline = false) {
  const id = `field-${crypto.randomUUID()}`;
  const text = element('label', label);
  text.htmlFor = id;
  const input = element(multiline ? 'textarea' : 'input');
  input.id = id;
  input.maxLength = label.startsWith('Evidence') ? 4000 : 2000;
  parent.append(text, input);
  return input;
}
function details(parent, title, value) {
  if (!value) return;
  parent.append(element('h3', title), element('p', value, 'text'));
}
async function mutate(action, payload, note) {
  const generation = epoch;
  await rpc(action, { ...payload, note });
  if (generation !== epoch) return;
  status('Saved. The queue reflects the current server state.');
  await load();
}
function restrictButton(user, suspended, reason) {
  return button(
    suspended ? 'Restore account access' : 'Restrict account',
    async () => {
      if (!reason.value.trim()) throw new Error('Enter a reason first.');
      const message = suspended
        ? 'Restore this account’s ability to contribute?'
        : 'Restrict this account? Its contributions will be hidden and new contributions blocked. Email verification alone will not remove the restriction.';
      if (window.confirm(message))
        await mutate(
          'restrict',
          { user_id: user, suspended: !suspended },
          reason.value,
        );
    },
    !suspended,
  );
}
function renderContent(item) {
  const card = element('article', undefined, 'card');
  card.append(
    element('h2', view === 'recipe' ? item.title : 'Community comment'),
  );
  card.append(
    element(
      'p',
      `${item.product_id} · ${item.status}${
        item.admin_removed_at ? ' · In Trash' : ''
      } · ${new Date(item.created_at).toLocaleString()}`,
      'meta',
    ),
  );
  card.append(
    element(
      'p',
      `Account ${item.user_id}${item.suspended ? ' · RESTRICTED' : ''}${
        item.deletion_requested_at ? ' · DELETION REQUESTED' : ''
      }`,
      'meta',
    ),
  );
  if (view === 'recipe') {
    for (const [label, key] of [
      ['Ingredients', 'ingredients'],
      ['Instructions', 'instructions'],
      ['Storage', 'storage_notes'],
      ['Cautions', 'cautions'],
      ['Credit / source', 'source'],
    ])
      details(card, label, item[key]);
    if (item.photo_paths?.length) {
      const photos = element('div', undefined, 'photos');
      const loadPhotos = button(
        `Load ${item.photo_paths.length} private photo(s)`,
        async () => {
          const generation = epoch;
          const accessToken = await token();
          const loaded = [];
          for (const path of item.photo_paths) {
            const result = await request(
              '/storage/v1/object/sign/recipe-photos/' +
                path.split('/').map(encodeURIComponent).join('/'),
              { expiresIn: 300 },
              accessToken,
            );
            const signedPath = result.signedURL || result.signedUrl;
            if (
              typeof signedPath !== 'string' ||
              !signedPath.startsWith('/object/sign/recipe-photos/')
            )
              throw new Error('Unexpected photo URL.');
            const image = element('img');
            image.alt = 'Submitted recipe photo';
            image.referrerPolicy = 'no-referrer';
            image.addEventListener('error', () =>
              status(
                'A submitted photo could not load. Keep pending or ask the owner to resubmit.',
                true,
              ),
            );
            image.src = base + '/storage/v1' + signedPath;
            loaded.push(image);
          }
          if (generation === epoch) photos.replaceChildren(...loaded);
        },
      );
      card.append(loadPhotos, photos);
    }
  } else {
    details(card, 'Recipe', item.recipe_title || 'Earlier product discussion');
    details(card, 'Comment', item.body);
  }
  if (item.reports?.length) {
    const reports = element('div', undefined, 'reports');
    reports.append(
      element(
        'strong',
        `${item.open_reports} open report(s); ${item.reports.reduce(
          (sum, report) => sum + report.count,
          0,
        )} total`,
      ),
    );
    for (const report of item.reports)
      reports.append(
        element(
          'p',
          `${report.reason}: ${report.count} report(s) · latest ${new Date(
            report.created_at,
          ).toLocaleString()}`,
        ),
      );
    card.append(reports);
  }
  const review = element('div', undefined, 'review');
  const reason = field(review, 'Review reason / action note', true);
  const qualifications = field(
    review,
    'Reviewer qualifications (required for health / personal care)',
  );
  const sources = field(
    review,
    'Evidence sources (required for health / personal care)',
    true,
  );
  const check = element('label', undefined, 'check');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  check.append(
    checkbox,
    document.createTextNode(
      ' I reviewed the full text and every submitted photo.',
    ),
  );
  review.append(check);
  const actions = element('div', undefined, 'actions');
  const target = { kind: view, id: item.id };
  if (item.admin_removed_at)
    actions.append(
      button('Restore to pending review', () =>
        mutate('restore', target, reason.value),
      ),
    );
  else {
    if (item.status !== 'withdrawn') {
      actions.append(
        button('Approve', () =>
          mutate(
            'moderate',
            {
              ...target,
              decision: 'approved',
              reviewed: checkbox.checked,
              qualifications: qualifications.value,
              sources: sources.value,
            },
            reason.value,
          ),
        ),
      );
      actions.append(
        button(
          'Reject / unpublish',
          () =>
            mutate(
              'moderate',
              {
                ...target,
                decision: 'rejected',
                qualifications: qualifications.value,
                sources: sources.value,
              },
              reason.value,
            ),
          true,
        ),
      );
    }
    if (item.status !== 'withdrawn') {
      actions.append(
        button(
          'Remove to Trash',
          async () => {
            if (
              window.confirm(
                'Remove this content from public view? It remains in admin Trash and can be restored. Removal does not permanently delete files. Existing signed photo links may take up to five minutes to expire.',
              )
            )
              await mutate('remove', target, reason.value);
          },
          true,
        ),
      );
    }
  }
  if (item.open_reports > 0)
    actions.append(
      button('Mark reports reviewed', () =>
        mutate(
          'resolve_reports',
          {
            ...target,
            report_cutoff: item.reports.reduce(
              (latest, report) =>
                report.created_at > latest ? report.created_at : latest,
              '',
            ),
          },
          reason.value,
        ),
      ),
    );
  actions.append(restrictButton(item.user_id, item.suspended, reason));
  review.append(actions);
  card.append(review);
  return card;
}
async function load() {
  const generation = ++epoch;
  status('Loading admin data…');
  const summary = await rpc('state');
  const data = await rpc(
    ['recipe', 'comment'].includes(view) ? 'queue' : view,
    {
      kind: view,
      filter: $('filter').value,
      search: $('search').value,
      offset,
    },
  );
  if (generation !== epoch) return;
  $('mfa').hidden = true;
  $('login').hidden = true;
  $('workspace').hidden = false;
  $('signout').hidden = false;
  $('counts').replaceChildren();
  for (const [label, key] of [
    ['Pending recipes', 'pending_recipes'],
    ['Pending comments', 'pending_comments'],
    ['Restricted accounts', 'restricted_accounts'],
    ['Deletion requests', 'deletion_requests'],
  ]) {
    const count = element('div', undefined, 'count');
    count.append(
      element('strong', summary[key]),
      document.createTextNode(label),
    );
    $('counts').append(count);
  }
  const isContent = ['recipe', 'comment'].includes(view);
  $('filters').hidden = !isContent;
  $('pagination').hidden = false;
  $('items').replaceChildren();
  for (const item of data.items) {
    if (isContent) $('items').append(renderContent(item));
    else if (view === 'accounts') {
      const card = element('article', undefined, 'card');
      card.append(
        element(
          'h2',
          item.suspended ? 'Restricted account' : 'Deletion request',
        ),
      );
      card.append(element('p', `Account ${item.user_id}`, 'meta'));
      details(
        card,
        'Contributions',
        `${item.recipes} recipe(s), ${item.comments} comment(s)`,
      );
      if (item.deletion_requested_at)
        details(
          card,
          'Pending deletion',
          `${new Date(
            item.deletion_requested_at,
          ).toLocaleString()}. Investigate failed photo cleanup in Supabase; restoring contribution access does not cancel this request. Account deletion must verify the requesting owner.`,
        );
      const reason = field(card, 'Reason for restoring account access', true);
      if (item.suspended)
        card.append(restrictButton(item.user_id, true, reason));
      $('items').append(card);
    } else {
      const card = element('article', undefined, 'card');
      card.append(element('h2', `${item.action} · ${item.kind}`));
      card.append(
        element(
          'p',
          `${new Date(item.created_at).toLocaleString()} · ${
            item.content_id || item.subject_user || 'Deleted account'
          }`,
          'meta',
        ),
      );
      details(card, 'Reason', item.note);
      $('items').append(card);
    }
  }
  if (!data.items.length)
    $('items').append(element('p', 'No items in this queue.'));
  $('previous').disabled = offset === 0;
  $('next').disabled = data.items.length < 20;
  status(
    `Signed in as ${summary.reviewer}. ${
      isContent
        ? `Showing ${data.items.length} item(s), starting at ${offset + 1}.`
        : `${data.items.length} record(s).`
    }`,
  );
}
$('email-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('send').disabled = true;
  try {
    await request('/auth/v1/otp', {
      email: $('email').value.trim(),
      create_user: false,
    });
    $('code-form').hidden = false;
    $('code').focus();
    status('If this is an existing account, a sign-in code has been sent.');
    let remaining = 60;
    $('send').textContent = `Resend in ${remaining}s`;
    clearInterval(cooldown);
    cooldown = setInterval(() => {
      remaining -= 1;
      $('send').textContent = remaining
        ? `Resend in ${remaining}s`
        : 'Resend sign-in code';
      if (!remaining) {
        clearInterval(cooldown);
        $('send').disabled = false;
      }
    }, 1000);
  } catch (error) {
    status(error.message, true);
    $('send').disabled = false;
  }
});
$('code-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const data = await request('/auth/v1/verify', {
      email: $('email').value.trim(),
      token: $('code').value.trim(),
      type: 'email',
    });
    saveSession(data);
    $('code').value = '';
    await beginAdmin();
  } catch (error) {
    clearSession();
    status(error.message, true);
  } finally {
    submit.disabled = false;
  }
});
$('signout').addEventListener('click', () => signOutAdmin());
for (const navButton of document.querySelectorAll('[data-view]'))
  navButton.addEventListener('click', () => {
    view = navButton.dataset.view;
    offset = 0;
    for (const other of document.querySelectorAll('[data-view]'))
      other.setAttribute('aria-pressed', String(other === navButton));
    load().catch(error => status(error.message, true));
  });
$('filters').addEventListener('submit', event => {
  event.preventDefault();
  offset = 0;
  load().catch(error => status(error.message, true));
});
$('previous').addEventListener('click', () => {
  offset = Math.max(0, offset - 20);
  load().catch(error => status(error.message, true));
});
$('next').addEventListener('click', () => {
  offset += 20;
  load().catch(error => status(error.message, true));
});
if (!base || !config.key) {
  $('send').disabled = true;
  status('Admin sign-in is not configured on this deployment.', true);
}
try {
  session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  if (session) {
    armIdleTimer();
    beginAdmin().catch(error => {
      clearSession();
      status(error.message, true);
    });
  }
} catch {
  clearSession();
}
