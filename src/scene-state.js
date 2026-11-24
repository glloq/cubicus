import {lightingState} from './control-rules.js';
export function initialView(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const vector = (value, length, min, max) => Array.isArray(value) && value.length === length &&
    value.every(coordinate => Number.isFinite(coordinate) && coordinate >= min && coordinate <= max) ? [...value] : null;
  const position = vector(raw.position, 3, -1000, 1000);
  const target = vector(raw.target, 3, -1000, 1000);
  const spacing = vector(raw.spacing, 3, 0, 2);
  const light = vector(raw.light, 2, -90, 360);
  if (!position || !target || !spacing || position.every((coordinate, axis) => coordinate === target[axis]) ||
      !Number.isFinite(raw.zoom) || raw.zoom < .05 || raw.zoom > 50) return null;
  const view = {position, target, spacing, zoom: raw.zoom, orthographic: raw.orthographic === true};
  const up=vector(raw.up,3,-1,1);
  if(up && Math.abs(Math.hypot(...up)-1)<.001) {
    const direction=position.map((coordinate,i)=>coordinate-target[i]);
    const parallel=Math.abs(direction.reduce((sum,value,i)=>sum+value*up[i],0))/Math.hypot(...direction);
    if(parallel<.999) view.up=up;
  }
  if (Number.isFinite(raw.height) && raw.height >= .1 && raw.height <= 1000) view.height = raw.height;
  if (light && light[0] >= 0 && light[1] <= 90) view.light = light;
  const lighting = lightingState(raw.lighting);
  if (lighting) view.lighting = lighting;
  if (typeof raw.shadows === 'boolean') view.shadows = raw.shadows;
  return view;
}

export function captureSceneState(controller) {
  const {view, host, spacing} = controller;
  const q = id => host.querySelector('#' + id);
  return {
    position: view.camera.position.toArray(),
    target: view.orbit.target.toArray(),
    up: view.camera.up.toArray(),
    orthographic: view.camera.isOrthographicCamera === true,
    zoom: view.camera.zoom,
    height: view.orthoHeight,
    spacing: [...spacing],
    light: [+q('az').value, +q('el').value],
    shadows: q('shadows').checked,
    lighting: controller.lightingEquipment()
  };
}

export function applySceneState(controller, raw) {
  const v = initialView(raw);
  if (!v) return;
  const {view, host} = controller;
  const q = id => host.querySelector('#' + id);
  if (Boolean(view.camera.isOrthographicCamera) !== v.orthographic) view.toggleProjection();
  if (v.orthographic && v.height) view.orthoHeight = v.height;
  view.camera.position.fromArray(v.position);
  view.orbit.target.fromArray(v.target);
  view.camera.zoom = Math.max(controller.rules.camera.zoomMin,Math.min(controller.rules.camera.zoomMax,v.zoom));
  view.setCameraUp(v.up ?? [0,1,0]);
  controller.setSpacing(v.spacing);
  controller.applyLighting(v.lighting ?? {type:'directional'});
  if (v.light) {
    [q('az').value, q('el').value] = v.light;
    view.setLight(...v.light);
  }
  if (typeof v.shadows === 'boolean') {
    q('shadows').checked = v.shadows;
    view.setShadows(v.shadows);
  }
  view.resize();
  view.orbit.update();
  controller.draw();
}
