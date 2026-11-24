import {grid} from './model.js';

export function overlayPartition(mode, count, size, random) {
  const output = new Uint8Array(size ** 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = y * size + x;
    if (mode === 'bands') output[index] = Math.floor(x * count / size);
    else if (mode === 'regions') output[index] = (Math.floor(x * 4 / size) + 3 * Math.floor(y * 4 / size)) % count;
    else output[index] = random[index] % count;
  }
  return output;
}

export function overlayLayers(image, count, {mode = 'pixels', depth = 1} = {}) {
  if (!Number.isInteger(count) || count < 2 || count > 8) throw new Error('Nombre de couches invalide');
  if (!['pixels','bands','regions'].includes(mode) || ![1,2,3].includes(depth)) throw new Error('Répartition invalide');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const scale = Math.min(512 / image.width, 512 / image.height);
  ctx.drawImage(image, (512 - image.width * scale) / 2, (512 - image.height * scale) / 2, image.width * scale, image.height * scale);
  const source = ctx.getImageData(0, 0, 512, 512);
  const cubes = grid(1, 1, count);
  const layers = cubes.map(() => ctx.createImageData(512, 512));
  const random = new Uint32Array(512 * 512);
  if (mode === 'pixels') for (let i = 0; i < random.length; i += 16384) crypto.getRandomValues(random.subarray(i, i + 16384));
  const partition = overlayPartition(mode, count, 512, random);
  for (let pixel = 0; pixel < partition.length; pixel++) {
    const start = pixel * 4;
    layers[partition[pixel]].data.set(source.data.subarray(start, start + 4), start);
  }
  for (const [index, cube] of cubes.entries()) {
    ctx.putImageData(layers[index], 0, 0);
    cube.p[2] *= depth;
    cube.faces[4] = canvas.toDataURL('image/png');
    cube.opacity = [0,0,0,0,1,0];
    cube.alphaFaces = [false,false,false,false,true,false];
  }
  return cubes;
}
