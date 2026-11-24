import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cube, exportPuzzle, validate} from '../src/model.js';
import {muralTilePose} from '../src/mural.js';
import {overlayPartition} from '../src/overlay.js';

test('mural planes rotate the decorated local side toward the expected world axis', () => {
  for (const [plane, normal] of [['XY',[0,0,1]], ['XZ',[0,1,0]], ['YZ',[1,0,0]]]) {
    const pose = muralTilePose(1, 1, 4, 3, plane);
    assert.deepEqual([pose.r[2], pose.r[5], pose.r[8]], normal);
    assert.equal(pose.p[normal.indexOf(1)], 0);
  }
});

test('overlay partitions assign each sample to exactly one layer', () => {
  assert.deepEqual([...overlayPartition('bands', 2, 4)].slice(0, 4), [0,0,1,1]);
  assert.ok([...overlayPartition('regions', 3, 4)].every(index => index < 3));
  assert.deepEqual([...overlayPartition('pixels', 3, 2, [3,4,5,6])], [0,1,2,0]);
});

test('an opening view is allowlisted independently of reference metadata', () => {
  const puzzle = exportPuzzle([cube()], {}, {
    position: [1,2,3], target: [0,0,0], spacing: [0,1,2], zoom: 1,
    light: [0,90], shadows: true, referenceName: 'confidentiel'
  });
  assert.equal(Object.hasOwn(puzzle.view, 'referenceName'), false);
  assert.deepEqual(puzzle.view.light, [0,90]);
  assert.equal(puzzle.view.shadows, true);
});

test('only solid fully opaque mirror faces, at most two, validate', () => {
  const fragment = cube();
  fragment.materials = Array.from({length: 6}, (_, i) => ({mode: i < 2 ? 'mirror' : 'lit'}));
  assert.equal(validate(exportPuzzle([fragment]))[0].materials[0].mode, 'mirror');
  fragment.opacity = [.5,1,1,1,1,1];
  assert.throws(() => validate(exportPuzzle([fragment])), /100 %/);
  fragment.opacity[0] = 1;
  fragment.materials[2].mode = 'mirror';
  assert.throws(() => validate(exportPuzzle([fragment])), /Deux/);
});
