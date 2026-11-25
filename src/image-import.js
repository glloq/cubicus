import {svgBitmap} from './svg-import.js';
export function bindImageImport({faces, target: getTarget, apply, status}) {
  const q = id => document.getElementById(id);
  const preview = q('imagePreview');
  const ctx = preview.getContext('2d');
  const dialog = q('imageImport');
  let bitmap;
  let revision = 0;
  let target;

  const mode=q('imageMode');
  const stripFaces=[4,0,5,1];
  const options=q('imageFaces');
  faces.forEach((name,face)=>{
    const label=document.createElement('label');
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';
    checkbox.value=face;
    label.append(checkbox,' '+name);
    options.append(label);
  });
  const chosen=()=>[...options.querySelectorAll('input:checked')].map(input=>Number(input.value));
  function render() {
    if (!bitmap) return;
    const strip=mode.value==='strip';
    const screen=q('imageMultiPreview');
    options.hidden=mode.value!=='repeat';
    screen.hidden=!strip;
    q('imagePreviewWrap').classList.toggle('strip-preview',strip);
    const size=strip?2048:512;
    if(preview.width!==size)preview.width=size;
    const angle = Number(q('importAngle').value) * Math.PI / 180;
    const fit = q('importFit').value === 'fill' ? Math.max : Math.min;
    const rotated = Math.abs(Math.sin(angle)) > .5;
    const base = fit(size / (rotated ? bitmap.height : bitmap.width), 512 / (rotated ? bitmap.width : bitmap.height));
    const scale = base * Number(q('importScale').value) / 100;
    const x = Number(q('importX').value);
    const y = Number(q('importY').value);
    ctx.clearRect(0, 0, size, 512);
    ctx.save();
    ctx.translate(size / 2 + x, 256 + y);
    ctx.rotate(angle);
    ctx.scale(q('importFlipX').checked ? -1 : 1, q('importFlipY').checked ? -1 : 1);
    ctx.globalAlpha = Number(q('importOpacity').value) / 100;
    ctx.drawImage(bitmap, -bitmap.width * scale / 2, -bitmap.height * scale / 2, bitmap.width * scale, bitmap.height * scale);
    ctx.restore();
    screen.textContent=stripFaces.map(face=>faces[face]).join(' → ')+' → Avant';
  }

  q('image').onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const version = ++revision;
    target = getTarget();
    if (!target) return;
    try {
      const vector=file.type==='image/svg+xml'||(!file.type&&/\.svg$/i.test(file.name));
      if (!vector&&!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choisissez une image PNG, JPEG, WebP ou SVG.');
      const decoded = await (vector?svgBitmap(file):createImageBitmap(file));
      if (version !== revision) {
        decoded.close();
        return;
      }
      bitmap?.close();
      bitmap = decoded;
      q('imageTransform').reset();
      options.querySelector('[value="'+target.face+'"]').checked=true;
      q('imageTarget').textContent=target.label+' · '+(target.layer?.name??'Dessin de la face');
      q('imageError').textContent='';
      preview.dataset.filename=file.name;
      render();
      dialog.showModal();
    } catch (error) {
      status(error.message);
    }
  };
  q('imageTransform').oninput = ()=>{q('imageError').textContent='';render();};
  q('imageTransform').onsubmit = event => {
    event.preventDefault();
    if (!bitmap) return;
    const targets=mode.value==='strip'?stripFaces:mode.value==='repeat'?chosen():[target.face];
    if(!targets.length){q('imageError').textContent='Choisissez au moins une face.';return;}
    const tile=document.createElement('canvas');
    tile.width=tile.height=512;
    const tileContext=tile.getContext('2d');
    const images=targets.map((face,index)=>{
      tileContext.clearRect(0,0,512,512);
      tileContext.drawImage(preview,mode.value==='strip'?index*512:0,0,512,512,0,0,512,512);
      return {face,image:tile.toDataURL('image/png')};
    });
    const error=apply(images,target,mode.value,(preview.dataset.filename||'Image').slice(0,80),q('importBlend').checked);
    if(error){q('imageError').textContent=error;return;}
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
    const scale = preview.width / preview.getBoundingClientRect().width;
    const offset = (id, delta) => {
      const input = q(id);
      input.value = Math.round(Math.max(-512, Math.min(512, Number(input.value) + delta * scale)));
    };
    offset('importX', event.movementX);
    offset('importY', event.movementY);
    render();
  };
}
