import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyPlatformChanges,
  classifyChanges,
} from './detect-platform-changes.mjs';

test('website and admin changes do not select native builds', () => {
  assert.deepEqual(
    classifyPlatformChanges([
      'website/admin/admin.mjs',
      'website/admin/index.html',
      'scripts/build-policy-site.mjs',
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

test('docs and backend-only changes do not select native builds', () => {
  assert.deepEqual(
    classifyPlatformChanges(['README.md', 'supabase/builtin-recipe-admin.sql']),
    { android: false, ios: false },
  );
});

test('web deploy still runs when native build jobs are skipped', async () => {
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  const deployJob = workflow.match(
    / {2}deploy-website:[\s\S]*?(?=\n {2}[a-z][\w-]*:|$)/,
  )?.[0];

  assert.ok(deployJob, 'website deploy job exists');
  assert.match(deployJob, /if:\s*>-\s+always\(\)/);
  assert.match(deployJob, /github\.event_name == 'push'/);
  assert.match(deployJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(deployJob, /needs\.quality\.result == 'success'/);
});

test('manual mobile releases are limited to main before production credentials load', async () => {
  const workflow = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  const changesJob = workflow.match(
    /^ {2}changes:[\s\S]*?(?=^ {2}(?! )[a-z][\w-]*:|(?![\s\S]))/m,
  )?.[0];
  assert.ok(changesJob, 'mobile change-detection job exists');
  assert.match(changesJob, /node scripts\/require-release-ci\.mjs/);
  assert.match(changesJob, /github\.ref == 'refs\/heads\/main'/);
  assert.match(changesJob, /github\.ref == 'refs\/heads\/main'/);
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

test('automatic releases are called only after the required main gate', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const release = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  assert.match(ci, /needs: \[changes, required\]/);
  assert.match(ci, /uses: \.\/\.github\/workflows\/mobile-release\.yml/);
  assert.match(release, /workflow_call:/);
  assert.doesNotMatch(release, /workflow_run:/);
});

test('reviewed vendor changes validate both mobile platforms', () => {
  assert.deepEqual(classifyPlatformChanges(['vendor/deepmerge/dist/cjs.js']), {
    android: true,
    ios: true,
  });
});

test('build workflow changes validate both native platforms before merge', () => {
  for (const file of [
    '.github/workflows/ci.yml',
    '.github/workflows/mobile-release.yml',
  ]) {
    assert.deepEqual(classifyPlatformChanges([file]), {
      android: true,
      ios: true,
    });
  }
});
test('CI and TestFlight use the same configurable standard hosted runner and pinned Xcode', async () => {
  for (const file of [
    '.github/workflows/ci.yml',
    '.github/workflows/mobile-release.yml',
  ]) {
    const workflow = await readFile(file, 'utf8');
    const ios = workflow.match(
      /^ {2}ios:[\s\S]*?(?=^ {2}(?! )[a-z][\w-]*:|(?![\s\S]))/m,
    )?.[0];
    assert.ok(ios);
    const selection = ios.match(/runs-on: >-([\s\S]*?)timeout-minutes:/)?.[1];
    assert.ok(selection);
    // Every result is a literal standard hosted label, never the raw variable.
    assert.equal(
      selection.replace(/\s+/g, ' ').trim(),
      "${{ vars.IOS_RUNNER == 'macos-15' && 'macos-15' || vars.IOS_RUNNER == 'macos-15-intel' && 'macos-15-intel' || vars.IOS_RUNNER == 'macos-26-intel' && 'macos-26-intel' || 'macos-26' }}",
    );
    assert.match(ios, /Xcode_26\.3\.app/);
    assert.doesNotMatch(ios, /continue-on-error/);
  }
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  assert.match(ci, /needs: \[changes, quality, android, ios\]/);
  assert.match(ci, /IOS_EXPECTED: \$\{\{ needs.changes.outputs.ios \}\}/);
  assert.match(ci, /test "\$\{!result_var\}" = success/);
  assert.match(ci, /test "\$\{!expected_var\}" = false/);
});

test('validation limits architectures while store releases retain device support', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const release = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  assert.match(ci, /-PreactNativeArchitectures=arm64-v8a --build-cache/);
  assert.match(ci, /ARCHS="\$\(uname -m\)" ONLY_ACTIVE_ARCH=YES/);
  assert.doesNotMatch(release, /ONLY_ACTIVE_ARCH|reactNativeArchitectures=/);
  assert.match(ci, /ios-debug-v1-/);
  assert.match(release, /ios-release-v1-/);
  assert.doesNotMatch(release, /ios-debug-v1-/);
  assert.match(release, /Remove temporary Android credentials/);
});

test('required gate rejects failed or unexpectedly skipped mobile builds', async () => {
  const { spawnSync } = await import('node:child_process');
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const gate = ci.match(
    / {2}required:[\s\S]*? {8}run: \|\n([\s\S]*?)(?=\n {2}deploy-website:)/,
  )?.[1];
  assert.ok(gate);
  const script = gate.replace(/^ {10}/gm, '');
  const run = changes =>
    spawnSync('bash', ['-c', script], {
      env: {
        ...process.env,
        CHANGES_RESULT: 'success',
        QUALITY_EXPECTED: 'true',
        QUALITY_RESULT: 'success',
        ANDROID_EXPECTED: 'true',
        IOS_EXPECTED: 'true',
        ANDROID_RESULT: 'success',
        IOS_RESULT: 'success',
        ...changes,
      },
    }).status;
  assert.equal(run({}), 0);
  assert.equal(
    run({
      ANDROID_EXPECTED: 'false',
      IOS_EXPECTED: 'false',
      ANDROID_RESULT: 'skipped',
      IOS_RESULT: 'skipped',
    }),
    0,
  );
  for (const result of ['skipped', 'failure', 'cancelled']) {
    assert.notEqual(run({ IOS_RESULT: result }), 0);
    assert.notEqual(run({ ANDROID_RESULT: result }), 0);
  }
  assert.equal(
    run({
      QUALITY_EXPECTED: 'false',
      QUALITY_RESULT: 'skipped',
      ANDROID_EXPECTED: 'false',
      IOS_EXPECTED: 'false',
      ANDROID_RESULT: 'skipped',
      IOS_RESULT: 'skipped',
    }),
    0,
  );
  assert.notEqual(run({ QUALITY_RESULT: 'failure' }), 0);
  assert.notEqual(run({ IOS_EXPECTED: '' }), 0);
});

test('documentation changes skip all builds, checks and deployment', () => {
  assert.deepEqual(
    classifyChanges(['README.md', 'docs/setup.md', 'ios/README.md']),
    { android: false, ios: false, website: false, quality: false },
  );
});
test('each platform selects only its own build', () => {
  for (const [file, platform] of [
    ['ios/Instead/AppDelegate.swift', 'ios'],
    ['android/app/build.gradle', 'android'],
    ['src/components/Scanner.ios.tsx', 'ios'],
    ['src/components/Scanner.android.tsx', 'android'],
    ['website/admin/admin.mjs', 'website'],
  ]) {
    const result = classifyChanges([file]);
    for (const key of ['ios', 'android', 'website'])
      assert.equal(result[key], key === platform, `${file}: ${key}`);
    assert.equal(result.quality, true);
  }
});
test('policy and catalog changes rebuild their consumers', () => {
  for (const file of ['src/policies.ts', 'src/catalog.ts'])
    assert.deepEqual(classifyChanges([file]), {
      android: true,
      ios: true,
      website: true,
      quality: true,
    });
});

test('main releases can reach Play production and staged rollouts', async () => {
  const release = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  assert.match(
    release,
    /options: \[configured, internal, alpha, beta, production\]/,
  );
  assert.match(release, /vars\.ANDROID_PLAY_TRACK \|\| 'production'/);
  assert.match(release, /GOOGLE_PLAY_USER_FRACTION/);
  assert.doesNotMatch(release, /GOOGLE_PLAY_TRACK: internal/);
});

test('native build inputs are not mistaken for documentation', () => {
  assert.equal(
    classifyChanges(['android/app/src/main/jni/CMakeLists.txt']).android,
    true,
  );
  assert.equal(classifyChanges(['ios/Instead/data.txt']).ios, true);
});

test('git comparisons handle multi-commit pushes and cross-platform renames', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } =
    await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(join(tmpdir(), 'instead-routing-'));
  const detector = resolve('scripts/detect-platform-changes.mjs');
  const git = (...args) =>
    execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  const commit = () => {
    git('add', '.');
    git(
      '-c',
      'user.name=CI Test',
      '-c',
      'user.email=ci@example.invalid',
      'commit',
      '-m',
      'fixture',
    );
    return git('rev-parse', 'HEAD');
  };
  const detect = (base, head, mode) =>
    execFileSync(process.execPath, [detector, base, head], {
      cwd: directory,
      encoding: 'utf8',
      env: { ...process.env, DIFF_MODE: mode, GITHUB_OUTPUT: '' },
    });
  try {
    git('init');
    writeFileSync(join(directory, 'README.md'), 'base');
    const base = commit();
    mkdirSync(join(directory, 'ios'));
    writeFileSync(join(directory, 'ios', 'Native.swift'), 'native');
    commit();
    writeFileSync(join(directory, 'README.md'), 'docs after native change');
    const head = commit();
    const push = detect(base, head, 'push');
    assert.match(push, /ios=true/);
    assert.match(push, /android=false/);
    mkdirSync(join(directory, 'android'));
    renameSync(
      join(directory, 'ios', 'Native.swift'),
      join(directory, 'android', 'Native.swift'),
    );
    const renamed = commit();
    const result = detect(head, renamed, 'pull_request');
    assert.match(result, /ios=true/);
    assert.match(result, /android=true/);
    writeFileSync(join(directory, 'README.md'), 'docs only');
    const docs = commit();
    assert.match(detect(renamed, docs, 'push'), /quality=false/);
    assert.match(detect('0'.repeat(40), docs, 'push'), /android=true/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('PR updates cancel obsolete checks while main deployments preserve queued merges', async () => {
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const concurrency = ci.match(/^concurrency:[\s\S]*?(?=^jobs:)/m)?.[0];
  assert.ok(concurrency);
  assert.ok(
    concurrency.includes(
      "cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
    ),
  );
  assert.ok(
    concurrency.includes(
      "queue: ${{ github.event_name == 'pull_request' && 'single' || 'max' }}",
    ),
  );
  const release = await readFile(
    '.github/workflows/mobile-release.yml',
    'utf8',
  );
  assert.match(release, /cancel-in-progress: false\n  queue: max/);
});
