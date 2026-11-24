import {BufferGeometry, Float32BufferAttribute} from 'three';
import {voxelIndex} from './volumes.js';

// Positive U and V follow the shared BoxGeometry UV convention.
const SIDES = [
  [0, 1, 2, -1, 1, 1],
  [0, -1, 2, 1, 1, 1],
  [1, 1, 0, 1, 2, -1],
  [1, -1, 0, 1, 2, 1],
  [2, 1, 0, 1, 1, 1],
  [2, -1, 0, -1, 1, 1]
];

export function meshVolume({size, cells}) {
  const geometry = new BufferGeometry();
  const positions = [], normals = [], uvs = [], indices = [];
  for (const [material, [axis, sign, uAxis, uSign, vAxis, vSign]] of SIDES.entries()) {
    const start = indices.length;
    const normal = [0, 0, 0];
    normal[axis] = sign;
    const cell = [0, 0, 0];
    for (let slice = 0; slice < size; slice++) {
      const visible = new Uint8Array(size * size);
      for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) {
        cell[axis] = slice;
        cell[uAxis] = uSign === 1 ? u : size - 1 - u;
        cell[vAxis] = vSign === 1 ? v : size - 1 - v;
        if (cells[voxelIndex(size, ...cell)] !== '1') continue;
        cell[axis] += sign;
        if (cell[axis] < 0 || cell[axis] >= size || cells[voxelIndex(size, ...cell)] !== '1') {
          visible[v * size + u] = 1;
        }
      }
      for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) {
        if (!visible[v * size + u]) continue;
        let endU = u + 1;
        let endV = v + 1;
        while (endU < size && visible[v * size + endU]) endU++;
        while (endV < size && visible.subarray(endV * size + u, endV * size + endU).every(Boolean)) endV++;
        for (let row = v; row < endV; row++) visible.fill(0, row * size + u, row * size + endU);
        const index = positions.length / 3;
        for (const [a, b] of [[u,v], [endU,v], [endU,endV], [u,endV]]) {
          const point = [0, 0, 0];
          point[axis] = (slice + Number(sign === 1)) / size - .5;
          point[uAxis] = uSign * (a / size - .5);
          point[vAxis] = vSign * (b / size - .5);
          positions.push(...point);
          normals.push(...normal);
          uvs.push(a / size, b / size);
        }
        indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
      }
    }
    if (indices.length > start) geometry.addGroup(start, indices.length - start, material);
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
