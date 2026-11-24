import {exportPuzzle, validate} from './model.js';

export async function preparePublicPuzzle(cubes, controls, publicView) {
  const puzzle = exportPuzzle(cubes, controls, publicView);
  validate(puzzle);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const rasters = new Map();
  for (const cube of puzzle.cubes) for (const [face, source] of cube.faces.entries()) {
    if (!source) continue;
    if (!rasters.has(source)) {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      rasters.set(source, canvas.toDataURL('image/png'));
    }
    cube.faces[face] = rasters.get(source);
  }
  return puzzle;
}
