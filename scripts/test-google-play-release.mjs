import test from 'node:test';
import assert from 'node:assert/strict';
import { playRelease } from './google-play-release.mjs';

test('production, closed, open and internal destinations are supported', () => {
  for (const track of ['production', 'alpha', 'beta', 'internal'])
    assert.deepEqual(playRelease({ track, name: '1.0' }), {
      name: '1.0',
      status: 'completed',
    });
});
test('staged production rollout includes the requested fraction', () => {
  assert.deepEqual(
    playRelease({ track: 'production', status: 'inProgress', fraction: '0.1' }),
    {
      name: undefined,
      status: 'inProgress',
      userFraction: 0.1,
    },
  );
});
test('invalid destination or rollout fails before uploading', () => {
  for (const config of [
    { track: 'unknown' },
    { track: 'production', status: 'halted' },
    { track: 'production', status: 'inProgress' },
    { track: 'production', status: 'inProgress', fraction: '1' },
    { track: 'internal', status: 'inProgress', fraction: '.2' },
    { track: 'production', status: 'completed', fraction: '.2' },
  ])
    assert.throws(() => playRelease(config));
});
