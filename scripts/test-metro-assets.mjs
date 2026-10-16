import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  getAssetData,
  getAssetSize,
} = require('../node_modules/metro/src/Assets.js');

test('Metro reads image dimensions from file assets and byte buffers with patched image-size', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'instead-assets-'));
  try {
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=',
      'base64',
    );
    const file = path.join(directory, 'pixel.png');
    await fs.writeFile(file, image);
    const asset = await getAssetData(
      file,
      'pixel.png',
      [],
      'android',
      '/assets',
    );
    assert.equal(asset.width, 1);
    assert.equal(asset.height, 1);
    assert.deepEqual(getAssetSize('png', image, file), { width: 1, height: 1 });
    await fs.writeFile(path.join(directory, 'plain.txt'), 'ordinary asset');
    const plain = await getAssetData(
      path.join(directory, 'plain.txt'),
      'plain.txt',
      [],
      'android',
      '/assets',
    );
    assert.equal(plain.width, undefined);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
