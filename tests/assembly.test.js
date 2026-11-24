import assert from 'node:assert/strict';
import {test} from 'node:test';
import {grid} from '../src/model.js';
import {offsetGroup} from '../src/assembly.js';

test('group translation rejects collisions atomically and allows vacated member slots', () => {
  const cubes = grid(3, 1, 1);
  const ids = cubes.slice(0, 2).map(cube => cube.id);
  assert.equal(offsetGroup(cubes, ids, [1,0,0]), null);
  assert.deepEqual(cubes.map(cube => cube.p[0]), [0,1,2]);
  assert.equal(offsetGroup(cubes, ids, [-1,0,0]).length, 2);
  assert.deepEqual(cubes.map(cube => cube.p[0]), [-1,0,2]);
});

test('group duplication produces new independent cubes and respects existing occupancy', () => {
  const cubes = grid(2, 1, 1);
  const ids = cubes.map(cube => cube.id);
  assert.equal(offsetGroup(cubes, ids, [1,0,0], {duplicate:true}), null);
  const copy = offsetGroup(cubes, ids, [0,1,0], {duplicate:true});
  assert.deepEqual(copy.map(cube => cube.p), [[0,1,0],[1,1,0]]);
  assert.ok(copy.every(cube => !ids.includes(cube.id)));
  copy[0].faces[0] = 'different';
  assert.equal(cubes[0].faces[0], null);
});
