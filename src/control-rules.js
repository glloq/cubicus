export const AXES = ['X', 'Y', 'Z'];

export const RULE_FIELDS = {
  camera: {orbit:true, pan:true, zoom:true, perspective:true, orthographic:true, navigation:true, reset:true},
  rotation: {individual:true, simultaneous:true, collective:true, axes:AXES},
  movement: {swap:true, emptySlots:true, groupTranslation:false, cyclicShift:false, axes:AXES},
  selection: {individual:true, line:true, layer:true, multiple:false, definedGroups:true, all:true},
  spacing: {global:true, independentAxes:true, axes:AXES, min:0, max:2, step:.01},
  lighting: {direction:true, shadows:true},
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
      rules[category][key] = typeof fallback === 'boolean'
        ? (typeof value === 'boolean' ? value : fallback && (!legacy || raw?.[off[category]?.[key]] !== false))
        : Array.isArray(fallback) ? normalizeAxes(value, fallback) : range(value, fallback, key === 'step' ? .01 : 0, 2);
    }
  }
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
  return out;
}

export function validSlot(p) {
  return Array.isArray(p) && p.length === 3 && [0,1,2].every(i => Number.isInteger(p[i]) && Math.abs(p[i]) <= 100);
}
