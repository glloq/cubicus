function validPosition(position) {
  return position.every(value => Number.isInteger(value) && Math.abs(value) <= 100);
}

export function offsetGroup(cubes, ids, offset, {duplicate = false} = {}) {
  const idsSet = new Set(ids);
  const members = cubes.filter(cube => idsSet.has(cube.id));
  if (!members.length || offset.length !== 3 || offset.every(value => value === 0)) return null;
  if (duplicate && cubes.length + members.length > 512) return null;
  const occupied = new Set(cubes.filter(cube => duplicate || !idsSet.has(cube.id)).map(cube => cube.p.join(',')));
  const positions = members.map(cube => cube.p.map((value, axis) => value + offset[axis]));
  if (positions.some(position => !validPosition(position) || occupied.has(position.join(',')))) return null;
  if (duplicate) return members.map((cube, index) => ({...structuredClone(cube), id: crypto.randomUUID(), p: positions[index]}));
  members.forEach((cube, index) => { cube.p = positions[index]; });
  return members;
}
