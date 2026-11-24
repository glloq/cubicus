import {makeVolume, validateVolume, voxelIndex} from './volumes.js';

export function bindVolumeEditor({selected, checkpoint, change, status}) {
  const q = id => document.getElementById(id);
  const grid = q('volumeCells');
  const layer = q('volumeLayer');
  const resolution = q('volumeResolution');

  function refresh() {
    const cube = selected();
    const volume = cube?.volume;
    for (const id of ['volumeApply', 'volumeSolid']) q(id).disabled = !cube;
    grid.replaceChildren();
    if (!volume) {
      layer.replaceChildren();
      return;
    }
    const {size, cells} = volume;
    const z = Math.min(Number(layer.value), size - 1);
    if (layer.options.length !== size) {
      layer.replaceChildren(...Array.from({length: size}, (_, i) => new Option(i + 1, i)));
      layer.value = z;
    }
    grid.style.gridTemplateColumns = 'repeat(' + size + ', minmax(0, 1fr))';
    for (let y = size - 1; y >= 0; y--) for (let x = 0; x < size; x++) {
      const index = voxelIndex(size, x, y, z);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', [x + 1, y + 1, z + 1].join(', '));
      button.setAttribute('aria-pressed', String(cells[index] === '1'));
      button.onclick = () => {
        const next = cells.slice(0, index) + (cells[index] === '1' ? '0' : '1') + cells.slice(index + 1);
        if (!next.includes('1')) {
          status('Le fragment doit conserver au moins un sous-volume.');
          return;
        }
        checkpoint();
        cube.volume = validateVolume({size, cells: next});
        change();
        grid.children[(size - 1 - y) * size + x]?.focus();
      };
      grid.append(button);
    }
  }

  q('volumeApply').onclick = () => {
    const cube = selected();
    if (!cube) return;
    try {
      const options = {
        wall: Number(q('volumeWall').value),
        openings: [...q('volumeOpenings').querySelectorAll('input:checked')].map(input => Number(input.value))
      };
      const volume = makeVolume(Number(resolution.value), q('volumePreset').value, options);
      checkpoint();
      cube.volume = volume;
      change();
    } catch (error) {
      status(error.message);
    }
  };
  q('volumeSolid').onclick = () => {
    const cube = selected();
    if (!cube?.volume) return;
    checkpoint();
    delete cube.volume;
    change();
  };
  layer.onchange = refresh;
  return {refresh};
}
