import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sharedFiles = new Set([
  'App.tsx',
  '.github/workflows/ci.yml',
  '.github/workflows/mobile-release.yml',
  'app.json',
  'babel.config.js',
  'index.js',
  'metro.config.js',
  'package-lock.json',
  'package.json',
  'react-native.config.js',
  'scripts/generate-env.mjs',
  'scripts/generate-icons.mjs',
  'scripts/reserve-mobile-build.mjs',
  'scripts/require-release-ci.mjs',
  'scripts/detect-platform-changes.mjs',
  'tsconfig.json',
]);

function isDocumentation(file) {
  return (
    file.startsWith('docs/') ||
    file.startsWith('release/') ||
    /\.md$/i.test(file) ||
    /(^|\/)readme(?:\.[^/]*)?$/i.test(file)
  );
}

export function classifyPlatformChanges(files) {
  let android = false;
  let ios = false;

  for (const file of files) {
    if (isDocumentation(file) || /\.web\.[jt]sx?$/.test(file)) continue;
    if (file.startsWith('android/') || /\.android\.[jt]sx?$/.test(file))
      android = true;
    else if (file.startsWith('ios/') || /\.ios\.[jt]sx?$/.test(file))
      ios = true;
    else if (file === 'Gemfile' || file === 'Gemfile.lock') ios = true;
    else if (
      [
        'scripts/upload-google-play.mjs',
        'scripts/google-play-release.mjs',
      ].includes(file)
    )
      android = true;
    else if (
      sharedFiles.has(file) ||
      file.startsWith('assets/') ||
      file.startsWith('patches/') ||
      file.startsWith('vendor/') ||
      file.startsWith('src/')
    ) {
      android = true;
      ios = true;
    }
  }

  return { android, ios };
}

// The public website and admin console share one static deployment.
export function classifyChanges(files) {
  const native = classifyPlatformChanges(files);
  const relevant = files.filter(file => !isDocumentation(file));
  const website = relevant.some(
    file =>
      file.startsWith('website/') ||
      [
        'src/policies.ts',
        'src/catalog.ts',
        'scripts/build-policy-site.mjs',
        'package.json',
        'package-lock.json',
        '.github/workflows/ci.yml',
        'scripts/detect-platform-changes.mjs',
      ].includes(file),
  );
  const quality =
    native.android ||
    native.ios ||
    website ||
    relevant.some(
      file =>
        file.startsWith('supabase/') ||
        file.startsWith('scripts/') ||
        file.startsWith('__tests__/') ||
        /(?:eslint|prettier|jest)/.test(file),
    );
  return { ...native, website, quality };
}

function writeOutputs(result) {
  const lines = Object.entries(result).map(([key, value]) => `${key}=${value}`);
  const output = `${lines.join('\n')}\n`;
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}

function run() {
  const args = process.argv.slice(2);
  if (args[0] === '--all') {
    writeOutputs({
      android: true,
      ios: true,
      website: true,
      quality: true,
    });
    return;
  }

  const [base, head] = args;
  if (!base || !head) throw new Error('Expected base and head commit refs.');
  if (/^0+$/.test(base)) {
    writeOutputs({
      android: true,
      ios: true,
      website: true,
      quality: true,
    });
    return;
  }

  const files = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      '-z',
      '--no-renames',
      process.env.DIFF_MODE === 'push' ? base : `${base}...${head}`,
      ...(process.env.DIFF_MODE === 'push' ? [head] : []),
    ],
    {
      encoding: 'utf8',
    },
  )
    .split('\0')
    .filter(Boolean);
  process.stdout.write(`Changed files:\n${files.join('\n')}\n`);
  writeOutputs(
    Object.fromEntries(
      Object.entries(classifyChanges(files)).map(([key, value]) => [
        key,
        value,
      ]),
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  run();
