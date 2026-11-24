import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three';
import {makeVolume, validateVolume} from '../src/volumes.js';
import {meshVolume} from '../src/volume-mesh.js';
import {cube, exportPuzzle, validate} from '../src/model.js';

test('a solid voxel cube merges coplanar faces and preserves BoxGeometry UV winding', () => {
  const geometry = meshVolume(makeVolume(16, 'solid'));
  assert.equal(geometry.index.count, 36);
  assert.equal(geometry.attributes.position.count, 24);
  const {position, normal, uv} = geometry.attributes;
  for (const group of geometry.groups) {
    const vertices = Array.from({length: 3}, (_, index) => geometry.index.getX(group.start + index));
    const [a, b, c] = vertices.map(index => new Vector3().fromBufferAttribute(position, index));
    const expected = new Vector3().fromBufferAttribute(normal, vertices[0]);
    assert.ok(b.sub(a).cross(c.sub(a)).dot(expected) > 0);
    assert.deepEqual(vertices.map(index => [uv.getX(index), uv.getY(index)]), [[0,0],[1,0],[1,1]]);
  }
});

test('a through-hole allows rays through from both directions', () => {
  const geometry = meshVolume(makeVolume(8, 'tunnel'));
  const mesh = new Mesh(geometry, Array.from({length: 6}, () => new MeshBasicMaterial()));
  for (const side of [-1, 1]) {
    const ray = new Raycaster(new Vector3(0, 0, side * 2), new Vector3(0, 0, -side));
    assert.equal(ray.intersectObject(mesh).length, 0);
    ray.ray.origin.x = .4;
    assert.equal(ray.intersectObject(mesh)[0].face.materialIndex, side === 1 ? 4 : 5);
  }
});

test('public volumes keep only grid occupancy and reject invalid or empty data', () => {
  const fragment = cube();
  fragment.volume = {...makeVolume(8, 'shell', {openings: [4]}), privateMask: 'secret'};
  const publicPuzzle = exportPuzzle([fragment]);
  assert.deepEqual(publicPuzzle.cubes[0].volume, validateVolume(fragment.volume));
  assert.deepEqual(validate(publicPuzzle)[0].volume, publicPuzzle.cubes[0].volume);
  assert.throws(() => validateVolume({size: 2, cells: '00000000'}), /Volume/);
});
