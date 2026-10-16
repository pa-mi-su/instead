import fs from 'node:fs/promises';
const readiness = JSON.parse(
  await fs.readFile(
    new URL('../release/readiness.json', import.meta.url),
    'utf8',
  ),
);
const missing = [];
for (const field of [
  'operatorLegalName',
  'operatorJurisdiction',
  'moderationOwner',
])
  if (typeof readiness[field] !== 'string' || !readiness[field].trim())
    missing.push(field);
for (const field of [
  'legalReviewCompleted',
  'publicPoliciesVerified',
  'supportInboxVerified',
  'storeDeclarationsReviewed',
])
  if (readiness[field] !== true) missing.push(field);
if (missing.length) {
  console.error(
    `Mobile distribution is held until these release attestations are completed: ${missing.join(
      ', ',
    )}. See docs/release-safety.md.`,
  );
  process.exitCode = 1;
} else
  console.log(
    'Release attestations are complete. These records do not guarantee legal or medical compliance.',
  );
