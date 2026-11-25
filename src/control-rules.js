export const AXES = ['X', 'Y', 'Z'];

export const RULE_FIELDS = {
  camera: {orbit:true, pan:true, zoom:true, perspective:true, orthographic:true, navigation:true, roll:false, reset:true, zoomMin:.05, zoomMax:50, near:.05, far:1000},
  rotation: {individual:true, simultaneous:true, collective:true, axes:AXES},
  movement: {swap:true, emptySlots:true, groupTranslation:false, cyclicShift:false, layerSwap:false, groupSwap:false, axes:AXES},
  selection: {individual:true, line:true, layer:true, multiple:false, definedGroups:true, all:true},
  spacing: {global:true, independentAxes:true, axes:AXES, min:0, max:2, step:.01},
  lighting: {direction:true, position:false, intensity:false, angle:false, shadows:true},
  history: {undo:true, redo:true, reset:true}
};

export function normalizeAxes(value, fallback = AXES) {
  return AXES.filter(axis => Array.isArray(value) ? value.includes(axis) : fallback.includes(axis));
}

const range = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function controlRules(raw) {
  const legacy = raw?.version !== 2;
  const off = {
    camera: {orbit:'observe', pan:'observe', navigation:'observe', zoom:'zoom', perspective:'projection', orthographic:'projection'},
    rotation: {individual:'rotate', simultaneous:'rotate', collective:'rotate'},
    movement: {swap:'move', emptySlots:'move'},
    selection: {line:'groups', layer:'groups', all:'groups', definedGroups:'groups'},
    spacing: {global:'spacing', independentAxes:'spacing'},
    lighting: {direction:'light', shadows:'shadows'}
  };
  const rules = {version:2};
  for (const [category, fields] of Object.entries(RULE_FIELDS)) {
    rules[category] = {};
    for (const [key, fallback] of Object.entries(fields)) {
      const value = legacy ? undefined : raw[category]?.[key];
      const alias = off[category]?.[key];
      rules[category][key] = typeof fallback === 'boolean'
        ? (typeof value === 'boolean' ? value : fallback && (!legacy || !alias || raw?.[alias] !== false))
        : Array.isArray(fallback) ? normalizeAxes(value, fallback) : range(value, fallback, category === 'camera' ? .05 : key === 'step' ? .01 : 0, category === 'camera' ? (['near','far'].includes(key) ? 1000 : 50) : 2);
    }
  }
  rules.camera.zoomMax = Math.max(rules.camera.zoomMin,rules.camera.zoomMax);
  rules.camera.far = Math.max(rules.camera.near,rules.camera.far);
  if (rules.spacing.min > rules.spacing.max) rules.spacing.max = rules.spacing.min;
  return rules;
}

export function cubeConstraints(raw) {
  const out = {};
  for (const key of ['fixed','positionLocked','orientationLocked','noSwap','noEmpty','noGroup']) {
    if (raw?.[key] === true) out[key] = true;
  }
  for (const key of ['rotationAxes','movementAxes']) if (Array.isArray(raw?.[key])) out[key] = normalizeAxes(raw[key]);
  if (Array.isArray(raw?.slots)) {
    const unique = new Map();
    for (const p of raw.slots.slice(0,512)) if (validSlot(p)) unique.set(p.join(','), [...p]);
    out.slots = [...unique.values()];
  }
  if (typeof raw?.group === 'string' && raw.group.length <= 80) out.group = raw.group;
  if (out.group && raw.solid === true) out.solid = true;
  if (Array.isArray(raw?.pivot) && raw.pivot.length===3 &&
    [0,1,2].every(i=>Number.isInteger(raw.pivot[i]*2)&&typeof raw.pivot[i]==='number'&&Math.abs(raw.pivot[i])<=100)) out.pivot=[...raw.pivot];
  return out;
}

export function validSlot(p) {
  return Array.isArray(p) && p.length === 3 && [0,1,2].every(i => Number.isInteger(p[i]) && Math.abs(p[i]) <= 100);
}

export const LIGHT_TYPES = ['directional','point','spot'];

export function lightingState(raw) {
  if (!LIGHT_TYPES.includes(raw?.type)) return null;
  const position = Array.isArray(raw.position) && raw.position.length === 3 && [0,1,2].every(i => Number.isFinite(raw.position?.[i]) && Math.abs(raw.position[i]) <= 1000)
    ? raw.position.slice(0,3) : [5,7,5];
  return {type:raw.type,position,
    intensity:range(raw.intensity,2,0,10),
    angle:range(raw.angle,45,5,90)};
}
