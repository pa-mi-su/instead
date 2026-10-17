import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
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
