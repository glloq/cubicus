import assert from 'node:assert/strict';
import {test} from 'node:test';
import {grid, quarter} from '../src/model.js';
import {mixPuzzle} from '../src/mix.js';

test('mix never makes a move that its public rules prohibit', () => {
  const cubes = grid(2, 1, 1);
  const initial = structuredClone(cubes);
  assert.equal(mixPuzzle(cubes, {move: false, rotate: false}), 0);
  assert.deepEqual(cubes, initial);
  assert.equal(mixPuzzle(cubes, {move: false}, {steps: 1, axes: 'Z', random: () => 0}), 1);
  assert.deepEqual(cubes.map(cube => cube.p), initial.map(cube => cube.p));
  assert.deepEqual(cubes[0].r, quarter('Z', -1));
});

test('swap-only mix preserves each orientation and swaps occupied grid slots', () => {
  const cubes = grid(2, 1, 1);
  const initial = structuredClone(cubes);
  assert.equal(mixPuzzle(cubes, {rotate: false}, {steps: 1, random: () => 0}), 1);
  assert.deepEqual(cubes.map(cube => cube.r), initial.map(cube => cube.r));
  assert.deepEqual(cubes.map(cube => cube.p), initial.map(cube => cube.p).reverse());
});
