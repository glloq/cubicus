// Layer order is Z, then Y, then X. The grid occupies one logical cube.
export const RESOLUTIONS = [2, 4, 8, 16];
export const voxelIndex = (size, x, y, z) => (z * size + y) * size + x;

export function validateVolume(volume) {
  if (volume == null) return null;
  const {size, cells} = volume;
  if (!RESOLUTIONS.includes(size) || typeof cells !== 'string' ||
      cells.length !== size ** 3 || /[^01]/.test(cells) || !cells.includes('1')) {
    throw new Error('Volume de fragment invalide');
  }
  return {size, cells};
}

export function makeVolume(size, kind, {wall = 1, openings = []} = {}) {
  const cells = [];
  const width = Math.max(1, Math.min(size, Math.floor(wall) || 1));
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const walls = [x >= size - width, x < width, y >= size - width, y < width, z >= size - width, z < width];
    const closed = walls.filter((present, face) => present && !openings.includes(face)).length;
    const tunnel = Math.abs(x + .5 - size / 2) <= size / 4 && Math.abs(y + .5 - size / 2) <= size / 4;
    const occupied = {
      solid: true,
      shell: closed > 0,
      frame: closed >= 2,
      tunnel: !tunnel,
      plate: z < width
    }[kind];
    cells.push(occupied ? '1' : '0');
  }
  return validateVolume({size, cells: cells.join('')});
}

export function paintVolumeRegion(volume, start, end, occupied) {
  const {size,cells}=validateVolume(volume);
  if(![start,end].every(point=>Array.isArray(point)&&point.length===3&&point.every(value=>
    Number.isInteger(value)&&value>=0&&value<size)))throw Error('Région hors de la grille interne.');
  const min=start.map((value,i)=>Math.min(value,end[i]));
  const max=start.map((value,i)=>Math.max(value,end[i]));
  const result=cells.split('');
  for(let z=min[2];z<=max[2];z++)for(let y=min[1];y<=max[1];y++)for(let x=min[0];x<=max[0];x++){
    result[voxelIndex(size,x,y,z)]=occupied?'1':'0';
  }
  if(!result.includes('1'))throw Error('Le fragment doit conserver au moins un sous-volume.');
  return {size,cells:result.join('')};
}
