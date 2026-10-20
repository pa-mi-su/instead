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
