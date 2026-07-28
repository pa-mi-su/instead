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
  resolve(projectRoot, 'src/categories.ts'),
  resolve(webSharedRoot, 'categories.ts'),
);
await mkdir(resolve(webSharedRoot, 'lib'), { recursive: true });
await copyFile(
  resolve(projectRoot, 'src/lib/guideRows.ts'),
  resolve(webSharedRoot, 'lib/guideRows.ts'),
);

console.log('Synchronized shared INSTEAD types for the website.');
