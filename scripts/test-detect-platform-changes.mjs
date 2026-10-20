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
  const deployJob = workflow.match(/  deploy-website:[\s\S]*?(?=\n  [a-z][\w-]*:|$)/)?.[0];

  assert.ok(deployJob, 'website deploy job exists');
  assert.match(deployJob, /if:\s*>-\s+always\(\)/);
  assert.match(deployJob, /github\.event_name == 'push'/);
  assert.match(deployJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(deployJob, /needs\.required\.result == 'success'/);
});
