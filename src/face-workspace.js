export function bindFaceWorkspace(canvas, {checkpoint, commit, canDraw, stamp, alpha}) {
  const q = id => document.getElementById(id);
  const context = canvas.getContext('2d');
  const viewport = q('paintViewport');
  const surface = q('paintSurface');
  let stroke;
  let zoom = 1;

  const gridSize = () => Math.max(4, Math.min(128, Number(q('gridSize').value) || 32));

  function updateSize() {
    surface.style.width = Math.max(1, viewport.clientWidth - 2) * zoom + 'px';
    surface.style.setProperty('--grid-spacing', 100 * gridSize() / 512 + '%');
    surface.classList.toggle('with-grid', q('showFaceGrid').checked);
    q('faceZoomValue').textContent = Math.round(zoom * 100) + '%';
  }
  new ResizeObserver(updateSize).observe(viewport);
  q('showFaceGrid').onchange = q('gridSize').onchange = updateSize;
  q('faceZoom').oninput = event => {
    const previous = zoom;
    zoom = Number(event.target.value) / 100;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / previous;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / previous;
    updateSize();
    viewport.scrollTo(centerX * zoom - viewport.clientWidth / 2, centerY * zoom - viewport.clientHeight / 2);
  };
  q('faceGuides').onchange=()=>q('paintSurface').classList.toggle('face-guides',q('faceGuides').checked);
  q('fitFace').onclick = () => {
    q('faceZoom').value = 100;
    q('faceZoom').oninput({target: q('faceZoom')});
  };
  const editor = q('faceWorkspace').closest('.face-panel');
  const pan=q('panFace');
  pan.onclick=()=>{
    const enabled=pan.getAttribute('aria-pressed')!=='true';
    pan.setAttribute('aria-pressed',String(enabled));
    viewport.classList.toggle('is-panning',enabled);
  };
  const fullscreen = q('fullFace');
  fullscreen.hidden = typeof editor.requestFullscreen !== 'function';
  fullscreen.onclick = async () => {
    try {
      if (document.fullscreenElement === editor) await document.exitFullscreen();
      else await editor.requestFullscreen();
    } catch {
      fullscreen.textContent = 'Plein écran indisponible';
    }
  };
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement === editor ? 'Quitter le plein écran' : 'Plein écran';
  });

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const step = gridSize();
    const raw = [
      (event.clientX - rect.left) * 512 / rect.width,
      (event.clientY - rect.top) * 512 / rect.height
    ];
    return raw.map(value => Math.max(0, Math.min(512, q('snapFace').checked ? Math.round(value / step) * step : value)));
  }

  function constrain(origin, end, event, tool) {
    if (!event.shiftKey || tool !== 'line') return end;
    const [dx, dy] = end.map((value, index) => value - origin[index]);
    if (Math.abs(dx) > 2 * Math.abs(dy)) return [end[0], origin[1]];
    if (Math.abs(dy) > 2 * Math.abs(dx)) return [origin[0], end[1]];
    const length = Math.min(Math.abs(dx), Math.abs(dy));
    return [origin[0] + Math.sign(dx) * length, origin[1] + Math.sign(dy) * length];
  }

  function draw(end, event) {
    const {tool, start, last, base} = stroke;
    const [x, y] = constrain(start, end, event, tool);
    const [sx, sy] = start;
    if (base) context.putImageData(base, 0, 0);
    context.beginPath();
    switch (tool) {
      case 'rect':
        context.rect(sx, sy, x - sx, y - sy);
        break;
      case 'circle':
        context.arc(sx, sy, Math.hypot(x - sx, y - sy), 0, Math.PI * 2);
        break;
      case 'ellipse':
        context.ellipse((sx + x) / 2, (sy + y) / 2, Math.abs(x - sx) / 2, Math.abs(y - sy) / 2, 0, 0, Math.PI * 2);
        break;
      case 'triangle':
        context.moveTo((sx + x) / 2, sy);
        context.lineTo(x, y);
        context.lineTo(sx, y);
        context.closePath();
        break;
      default:
        context.moveTo(...last);
        context.lineTo(x === last[0] && y === last[1] && !base ? x + 0.01 : x, y);
    }
    if (q('shapeFill').checked && ['rect', 'circle', 'ellipse', 'triangle'].includes(tool)) context.fill();
    context.stroke();
    if (!base) stroke.last = end;
  }

  function reset() {
    stroke = undefined;
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.setLineDash([]);
  }

  canvas.onpointerdown = event => {
    if (event.button === 1 || (event.button === 0 && (event.altKey || pan.getAttribute('aria-pressed')==='true'))) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      stroke = {pan: [event.clientX, event.clientY, viewport.scrollLeft, viewport.scrollTop]};
      return;
    }
    if (event.button !== 0 || !canDraw()) return;
    canvas.setPointerCapture(event.pointerId);
    const start = point(event);
    const tool = q('brush').value;
    checkpoint();
    if (tool === 'stamp') {
      stamp(...start);
      commit();
      return;
    }
    const freehand = tool === 'pen' || tool === 'erase';
    stroke = {tool, start, last: start, base: freehand ? null : context.getImageData(0, 0, 512, 512)};
    context.lineCap = context.lineJoin = 'round';
    context.lineWidth = Number(q('width').value);
    context.globalAlpha = Number(q('drawOpacity').value) / 100;
    context.fillStyle = q('fillColor').value;
    context.strokeStyle = tool === 'erase' ? '#304050' : q('color').value;
    context.globalCompositeOperation = tool === 'erase' && alpha() ? 'destination-out' : 'source-over';
    context.setLineDash(q('dashLine').checked && !freehand ? [12, 8] : []);
    if (freehand) draw(start, event);
  };
  canvas.onpointermove = event => {
    const position = point(event);
    q('paintCoordinates').textContent = position.map(Math.round).join(', ');
    if (stroke?.pan) {
      const [x, y, left, top] = stroke.pan;
      viewport.scrollTo(left + x - event.clientX, top + y - event.clientY);
    } else if (stroke) draw(position, event);
  };
  canvas.onpointerup = event => {
    if (!stroke) return;
    if (stroke.pan) {
      reset();
      return;
    }
    if (stroke.base) draw(point(event), event);
    reset();
    commit();
  };
  canvas.onpointercancel = () => {
    if (stroke?.base) context.putImageData(stroke.base, 0, 0);
    else if (stroke && !stroke.pan) commit();
    reset();
  };
  return {reset};
}
