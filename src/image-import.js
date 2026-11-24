export function bindImageImport({canApply, apply, status}) {
  const q = id => document.getElementById(id);
  const preview = q('imagePreview');
  const ctx = preview.getContext('2d');
  const dialog = q('imageImport');
  let bitmap;
  let revision = 0;
  let target;

  function render() {
    if (!bitmap) return;
    const angle = Number(q('importAngle').value) * Math.PI / 180;
    const fit = q('importFit').value === 'fill' ? Math.max : Math.min;
    const rotated = Math.abs(Math.sin(angle)) > .5;
    const base = fit(512 / (rotated ? bitmap.height : bitmap.width), 512 / (rotated ? bitmap.width : bitmap.height));
    const scale = base * Number(q('importScale').value) / 100;
    const x = Number(q('importX').value);
    const y = Number(q('importY').value);
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.translate(256 + x, 256 + y);
    ctx.rotate(angle);
    ctx.scale(q('importFlipX').checked ? -1 : 1, q('importFlipY').checked ? -1 : 1);
    ctx.globalAlpha = Number(q('importOpacity').value) / 100;
    ctx.drawImage(bitmap, -bitmap.width * scale / 2, -bitmap.height * scale / 2, bitmap.width * scale, bitmap.height * scale);
    ctx.restore();
  }

  q('image').onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const version = ++revision;
    target = canApply();
    if (!target) return;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choisissez une image PNG, JPEG ou WebP.');
      const decoded = await createImageBitmap(file);
      if (version !== revision) {
        decoded.close();
        return;
      }
      bitmap?.close();
      bitmap = decoded;
      q('imageTransform').reset();
      render();
      dialog.showModal();
    } catch (error) {
      status(error.message);
    }
  };
  q('imageTransform').oninput = render;
  q('imageTransform').onsubmit = event => {
    event.preventDefault();
    if (!bitmap) return;
    apply(preview, target);
    dialog.close();
  };
  q('cancelImageImport').onclick = () => dialog.close();
  dialog.onclose = () => {
    bitmap?.close();
    bitmap = undefined;
  };
  preview.onpointerdown = event => {
    if (event.button === 0) preview.setPointerCapture(event.pointerId);
  };
  preview.onpointermove = event => {
    if (!preview.hasPointerCapture(event.pointerId)) return;
    const scale = 512 / preview.getBoundingClientRect().width;
    const offset = (id, delta) => {
      const input = q(id);
      input.value = Math.round(Math.max(-512, Math.min(512, Number(input.value) + delta * scale)));
    };
    offset('importX', event.movementX);
    offset('importY', event.movementY);
    render();
  };
}
