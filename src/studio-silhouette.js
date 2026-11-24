import {silhouetteCubes} from './silhouette.js';

export function bindSilhouette({apply, status}) {
  const q = id => document.getElementById(id);
  const preview = q('silhouettePreview');
  const context = preview.getContext('2d', {willReadFrequently: true});
  let bitmap;
  let request = 0;

  function sample() {
    if (!bitmap) throw new Error('Choisissez une silhouette.');
    const size = Number(q('silhouetteResolution').value);
    const count = id => Math.max(1, Math.min(4, Math.floor(Number(q(id).value)) || 1));
    const columns = count('silhouetteColumns');
    const rows = count('silhouetteRows');
    const mode = q('silhouetteMode').value;
    preview.width = size * columns;
    preview.height = size * rows;
    const scale = Math.min(preview.width / bitmap.width, preview.height / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(bitmap, (preview.width - width) / 2, (preview.height - height) / 2, width, height);
    const image = context.getImageData(0, 0, preview.width, preview.height);
    const threshold = Number(q('silhouetteThreshold').value);
    const mask = new Uint8Array(preview.width * preview.height);
    for (let i = 0; i < mask.length; i++) {
      const p = i * 4;
      const gray = (image.data[p] * .2126 + image.data[p + 1] * .7152 + image.data[p + 2] * .0722);
      mask[i] = Number(image.data[p + 3] > 127 && gray <= threshold);
      image.data[p] = image.data[p + 1] = image.data[p + 2] = mask[i] ? 24 : 230;
      image.data[p + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return {mask, size, columns, rows, mode};
  }

  function refresh() { if (bitmap) sample(); }
  q('silhouette').onchange = async event => {
    const file = event.target.files[0];
    const version = ++request;
    if (!file) return;
    try {
      const image = await createImageBitmap(file);
      if (version !== request) { image.close(); return; }
      bitmap?.close();
      bitmap = image;
      refresh();
    } catch (error) {
      status(error.message);
    }
  };
  q('silhouetteTool').oninput = refresh;
  q('silhouetteCreate').onclick = () => {
    try {
      const {mask, ...options} = sample();
      apply(silhouetteCubes(mask, options), options.mode);
    } catch (error) {
      status(error.message);
    }
  };
}
