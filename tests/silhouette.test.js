import assert from 'node:assert/strict';
import {test} from 'node:test';
import {silhouetteCubes} from '../src/silhouette.js';
import {voxelIndex} from '../src/volumes.js';

test('shadow projection occupies exactly the requested XZ cells', () => {
  const options = {size: 2, columns: 1, rows: 1, mode: 'shadow'};
  const [fragment] = silhouetteCubes([1,0,0,1], options);
  const projected = [0,1].flatMap(z => [0,1].map(x => [0,1].some(y =>
    fragment.volume.cells[voxelIndex(2, x, y, z)] === '1')));
  assert.deepEqual(projected, [true,false,false,true]);
});

test('negative-space construction clears every depth of selected mask cells', () => {
  const options = {size: 2, columns: 1, rows: 1, mode: 'negative'};
  const [fragment] = silhouetteCubes([1,0,0,0], options);
  assert.deepEqual([0,1].map(z => fragment.volume.cells[voxelIndex(2, 0, 1, z)]), ['0','0']);
  assert.deepEqual([0,1].map(z => fragment.volume.cells[voxelIndex(2, 1, 1, z)]), ['1','1']);
});
