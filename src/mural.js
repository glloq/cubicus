import {grid, identity, quarter} from './model.js';

export function muralTilePose(x, y, columns, rows, plane) {
  if (plane === 'XZ') return {p: [x, 0, rows - 1 - y], r: quarter('X', -1)};
  if (plane === 'YZ') return {p: [0, y, columns - 1 - x], r: quarter('Y', 1)};
  return {p: [x, y, 0], r: identity()};
}

export function muralTiles(image, cols, rows, {plane = 'XY', fill = false, alpha = false, angle = 0, offset = [0, 0]} = {}) {
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols > 8 || rows > 8) {
    throw new Error('Dimensions de fresque invalides');
  }
  if (!['XY','XZ','YZ'].includes(plane) || ![0,90,180,270].includes(angle)) throw new Error('Plan de fresque invalide');
  const full = document.createElement('canvas');
  full.width = cols * 512;
  full.height = rows * 512;
  const ctx = full.getContext('2d');
  if (!alpha) {
    ctx.fillStyle = '#304050';
    ctx.fillRect(0, 0, full.width, full.height);
  }
  const turned = angle % 180 !== 0;
  const scale = (fill ? Math.max : Math.min)(
    full.width / (turned ? image.height : image.width),
    full.height / (turned ? image.width : image.height)
  );
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.translate(full.width / 2 + offset[0], full.height / 2 + offset[1]);
  ctx.rotate(angle * Math.PI / 180);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  const cubes = grid(cols, rows, 1);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  const paint = tile.getContext('2d');
  for (const cube of cubes) {
    const [x, y] = cube.p;
    paint.clearRect(0, 0, 512, 512);
    paint.drawImage(full, x * 512, (rows - 1 - y) * 512, 512, 512, 0, 0, 512, 512);
    cube.faces[4] = tile.toDataURL('image/png');
    if (alpha) cube.materials = Array.from({length: 6}, (_, face) => ({blend: face === 4}));
    Object.assign(cube, muralTilePose(x, y, cols, rows, plane));
  }
  return cubes;
}
