import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyPlatformChanges } from './detect-platform-changes.mjs';

test('web and admin changes do not select native builds', () => {
  assert.deepEqual(
    classifyPlatformChanges([
      'website/admin/admin.mjs',
      'website/admin/index.html',
      'web/src/app/page.tsx',
      'scripts/build-policy-site.mjs',
      'src/policies.ts',
      'docs/admin-panel.md',
    ]),
    { android: false, ios: false },
  );
});

test('platform-specific project changes select only that platform', () => {
  assert.deepEqual(classifyPlatformChanges(['android/app/build.gradle']), {
    android: true,
    ios: false,
  });
  assert.deepEqual(classifyPlatformChanges(['ios/Instead/AppDelegate.swift']), {
    android: false,
    ios: true,
  });
  assert.deepEqual(
    classifyPlatformChanges(['scripts/upload-google-play.mjs']),
    { android: true, ios: false },
  );
});

test('shared app code, assets, and dependencies select both platforms', () => {
  for (const file of [
    'src/screens/HomeScreen.tsx',
    'src/catalog.ts',
    'assets/logo.png',
    'package.json',
    'patches/react-native+0.86.2.patch',
  ]) {
    assert.deepEqual(classifyPlatformChanges([file]), {
      android: true,
      ios: true,
    });
  }
});

test('docs and workflow-only changes do not select native builds', () => {
  assert.deepEqual(
    classifyPlatformChanges([
      'README.md',
      '.github/workflows/ci.yml',
      '.github/workflows/mobile-release.yml',
      'supabase/builtin-recipe-admin.sql',
    ]),
    { android: false, ios: false },
  );
});

test('web deploy still runs when native build jobs are skipped', async () => {
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  const deployJob = workflow.match(
    /  deploy-website:[\s\S]*?(?=\n  [a-z][\w-]*:|$)/,
  )?.[0];

  assert.ok(deployJob, 'website deploy job exists');
  assert.match(deployJob, /if:\s*>-\s+always\(\)/);
  assert.match(deployJob, /github\.event_name == 'push'/);
  assert.match(deployJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(deployJob, /needs\.required\.result == 'success'/);
});

test('manual mobile releases are limited to main before production credentials load', async () => {
  const workflow = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  const changesJob = workflow.match(
    /^  changes:[\s\S]*?(?=^  (?! )[a-z][\w-]*:|(?![\s\S]))/m,
  )?.[0];
  assert.ok(changesJob, 'mobile change-detection job exists');
  assert.match(changesJob, /github\.event_name == 'workflow_dispatch'/);
  assert.match(changesJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(
    changesJob,
    /github\.event\.workflow_run\.head_branch == 'main'/,
  );
  for (const jobName of ['android', 'ios']) {
    const job = workflow.match(
      new RegExp(
        `^  ${jobName}:[\\s\\S]*?(?=^  (?! )[a-z][\\w-]*:|(?![\\s\\S]))`,
        'm',
      ),
    )?.[0];
    assert.ok(job, `${jobName} release job exists`);
    assert.match(job, /needs: changes/);
    assert.match(job, /environment: production/);
  }
});

test('automatic mobile releases check published history instead of the previous commit', async () => {
  const workflow = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github.token \}\}/);
  assert.match(workflow, /node scripts\/detect-mobile-release-changes\.mjs/);
  assert.doesNotMatch(workflow, /HEAD_SHA\}\^1/);
});
