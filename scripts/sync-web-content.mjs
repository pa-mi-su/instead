import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const webSharedRoot = resolve(projectRoot, 'web/shared');

await mkdir(resolve(webSharedRoot, 'data'), { recursive: true });
await copyFile(
  resolve(projectRoot, 'src/types.ts'),
  resolve(webSharedRoot, 'types.ts'),
);
await copyFile(
  resolve(projectRoot, 'src/data/guides.ts'),
  resolve(webSharedRoot, 'data/guides.ts'),
);

console.log('Synchronized shared INSTEAD guide content for the website.');
