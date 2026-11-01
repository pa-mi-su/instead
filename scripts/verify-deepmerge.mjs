import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hashes = {
  'index.js':
    '14e987f671cef04c369116752a2a98ca14700a788de28c781e432655bb044649',
  'dist/cjs.js':
    '73afd95fdd814fb5621fe8e25545a28578e8c9c14ff76050f0c40b161c72104b',
  'dist/umd.js':
    '0bbc158163d69d2a2d095660fb30847ac9442a7c2c6b2eb294dd2a238d383997',
};
export function verifyDeepmerge(root = process.cwd()) {
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
  );
  const installed = path.join(root, 'node_modules/deepmerge');
  const vendor = path.join(root, 'vendor/deepmerge');
  const pkg = JSON.parse(
    fs.readFileSync(path.join(installed, 'package.json'), 'utf8'),
  );
  if (
    pkg.name !== 'deepmerge' ||
    pkg.version !== '4.3.2-instead.1' ||
    pkg.main !== 'dist/cjs.js' ||
    pkg.exports !== undefined ||
    pkg.scripts !== undefined ||
    lock.packages['node_modules/deepmerge']?.resolved !== 'vendor/deepmerge' ||
    !lock.packages['node_modules/deepmerge']?.link ||
    fs.realpathSync(installed) !== fs.realpathSync(vendor)
  )
    throw new Error(
      'deepmerge must resolve to the reviewed INSTEAD security fork.',
    );
  for (const name of Object.keys(lock.packages)) {
    if (name.endsWith('/node_modules/deepmerge'))
      throw new Error('An unexpected nested deepmerge copy is installed.');
  }
  for (const [file, expected] of Object.entries(hashes)) {
    const actual = createHash('sha256')
      .update(fs.readFileSync(path.join(installed, file)))
      .digest('hex');
    if (actual !== expected)
      throw new Error(`deepmerge security fork integrity failed: ${file}`);
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  verifyDeepmerge();
  console.log('Verified reviewed deepmerge security fork.');
}
