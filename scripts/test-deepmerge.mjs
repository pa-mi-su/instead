import test from 'node:test';
import assert from 'node:assert/strict';
import merge from 'deepmerge';

test('malicious target keys cannot change the merged object prototype', () => {
  const target = JSON.parse('{"__proto__":{"injected":true},"safe":1}');
  const result = merge(target, { value: 2 });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.injected, undefined);
  assert.equal(result.safe, 1);
  assert.equal(result.value, 2);
  assert.equal({}.injected, undefined);
});
test('null-prototype targets cannot let source keys poison the destination', () => {
  const result = merge(
    Object.create(null),
    JSON.parse('{"__proto__":{"injected":true}}'),
  );
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.injected, undefined);
});
test('nested config, arrays, custom merges and symbol keys retain their behavior', () => {
  const key = Symbol('config');
  const result = merge(
    { nested: { a: 1 }, list: [1], [key]: { a: 1 } },
    { nested: { b: 2 }, list: [2], [key]: { b: 2 } },
  );
  assert.deepEqual(result, {
    nested: { a: 1, b: 2 },
    list: [1, 2],
    [key]: { a: 1, b: 2 },
  });
  assert.deepEqual(
    merge(
      { list: [1] },
      { list: [2] },
      { customMerge: name => (name === 'list' ? (_a, b) => b : undefined) },
    ),
    { list: [2] },
  );
});

test('fork source entry and UMD build share the hardened merge behavior', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  for (const entry of [
    '../vendor/deepmerge/index.js',
    '../vendor/deepmerge/dist/umd.js',
  ]) {
    const implementation = require(entry);
    const result = implementation(
      JSON.parse('{"__proto__":{"injected":true}}'),
      { safe: 1 },
    );
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.injected, undefined);
    assert.equal(result.safe, 1);
  }
});
