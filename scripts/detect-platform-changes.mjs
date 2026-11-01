import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sharedFiles = new Set([
  'App.tsx',
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
  'tsconfig.json',
]);

export function classifyPlatformChanges(files) {
  let android = false;
  let ios = false;

  for (const file of files) {
    if (file.startsWith('android/')) android = true;
    else if (file.startsWith('ios/')) ios = true;
    else if (file === 'Gemfile' || file === 'Gemfile.lock') ios = true;
    else if (file === 'scripts/upload-google-play.mjs') android = true;
    else if (
      sharedFiles.has(file) ||
      file.startsWith('assets/') ||
      file.startsWith('patches/') ||
      file.startsWith('vendor/') ||
      (file.startsWith('src/') && file !== 'src/policies.ts')
    ) {
      android = true;
      ios = true;
    }
  }

  return { android, ios };
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
    writeOutputs({ android: true, ios: true });
    return;
  }

  const [base, head] = args;
  if (!base || !head) throw new Error('Expected base and head commit refs.');
  if (/^0+$/.test(base)) {
    writeOutputs({ android: true, ios: true });
    return;
  }

  const files = execFileSync(
    'git',
    ['diff', '--name-only', `${base}...${head}`],
    {
      encoding: 'utf8',
    },
  )
    .split('\n')
    .filter(Boolean);
  process.stdout.write(`Changed files:\n${files.join('\n')}\n`);
  writeOutputs(
    Object.fromEntries(
      Object.entries(classifyPlatformChanges(files)).map(([key, value]) => [
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
