import {mul, publicControls, quarter} from './model.js';

// All generated steps are reversible through the Player's ordinary operations.
export function mixPuzzle(cubes, controls, {positions = true, rotations = true, steps = 20, axes = 'XYZ', random = Math.random} = {}) {
  const rules = publicControls(controls);
  const rotateAxes = [...'XYZ'].filter(axis => axes.includes(axis));
  const canSwap = Boolean(positions && rules.move && cubes.length >= 2);
  const canRotate = Boolean(rotations && rules.rotate && rotateAxes.length && cubes.length);
  if (!canSwap && !canRotate) return 0;
  const count = Math.max(1, Math.min(200, Math.floor(Number(steps)) || 1));
  const pick = length => Math.floor(random() * length);
  for (let move = 0; move < count; move++) {
    const first = pick(cubes.length);
    const cube = cubes[first];
    if (canSwap && (!canRotate || random() < .5)) {
      const offset = 1 + pick(cubes.length - 1);
      const other = cubes[(first + offset) % cubes.length];
      [cube.p, other.p] = [other.p, cube.p];
    } else {
      cube.r = mul(quarter(rotateAxes[pick(rotateAxes.length)], random() < .5 ? -1 : 1), cube.r);
    }
  }
  return count;
}
