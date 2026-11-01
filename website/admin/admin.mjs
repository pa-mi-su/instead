import {
  dialog,
  confirmAction,
  requestReason,
  markRequired,
  closeNotice,
} from './dialogs.mjs';
import { config } from './config.mjs';
import {
  ADMIN_IDLE_MS,
  isIdle,
  hasRecentMfa,
  EmailChallenge,
  resetLoginForm,
} from './auth-security.mjs';
const $ = id => document.getElementById(id);
const base = config.url.replace(/\/$/, '');
let session = null;
let view = 'recipe';
let offset = 0;
let epoch = 0;
let authEpoch = 0;
let refreshPromise = null;
let cooldown = null;
let codeTimer = null;
let signoutPending = null;
const emailChallenge = new EmailChallenge();
let busy = false;
let mfaFactor = null;
let unfinishedFactor = null;
let idleTimer = null;
let builtinSeeds = null;
let builtinItems = [];
let builtinEditingId = null;
let builtinSearch = '';
const storageKey = 'instead:admin-session';
function status(message, error = false) {
  if (signoutPending) return;
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  // Routine queue loads stay in the live region; action results are modal.
  if (
    !message ||
    message === 'Deleting account and uploaded files…' ||
    message === 'Loading admin data…' ||
    message.startsWith('Signed in as ')
  )
    return;
  $('status').textContent = '';
  dialog({
    title: error ? 'Action could not be completed' : 'INSTEAD admin',
    message,
  });
}
function clearSession() {
  closeNotice();
  epoch += 1;
  authEpoch += 1;
  session = null;
  clearInterval(cooldown);
  clearTimeout(codeTimer);
  emailChallenge.reset();
  resetLoginForm($);
  builtinItems = [];
  builtinEditingId = null;
  builtinSearch = '';
  $('status').textContent = '';
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
  let response;
  try {
    response = await fetch(base + route, {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
      headers: {
        apikey: config.key,
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    console.error('Admin request could not reach Supabase:', route, error);
    throw new Error(
      `Could not reach Supabase for ${route}. Check your connection and try again.`,
    );
  }
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
      await signOutAdmin(
        'Your admin session is no longer authorized. Sign in again.',
      );
    const issue = new Error(message);
    issue.status = response.status;
    throw issue;
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
          if (generation !== authEpoch) {
            request('/auth/v1/logout?scope=local', {}, data.access_token).catch(
              () => {},
            );
            throw new Error('Session changed. Sign in again.');
          }
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
async function builtinRpc(action, payload = {}) {
  return request(
    '/rest/v1/rpc/community_builtin_admin',
    { p_action: action, p_payload: payload },
    await token(),
  );
}
async function usersRpc(search, pageOffset) {
  return request(
    '/rest/v1/rpc/community_admin_users',
    {
      p_search: search,
      p_offset: pageOffset,
    },
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
  if (signoutPending) return signoutPending;
  const access = session?.access_token;
  clearSession();
  const generation = authEpoch;
  $('login').hidden = true;
  // Revoke remotely without making the acknowledgement wait for the network.
  if (access)
    request('/auth/v1/logout?scope=local', {}, access).catch(() => {});
  signoutPending = (async () => {
    await dialog({ title: 'Admin session ended', message });
    if (generation === authEpoch) {
      $('login').hidden = false;
      $('email').focus();
    }
  })();
  try {
    await signoutPending;
  } finally {
    signoutPending = null;
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
    if (generation === epoch) status(error.message, true);
  } finally {
    if (generation === epoch) control.disabled = false;
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
    if (generation !== epoch) {
      request('/auth/v1/logout?scope=local', {}, verified.access_token).catch(
        () => {},
      );
      return;
    }
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
    if (generation === epoch) status(error.message, true);
  } finally {
    if (generation === epoch) control.disabled = false;
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
  if (!label.includes('(optional)')) {
    input.required = true;
    markRequired(text, input);
  }
  input.maxLength = label.startsWith('Evidence') ? 4000 : 2000;
  parent.append(text, input);
  return input;
}
function details(parent, title, value) {
  if (!value) return;
  parent.append(element('h3', title), element('p', value, 'text'));
}
async function mutate(action, payload, note, options = {}) {
  if (!note?.trim() || note.trim().length < 3)
    throw new Error('Enter an action reason of at least 3 characters.');
  const descriptions = {
    moderate:
      payload.decision === 'approved'
        ? 'Publish this recipe to all app users?'
        : 'Reject this recipe and move it to Trash?',
    restore: 'Restore this content to the pending review queue?',
    resolve_reports: 'Mark the displayed reports as reviewed?',
  };
  if (descriptions[action] && !(await confirmAction(descriptions[action])))
    return;
  const generation = epoch;
  await rpc(action, { ...payload, note });
  if (generation !== epoch) return;
  options.afterSuccess?.();
  try {
    await load();
  } catch (error) {
    if (!options.successMessage) throw error;
    status(
      `${options.successMessage} The admin list could not refresh: ${error.message}`,
      true,
    );
    return;
  }
  status(options.successMessage || 'Action completed successfully.');
}
function restrictButton(user, suspended, reason) {
  return button(
    suspended ? 'Restore account access' : 'Restrict account',
    async () => {
      if (!reason.value.trim()) throw new Error('Enter a reason first.');
      const message = suspended
        ? 'Restore this account’s ability to contribute?'
        : 'Restrict this account in INSTEAD? Its contributions will be hidden and new submissions and votes blocked. This does not disable email sign-in.';
      if (await confirmAction(message))
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
  card.append(element('h2', item.title));
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
  const check = element('label', undefined, 'check');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.setAttribute(
    'aria-label',
    'Full content review confirmation (required for approval)',
  );
  const reviewStar = element('span', ' *', 'required-mark');
  reviewStar.setAttribute('aria-hidden', 'true');
  check.append(reviewStar);
  check.append(
    checkbox,
    document.createTextNode(
      ' I reviewed the full text and every submitted photo. (Required for approval)',
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
        button('Approve', async () => {
          if (!checkbox.checked)
            throw new Error(
              'Confirm that you reviewed the full recipe and every photo.',
            );
          if (reason.value.trim().length < 3)
            throw new Error('Enter a review reason before approving.');
          await mutate(
            'moderate',
            {
              ...target,
              decision: 'approved',
              reviewed: checkbox.checked,
            },
            reason.value,
            {
              afterSuccess: () => {
                $('filter').value = 'approved';
                offset = 0;
              },
              successMessage: 'Recipe approved. It is now in Approved history.',
            },
          );
        }),
      );
      actions.append(
        button(
          'Reject and move to Trash',
          () =>
            mutate(
              'moderate',
              {
                ...target,
                decision: 'rejected',
              },
              reason.value,
              {
                afterSuccess: () => {
                  $('filter').value = 'trash';
                  offset = 0;
                },
                successMessage: 'Rejected and moved to Trash.',
              },
            ),
          true,
        ),
      );
    }
    if (item.status === 'approved') {
      actions.append(
        button(
          'Remove to Trash',
          async () => {
            if (
              await confirmAction(
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
function renderUser(item) {
  const card = element('article', undefined, 'card user-card');
  card.append(element('h2', item.email || 'Verified account'));
  card.append(
    element(
      'p',
      `${item.username ? `@${item.username} · ` : ''}${
        item.suspended ? 'RESTRICTED' : 'Active'
      }`,
      'meta',
    ),
  );
  card.append(
    element(
      'p',
      item.is_admin === true
        ? 'Role: Admin — this user has administrator access.'
        : item.is_admin === false
        ? 'Role: User — no administrator access.'
        : 'Role unavailable — apply the admin membership database update.',
      'notice',
    ),
  );
  card.append(element('p', `Account ${item.user_id}`, 'meta'));
  card.append(
    element(
      'p',
      `Joined ${
        item.created_at
          ? new Date(item.created_at).toLocaleString()
          : 'date unavailable'
      } · Last sign-in ${
        item.last_sign_in_at
          ? new Date(item.last_sign_in_at).toLocaleString()
          : 'not recorded'
      }`,
      'meta',
    ),
  );
  details(card, 'Submitted community recipes', `${item.recipes} recipe(s)`);
  if (item.is_admin === true || item.has_admin_membership) {
    card.append(
      element(
        'p',
        item.is_admin
          ? 'Admin accounts are protected from restriction and deletion.'
          : 'Admin access is disabled. This account remains protected from deletion.',
        'meta',
      ),
    );
    return card;
  }
  const reason = field(
    card,
    'Reason for account action (at least 3 characters)',
    true,
  );
  if (item.is_admin === false && !item.suspended) {
    const adminSetup = element('details', undefined, 'admin-role-setup');
    adminSetup.append(element('summary', 'Grant administrator access'));
    adminSetup.append(
      element(
        'p',
        'This account is currently a regular user. Complete this section only to grant administrator access. The name below will identify the new administrator in the admin panel.',
        'meta',
      ),
    );
    const adminLabel = field(
      adminSetup,
      'New administrator display name (3–100 characters)',
    );
    adminLabel.maxLength = 100;
    adminLabel.value = (item.username || item.email || '').slice(0, 100);
    adminSetup.append(
      button('Add admin', async () => {
        if (reason.value.trim().length < 3)
          throw new Error('Enter a reason of at least 3 characters.');
        if (adminLabel.value.trim().length < 3)
          throw new Error(
            'Enter an admin display name of at least 3 characters.',
          );
        if (
          !(await confirmAction(
            `Give ${item.email} administrator access? They will be able to manage users and content and add other admins. Authenticator verification is required to open the panel.`,
          ))
        )
          return;
        const generation = epoch;
        await request(
          '/rest/v1/rpc/community_admin_add',
          {
            p_user: item.user_id,
            p_email: item.email,
            p_label: adminLabel.value.trim(),
            p_note: reason.value.trim(),
          },
          await token(),
        );
        if (generation !== epoch) return;
        await load();
        status(
          `Admin access added for ${item.email}. They must sign in and verify an authenticator to use the admin panel.`,
        );
      }),
    );
    card.append(adminSetup);
  }
  if (item.is_admin === true || item.has_admin_membership) return card;
  card.append(restrictButton(item.user_id, item.suspended, reason));
  const confirmation = field(
    card,
    'Type this account email to permanently delete it',
  );
  confirmation.autocomplete = 'off';
  card.append(
    element(
      'p',
      'Permanent deletion removes the login, profile, recipes, comments, votes, cloud saves, avatar, and uploaded photos. Identifying audit details are cleaned up when deletion completes. An anonymous completion receipt and provider backups may remain; copies on other devices cannot be erased.',
      'meta',
    ),
  );
  card.append(
    button(
      'Permanently delete user',
      async () => {
        if (reason.value.trim().length < 3)
          throw new Error('Enter a deletion reason of at least 3 characters.');
        if (
          !item.email ||
          confirmation.value.trim().toLowerCase() !== item.email.toLowerCase()
        )
          throw new Error(
            'Type the account email exactly to confirm deletion.',
          );
        if (
          !(await confirmAction(
            `Permanently delete ${item.email} and their account data? This cannot be undone.`,
          ))
        )
          return;
        const generation = epoch;
        status('Deleting account and uploaded files…');
        const access = await token();
        const capability = await request(
          '/functions/v1/delete-account?action=capabilities',
          undefined,
          access,
          'GET',
        ).catch(error => {
          if ([404, 405].includes(error.status))
            throw new Error(
              'Admin deletion needs a backend update. Deploy the current delete-account function before retrying. No account was deleted.',
            );
          throw error;
        });
        if (capability.adminDeletionVersion !== 1)
          throw new Error(
            'Admin deletion needs a backend update. Deploy the current delete-account function before retrying. No account was deleted.',
          );
        await request(
          '/functions/v1/delete-account',
          {
            action: 'admin-delete',
            user_id: item.user_id,
            email: confirmation.value.trim(),
            reason: reason.value.trim(),
          },
          await token(),
        );
        if (generation !== epoch) return;
        // Remove the deleted account even if refreshing the list fails.
        card.remove();
        try {
          await load();
          status('Account permanently deleted.');
        } catch (error) {
          status(
            `Account permanently deleted. Could not refresh the user list: ${error.message}`,
            true,
          );
        }
      },
      true,
    ),
  );
  return card;
}
async function loadBuiltinSeeds() {
  if (builtinSeeds) return builtinSeeds;
  let response;
  try {
    response = await fetch('/admin/builtin-recipes.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error('Built-in recipe inventory request failed:', error);
    throw new Error(
      'Could not load the built-in recipe catalog. Check your connection and try again.',
    );
  }
  if (!response.ok)
    throw new Error('Built-in recipe inventory is unavailable.');
  const data = await response.json();
  if (!Array.isArray(data))
    throw new Error('Built-in recipe inventory is invalid.');
  builtinSeeds = data;
  return builtinSeeds;
}
function renderBuiltinEditor(item, products) {
  const editor = element('div', undefined, 'builtin-editor');
  const title = field(editor, 'Recipe name');
  title.maxLength = 120;
  title.value = item.recipe?.name ?? item.title ?? '';
  let productId = item.product_id ?? products[0]?.id ?? '';
  if (item.isNew) {
    const productLabel = element('label', 'App topic');
    const productSelect = element('select');
    for (const product of products) {
      const option = element('option', `${product.title} · ${product.id}`);
      option.value = product.id;
      productSelect.append(option);
    }
    productSelect.required = true;
    markRequired(productLabel, productSelect);
    productSelect.value = productId;
    productSelect.addEventListener('change', () => {
      productId = productSelect.value;
    });
    editor.prepend(productSelect);
    editor.prepend(productLabel);
    productLabel.htmlFor = productSelect.id = `product-${crypto.randomUUID()}`;
  } else {
    editor.append(
      element('p', `${item.product_title} · ${item.product_id}`, 'meta'),
    );
  }
  const listField = (label, values, maximum) => {
    const input = field(editor, label, true);
    input.maxLength = maximum;
    input.value = (values ?? []).join('\n');
    input.placeholder = 'Enter one item per line';
    return input;
  };
  const ingredients = listField(
    'Ingredients and quantities · one per line',
    item.recipe?.ingredients,
    12000,
  );
  const equipment = listField(
    'Equipment · one per line (optional)',
    item.recipe?.equipment,
    6000,
  );
  const instructions = listField(
    'Instructions · one step per line',
    item.recipe?.instructions,
    16000,
  );
  const storage = field(editor, 'Storage and shelf life', true);
  storage.maxLength = 4000;
  storage.value = item.recipe?.storage ?? '';
  const cautions = field(editor, 'Cautions', true);
  cautions.maxLength = 4000;
  cautions.value = item.recipe?.cautions ?? '';
  const reason = field(
    editor,
    'Reason for creating or editing this recipe',
    true,
  );
  reason.maxLength = 2000;
  const actions = element('div', undefined, 'actions');
  actions.append(
    button('Save and publish in app', async () => {
      const recipe = {
        name: title.value.trim(),
        ingredients: ingredients.value
          .split('\n')
          .map(value => value.trim())
          .filter(Boolean),
        equipment: equipment.value
          .split('\n')
          .map(value => value.trim())
          .filter(Boolean),
        instructions: instructions.value
          .split('\n')
          .map(value => value.trim())
          .filter(Boolean),
        storage: storage.value.trim(),
        cautions: cautions.value.trim(),
      };
      if (
        !recipe.name ||
        !recipe.ingredients.length ||
        !recipe.instructions.length
      )
        throw new Error(
          'Add a name, ingredients, and at least one instruction.',
        );
      if (recipe.storage.length < 3 || recipe.cautions.length < 3)
        throw new Error('Storage guidance and cautions are required.');
      if (reason.value.trim().length < 3)
        throw new Error('Enter a reason for this recipe change.');
      if (
        !(await confirmAction(
          'Publish these recipe changes to app users?',
          'Publish recipe',
        ))
      )
        return;
      const result = await builtinRpc('save', {
        id: item.id,
        product_id: productId,
        recipe,
        note: reason.value.trim(),
      });
      builtinEditingId = null;
      const successMessage =
        result.action === 'created'
          ? 'Built-in recipe created and published. It will appear in the app after its next catalog refresh.'
          : 'Built-in recipe saved and published. It will appear in the app after its next catalog refresh.';
      try {
        await load();
        status(successMessage);
      } catch (error) {
        status(
          `${successMessage} The list could not refresh: ${error.message}`,
          true,
        );
      }
    }),
  );
  actions.append(
    button('Cancel', () => {
      builtinEditingId = null;
      builtinItems = builtinItems.filter(row => !row.isNew);
      renderBuiltinItems();
    }),
  );
  editor.append(
    element(
      'p',
      'Saving publishes this built-in recipe to the app. Review the full wording, storage guidance, and cautions before saving.',
      'notice',
    ),
    actions,
  );
  return editor;
}
function renderBuiltinItems() {
  const container = $('items');
  container.replaceChildren();
  const filtered = builtinItems.filter(item =>
    `${item.title} ${item.product_title} ${item.product_id}`
      .toLowerCase()
      .includes(builtinSearch.trim().toLowerCase()),
  );
  if (!filtered.length) {
    container.append(element('p', 'No built-in recipes match this search.'));
    return;
  }
  const products = [
    ...new Map(
      builtinSeeds.map(item => [
        item.product_id,
        { id: item.product_id, title: item.product_title },
      ]),
    ).values(),
  ];
  for (const item of filtered) {
    const card = element('article', undefined, 'card');
    card.append(element('h2', item.title));
    card.append(
      element(
        'p',
        `${item.product_title} · ${item.product_id} · ${
          item.is_active ? 'Published' : 'Archived'
        }${item.admin_created ? ' · Admin-created' : ''}`,
        'meta',
      ),
    );
    if (item.recipe?.ingredients?.length)
      card.append(
        element(
          'p',
          `${item.recipe.ingredients.length} ingredients · ${item.recipe.instructions.length} steps`,
          'text',
        ),
      );
    const actions = element('div', undefined, 'actions');
    actions.append(
      button(
        item.id === builtinEditingId ? 'Close editor' : 'Edit recipe',
        () => {
          builtinEditingId = item.id === builtinEditingId ? null : item.id;
          renderBuiltinItems();
        },
      ),
    );
    if (!item.isNew)
      actions.append(
        button(
          item.is_active ? 'Archive from app' : 'Restore to app',
          async () => {
            if (
              item.is_active &&
              !(await confirmAction(
                'Archive this recipe from the app? It stays in the admin inventory and can be restored later.',
              ))
            )
              return;
            const note = await requestReason(
              item.is_active
                ? 'Reason for archiving this recipe:'
                : 'Reason for restoring this recipe:',
            );
            if (note === null) return;
            if (note.trim().length < 3)
              throw new Error('Enter a reason of at least 3 characters.');
            await builtinRpc('set_active', {
              id: item.id,
              active: !item.is_active,
              note: note.trim(),
            });
            const successMessage = item.is_active
              ? 'Recipe archived from the app.'
              : 'Recipe restored to the app.';
            try {
              await load();
              status(successMessage);
            } catch (error) {
              status(
                `${successMessage} The list could not refresh: ${error.message}`,
                true,
              );
            }
          },
          item.is_active,
        ),
      );
    card.append(actions);
    if (item.id === builtinEditingId)
      card.append(renderBuiltinEditor(item, products));
    container.append(card);
  }
}
function renderBuiltinTools() {
  const tools = $('builtin-tools');
  tools.replaceChildren();
  const search = element('input');
  search.type = 'search';
  search.maxLength = 100;
  search.placeholder = 'Search built-in recipes or topics';
  search.setAttribute('aria-label', 'Search built-in recipes or topics');
  search.value = builtinSearch;
  search.addEventListener('input', () => {
    builtinSearch = search.value;
    renderBuiltinItems();
  });
  tools.append(search);
  tools.append(
    button('Add a built-in recipe', () => {
      const firstProduct = builtinSeeds[0];
      builtinSearch = '';
      search.value = '';
      const id = `admin:${crypto.randomUUID()}`;
      builtinItems.unshift({
        id,
        product_id: firstProduct.product_id,
        product_title: firstProduct.product_title,
        title: 'New recipe',
        recipe: {
          name: '',
          ingredients: [],
          equipment: [],
          instructions: [],
          storage: '',
          cautions: '',
        },
        is_active: true,
        isNew: true,
        admin_created: true,
      });
      builtinEditingId = id;
      renderBuiltinItems();
    }),
  );
}
async function load() {
  const generation = ++epoch;
  status('Loading admin data…');
  const summary = await rpc('state');
  let data;
  if (view === 'builtin') {
    const seeds = await loadBuiltinSeeds();
    const managed = await builtinRpc('list');
    const rows = managed.items ?? [];
    const byId = new Map(rows.map(item => [item.id, item]));
    const seedIds = new Set(seeds.map(item => item.id));
    builtinItems = seeds.map(seed => {
      const row = byId.get(seed.id);
      const recipe = row?.recipe_content ?? seed.recipe;
      return {
        ...seed,
        ...(row ?? {}),
        recipe,
        title: recipe?.name ?? row?.title ?? seed.title,
        product_title: seed.product_title,
        is_active: row?.is_active ?? true,
        isNew: false,
      };
    });
    for (const row of rows) {
      if (seedIds.has(row.id) || !row.recipe_content) continue;
      const seed = seeds.find(item => item.product_id === row.product_id);
      builtinItems.push({
        ...row,
        recipe: row.recipe_content,
        title: row.recipe_content.name ?? row.title,
        product_title: seed?.product_title ?? row.product_id,
        isNew: false,
      });
    }
    data = { items: builtinItems };
  } else if (view === 'users') {
    data = await usersRpc($('user-search').value.trim(), offset);
  } else {
    data = await rpc(view === 'recipe' ? 'queue' : view, {
      kind: view,
      filter: $('filter').value,
      search: $('search').value,
      offset,
    });
  }
  if (generation !== epoch) return;
  $('mfa').hidden = true;
  $('login').hidden = true;
  $('workspace').hidden = false;
  $('signout').hidden = false;
  $('admin-identity').textContent = `Signed in as ${summary.reviewer} · Admin`;
  $('counts').replaceChildren();
  for (const [label, key] of [
    ['Pending recipes', 'pending_recipes'],
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
  const isContent = view === 'recipe';
  const isBuiltin = view === 'builtin';
  const isUsers = view === 'users';
  $('filters').hidden = !isContent;
  $('user-filters').hidden = !isUsers;
  $('builtin-tools').hidden = !isBuiltin;
  $('pagination').hidden = isBuiltin;
  $('items').replaceChildren();
  if (isBuiltin) {
    renderBuiltinTools();
    renderBuiltinItems();
  }
  for (const item of isBuiltin ? [] : data.items) {
    if (isContent) $('items').append(renderContent(item));
    else if (isUsers) $('items').append(renderUser(item));
    else if (view === 'accounts') {
      const card = element('article', undefined, 'card');
      card.append(
        element(
          'h2',
          item.suspended ? 'Restricted account' : 'Deletion request',
        ),
      );
      card.append(element('p', `Account ${item.user_id}`, 'meta'));
      details(card, 'Contributions', `${item.recipes} recipe(s)`);
      if (item.deletion_requested_at)
        details(
          card,
          'Pending deletion',
          `${new Date(
            item.deletion_requested_at,
          ).toLocaleString()}. Investigate failed photo cleanup in Supabase; restoring contribution access does not cancel this request. Retry permanent deletion from Users with the account email and a reason.`,
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
    isBuiltin
      ? `Signed in as ${summary.reviewer}. ${data.items.length} built-in recipe(s) loaded.`
      : `Signed in as ${summary.reviewer}. ${
          isContent
            ? `Showing ${data.items.length} item(s), starting at ${offset + 1}.`
            : `${data.items.length} record(s).`
        }`,
  );
}
$('email').addEventListener('input', () => {
  // A response for a previous address must never restore its challenge.
  authEpoch += 1;
  emailChallenge.reset();
  clearTimeout(codeTimer);
  clearInterval(cooldown);
  $('code-form').hidden = true;
  $('code').value = '';
  $('send').disabled = false;
  $('send').textContent = 'Send sign-in code';
});
$('email-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (signoutPending || $('send').disabled) return;
  const generation = ++authEpoch;
  const email = $('email').value.trim();
  const started = Date.now();
  emailChallenge.reset();
  clearTimeout(codeTimer);
  $('code-form').hidden = true;
  $('code').value = '';
  $('send').disabled = true;
  try {
    await request('/auth/v1/otp', { email, create_user: false });
    if (generation !== authEpoch) return;
    emailChallenge.start(email, started);
    if (!emailChallenge.current())
      throw new Error('The sign-in code has expired. Request a new code.');
    $('code-form').hidden = false;
    $('code').focus();
    codeTimer = setTimeout(() => {
      if (generation === authEpoch && !session)
        signOutAdmin(
          'Your email sign-in code expired after five minutes. Request a new code.',
        );
    }, emailChallenge.expiresAt - Date.now());
    status(
      'If this is an existing account, a sign-in code has been sent. It expires in five minutes.',
    );
    clearInterval(cooldown);
    const updateCooldown = () => {
      if (generation !== authEpoch) return;
      const remaining = Math.max(
        0,
        Math.ceil((started + 60000 - Date.now()) / 1000),
      );
      $('send').textContent = remaining
        ? `Resend in ${remaining}s`
        : 'Resend sign-in code';
      $('send').disabled = remaining > 0;
      if (!remaining) clearInterval(cooldown);
    };
    updateCooldown();
    cooldown = setInterval(updateCooldown, 1000);
  } catch (error) {
    if (generation !== authEpoch) return;
    status(error.message, true);
    $('send').disabled = false;
  }
});
$('code-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (signoutPending) return;
  const submit = event.submitter;
  if (submit.disabled) return;
  const challenge = emailChallenge.current();
  if (!challenge) {
    await signOutAdmin('Your email sign-in code expired. Request a new code.');
    return;
  }
  const generation = authEpoch;
  submit.disabled = true;
  try {
    const data = await request('/auth/v1/verify', {
      email: challenge.email,
      token: $('code').value.trim(),
      type: 'email',
    });
    if (generation !== authEpoch || !emailChallenge.current()) {
      if (data.access_token)
        request('/auth/v1/logout?scope=local', {}, data.access_token).catch(
          () => {},
        );
      return;
    }
    clearTimeout(codeTimer);
    clearInterval(cooldown);
    emailChallenge.reset();
    saveSession(data);
    $('code').value = '';
    $('code-form').hidden = true;
    $('login').hidden = true;
    await beginAdmin();
  } catch (error) {
    if (generation !== authEpoch) return;
    clearSession();
    status(error.message, true);
  } finally {
    if (generation === authEpoch) submit.disabled = false;
  }
});
$('signout').addEventListener('click', async () => {
  if (await confirmAction('Sign out of the admin panel?', 'Sign out'))
    await signOutAdmin();
});
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
$('user-filters').addEventListener('submit', event => {
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
    const generation = authEpoch;
    beginAdmin().catch(error => {
      if (generation !== authEpoch) return;
      clearSession();
      status(error.message, true);
    });
  }
} catch {
  clearSession();
}

for (const input of document.querySelectorAll('input[required]')) {
  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) markRequired(label, input);
}

document.addEventListener(
  'invalid',
  event => {
    if (event.target.closest('dialog')) return;
    event.preventDefault();
    const input = event.target;
    const label = document.querySelector(`label[for="${input.id}"]`);
    dialog({
      title: 'Check required fields',
      message: `${
        label?.textContent.replace(' *', '').trim() || 'This field'
      }: ${input.validationMessage}`,
    }).then(() => input.isConnected && input.focus());
  },
  true,
);
