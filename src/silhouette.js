import {cube} from './model.js';
import {RESOLUTIONS, voxelIndex} from './volumes.js';

/**
 * Raster mask, sampled top-to-bottom. Shadow volumes project onto XZ from +Y.
 * Negative-space volumes extend empty columns along Z and are viewed from +Z.
 */
export function silhouetteCubes(mask, {size, columns, rows, mode}) {
  if (!RESOLUTIONS.includes(size) || ![1,2,3,4].includes(columns) || ![1,2,3,4].includes(rows)
    || mask.length !== size ** 2 * columns * rows || !['shadow', 'negative'].includes(mode)) {
    throw new Error('Dimensions du masque invalides');
  }
  const width = size * columns;
  const cubes = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const cells = Array(size ** 3).fill('0');
    for (let v = 0; v < size; v++) for (let x = 0; x < size; x++) {
      const active = Boolean(mask[(row * size + v) * width + column * size + x]);
      if (mode === 'shadow' && active) {
        const height = (x + v + row + column) % size;
        cells[voxelIndex(size, x, height, v)] = '1';
      } else if (mode === 'negative' && !active) {
        for (let depth = 0; depth < size; depth++) cells[voxelIndex(size, x, size - 1 - v, depth)] = '1';
      }
    }
    if (!cells.includes('1')) continue;
    const slot = mode === 'shadow' ? [column, 0, row] : [column, rows - 1 - row, 0];
    cubes.push({...cube(slot), volume: {size, cells: cells.join('')}});
  }
  if (!cubes.length) throw new Error('Le masque ne produit aucun fragment.');
  return cubes;
}
