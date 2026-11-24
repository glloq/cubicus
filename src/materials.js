export const MAX_MIRRORS = 2;
const MODES = ['lit', 'unlit', 'emissive', 'mirror'];

export function faceMaterials(value) {
  return Array.from({length: 6}, (_, face) => {
    const material = value?.[face];
    const mode = MODES.includes(material?.mode) ? material.mode : 'lit';
    const color = typeof material?.color === 'string' && /^#[a-fA-F0-9]{6}$/.test(material.color)
      ? material.color.toLowerCase() : null;
    return {mode, color, blend: material?.blend === true};
  });
}

export function validateMirrors(cubes) {
  let mirrors = 0;
  for (const cube of cubes) for (const [face, material] of (cube.materials ?? []).entries()) {
    if (material.mode !== 'mirror') continue;
    if (cube.volume || (cube.opacity?.[face] ?? 1) !== 1) {
      throw new Error('Une face miroir exige un cube plein et une opacité de 100 %.');
    }
    mirrors++;
  }
  if (mirrors > MAX_MIRRORS) throw new Error('Deux faces miroir au maximum par énigme.');
}
