import {hingeClear} from './hinge-clearance.js';
import {AXES, validSlot} from './control-rules.js';
import {mul, quarter, rotateGroup} from './model.js';

const key = position => position.join(',');
const restriction = cube => cube.constraints ?? {};

export function actionState(cubes, rules, lightType = 'directional') {
  const byId = new Map(cubes.map(cube => [cube.id, cube]));
  const occupied = new Map(cubes.map(cube => [key(cube.p), cube.id]));
  const groups = new Map();
  for (const cube of cubes) {
    const group = restriction(cube).group;
    if (!group) continue;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(cube);
  }
  return {cubes, rules, byId, occupied, groups, lightType};
}

export function selection(state, {id, scope = 'cube', axis = 'X', multiple = []} = {}) {
  const {rules, byId, groups, cubes} = state;
  const active = byId.get(id);
  if (scope === 'all' && rules.selection.all) return cubes.filter(cube => !restriction(cube).noGroup);
  if (scope === 'multiple' && rules.selection.multiple) return cubes.filter(cube => multiple.includes(cube.id) && !restriction(cube).noGroup);
  if (!active) return [];
  if (scope === 'definedGroups' && rules.selection.definedGroups) return (groups.get(restriction(active).group) ?? []).filter(cube => !restriction(cube).noGroup);
  const index = AXES.indexOf(axis);
  if (index >= 0 && ['line','layer'].includes(scope) && rules.selection[scope]) {
    return cubes.filter(cube => !restriction(cube).noGroup && (scope === 'layer'
      ? cube.p[index] === active.p[index] : cube.p.every((coordinate, i) => i === index || coordinate === active.p[i])));
  }
  return rules.selection.individual ? [active] : [];
}

function permittedPosition(cube, position, axes) {
  const limits = restriction(cube);
  if (key(position) === key(cube.p)) return true;
  return !limits.fixed && !limits.positionLocked && validSlot(position)
    && position.every((coordinate, i) => coordinate === cube.p[i] ||
      (axes.includes(AXES[i]) && (!limits.movementAxes || limits.movementAxes.includes(AXES[i]))))
    && (!limits.slots || [cube.p,position].every(value => limits.slots.some(slot => key(slot) === key(value))));
}

function swappedPlacements(first,second) {
  if (!first.length || first.length!==second.length) return null;
  const origin = group => [0,1,2].map(axis=>Math.min(...group.map(cube=>cube.p[axis])));
  const from=origin(first), to=origin(second);
  const delta=to.map((value,i)=>value-from[i]);
  const destination=new Set(second.map(cube=>key(cube.p)));
  const offset=(cube,sign)=>cube.p.map((value,i)=>value+sign*delta[i]);
  if (first.some(cube=>!destination.has(key(offset(cube,1))))) return null;
  return [...first.map(cube=>({id:cube.id,p:offset(cube,1)})),
    ...second.map(cube=>({id:cube.id,p:offset(cube,-1)}))];
}

export function layerSwapAction(state,id,axis,sign) {
  const source=state.byId.get(id);
  const index=AXES.indexOf(axis);
  if(!source||index<0||![-1,1].includes(sign))return null;
  const coordinate=source.p[index];
  const distance=Math.min(...state.cubes.map(cube=>(cube.p[index]-coordinate)*sign).filter(value=>value>0));
  if(!Number.isFinite(distance))return null;
  const ids=state.cubes.filter(cube=>cube.p[index]===coordinate).map(cube=>cube.id);
  const otherIds=state.cubes.filter(cube=>cube.p[index]===coordinate+distance*sign).map(cube=>cube.id);
  return {type:'swapLayers',ids,otherIds,axis};
}

export function groupSwapAction(state,from,to) {
  const a=restriction(state.byId.get(from)??{}).group;
  const b=restriction(state.byId.get(to)??{}).group;
  if(!a||!b||a===b)return null;
  return {type:'swapGroups',ids:state.groups.get(a).map(cube=>cube.id),otherIds:state.groups.get(b).map(cube=>cube.id)};
}

export function previewAction(state, action) {
  const {rules, byId, occupied, groups} = state;
  if (!Array.isArray(action?.ids) || !action.ids.length ||
    (action.otherIds && !Array.isArray(action.otherIds))) return null;
  const ids = new Set([...action.ids,...(action.otherIds??[])]);
  const members = [...ids].map(id => byId.get(id));
  if (!members.length || members.some(cube => !cube)) return null;
  const {axis, sign, type} = action;
  const rotates = ['rotate','collective'].includes(type);
  if (action.scope && !rules.selection[action.scope === 'cube' ? 'individual' : action.scope]) return null;
  if (action.scope === 'cube' && members.length !== 1) return null;
  if (['line','layer','all','definedGroups'].includes(action.scope)) {
    const axes = action.selectionAxis ? [action.selectionAxis] : AXES;
    const exact = axes.some(axis => {
      const canonical = selection(state,{id:members[0].id, scope:action.scope, axis});
      return canonical.length === members.length && canonical.every(cube => ids.has(cube.id));
    });
    if (!exact) return null;
  }
  for (const cube of members) {
    const limits = restriction(cube);
    const group = groups.get(limits.group);
    if (members.length > 1 && limits.noGroup && type !== 'swap') return null;
    if (group?.length > 1 && group.some(item => restriction(item).solid)
      && (!['collective','translate','swapLayers','swapGroups'].includes(type) || !group.every(item => ids.has(item.id)))) return null;
    if (rotates && (limits.fixed || limits.orientationLocked ||
      (limits.rotationAxes && !limits.rotationAxes.includes(axis)))) return null;
  }

  let changes;
  if (rotates) {
    if (!rules.rotation.axes.includes(axis) || ![-1,1].includes(sign)) return null;
    if (type === 'collective') {
      if (!rules.rotation.collective || members.length < 2) return null;
      changes = members.map(cube => ({id:cube.id, p:[...cube.p], r:[...cube.r]}));
      const pivots=members.map(cube=>restriction(cube).pivot);
      const hinge=pivots.find(Boolean);
      if(hinge&&pivots.some(pivot=>!pivot||key(pivot)!==key(hinge)))return null;
      if (!rotateGroup(changes, [...ids], axis, sign, hinge)) return null;
      if(hinge&&!hingeClear(members,hinge,axis,sign,occupied,ids))return null;
    } else {
      if (!(members.length === 1 ? rules.rotation.individual : rules.rotation.simultaneous)) return null;
      changes = members.map(cube => ({id:cube.id, p:cube.p, r:mul(quarter(axis, sign), cube.r)}));
    }
  } else if (type === 'swap') {
    if (!rules.selection.individual || !rules.movement.swap || members.length !== 2 || members.some(cube => restriction(cube).noSwap)) return null;
    changes = members.map((cube, i) => ({id:cube.id, p:members[1-i].p}));
  } else if (type === 'swapGroups' || type === 'swapLayers') {
    const first=action.ids.map(id=>byId.get(id));
    const second=action.otherIds?.map(id=>byId.get(id)) ?? [];
    if(first.length+second.length!==ids.size||!second.length||members.some(cube=>restriction(cube).noSwap))return null;
    if(type==='swapLayers') {
      const index=AXES.indexOf(axis);
      if(!rules.movement.layerSwap||!rules.selection.layer||index<0||!rules.movement.axes.includes(axis)||
        ![first,second].every(layer=>state.cubes.filter(cube=>cube.p[index]===layer[0].p[index]).length===layer.length &&
          layer.every(cube=>cube.p[index]===layer[0].p[index])))return null;
    } else {
      if(!rules.movement.groupSwap||!rules.selection.definedGroups||first.length<2||
        ![first,second].every(group=>groups.get(restriction(group[0]).group)?.length===group.length &&
          group.every(cube=>restriction(cube).group===restriction(group[0]).group)))return null;
    }
    changes=swappedPlacements(first,second);
    if(!changes)return null;
    for(const group of groups.values())if(group.some(cube=>restriction(cube).solid)&&group.some(cube=>ids.has(cube.id))){
      const displacement=new Set(changes.filter(change=>group.some(cube=>cube.id===change.id))
        .map(change=>key(change.p.map((value,i)=>value-byId.get(change.id).p[i]))));
      if(displacement.size!==1)return null;
    }
  } else if (type === 'step' || type === 'translate') {
    if (!AXES.includes(axis) || ![-1,1].includes(sign)) return null;
    if (type === 'step' && (!rules.selection.individual || !rules.movement.emptySlots || members.length !== 1 || restriction(members[0]).noEmpty)) return null;
    if (type === 'translate' && (!rules.movement.groupTranslation || members.length < 2 || members.some(cube => restriction(cube).noEmpty))) return null;
    changes = members.map(cube => ({id:cube.id, p:cube.p.map((value,i) => AXES[i] === axis ? value+sign : value)}));
  } else if (type === 'cycle') {
    if (!rules.movement.cyclicShift || members.length < 2 || !AXES.includes(axis) || ![-1,1].includes(sign)) return null;
    const index = AXES.indexOf(axis);
    if (members.some(cube => restriction(cube).noSwap || cube.p.some((value,i) => i !== index && value !== members[0].p[i]))) return null;
    const ordered = [...members].sort((a,b) => a.p[index]-b.p[index]);
    changes = ordered.map((cube,i) => ({id:cube.id, p:ordered[(i+sign+ordered.length)%ordered.length].p}));
  } else return null;

  const targets = new Set();
  for (const change of changes) {
    const destination = key(change.p);
    if (targets.has(destination) || (occupied.has(destination) && !ids.has(occupied.get(destination)))
      || !permittedPosition(byId.get(change.id), change.p, rotates ? AXES : rules.movement.axes)) return null;
    targets.add(destination);
  }
  return changes;
}

export function applyChanges(state, changes) {
  if (!changes) return false;
  for (const {id,p,r} of changes) {
    const cube = state.byId.get(id);
    cube.p = [...p];
    if (r) cube.r = r;
  }
  return true;
}

export function executeAction(state, action) {
  return applyChanges(state, previewAction(state, action));
}

export function usefulAxes(cubes) {
  return AXES.filter((_, index) => cubes.some(cube => cube.p[index] !== cubes[0]?.p[index]));
}

export function capabilities(state) {
  const {cubes, rules} = state;
  const axes = usefulAxes(cubes);
  const rotation = rules.rotation.axes.length > 0 && (
    rules.rotation.individual && rules.selection.individual && cubes.some(cube =>
      rules.rotation.axes.some(axis => previewAction(state,{type:'rotate', ids:[cube.id], axis, sign:1}))) ||
    cubes.length > 1 && (rules.rotation.simultaneous || rules.rotation.collective)
      && (rules.selection.line || rules.selection.layer || rules.selection.all || rules.selection.multiple || state.groups.size > 0)
      && cubes.filter(cube => !restriction(cube).fixed && !restriction(cube).orientationLocked).length > 1);
  const mobile = cubes.filter(cube => {
    const limits = restriction(cube);
    return !limits.fixed && !limits.positionLocked &&
      rules.movement.axes.some(axis => !limits.movementAxes || limits.movementAxes.includes(axis));
  });
  const move = rules.selection.individual && (rules.movement.swap &&
    mobile.filter(cube => !restriction(cube).noSwap).length >= 2 || rules.movement.emptySlots &&
    mobile.some(cube => !restriction(cube).noEmpty)) ||
    mobile.length >= 2 && (rules.movement.groupTranslation || rules.movement.cyclicShift || rules.movement.layerSwap&&rules.selection.layer || rules.movement.groupSwap&&state.groups.size>1);
  const gapAxes = axes.filter(axis => rules.spacing.axes.includes(axis));
  const spacing = gapAxes.length > 0 && rules.spacing.max > rules.spacing.min
    && (rules.spacing.global || rules.spacing.independentAxes);
  const scopes = ['cube','line','layer','definedGroups','multiple','all'].filter(scope => {
    if (scope === 'cube') return rules.selection.individual;
    if (!rules.selection[scope] || cubes.length <= 1) return false;
    if (scope === 'definedGroups') return [...state.groups.values()].some(group => group.length > 1);
    if (scope === 'line' || scope === 'layer') {
      return AXES.some((_, index) => {
        const seen = new Set();
        return cubes.some(cube => {
          const coordinate = scope === 'line' ? cube.p.filter((_,i) => i !== index).join(',') : cube.p[index];
          if (seen.has(coordinate)) return true;
          seen.add(coordinate);
          return false;
        });
      });
    }
    return true;
  });
  return {rotation, move, spacing, gapAxes, scopes, light:rules.lighting.intensity || (state.lightType !== 'point' && rules.lighting.direction) ||
    (state.lightType !== 'directional' && rules.lighting.position) || (state.lightType === 'spot' && rules.lighting.angle)};
}

export function controlDiagnostics(state,opening) {
  const {rules,cubes,groups}=state;
  const available=capabilities(state);
  const fixed=cubes.filter(cube=>restriction(cube).fixed).length;
  const rotatable=cubes.filter(cube=>!restriction(cube).fixed&&!restriction(cube).orientationLocked &&
    rules.rotation.axes.some(axis=>!restriction(cube).rotationAxes||restriction(cube).rotationAxes.includes(axis))).length;
  const movable=cubes.filter(cube=>!restriction(cube).fixed&&!restriction(cube).positionLocked &&
    rules.movement.axes.some(axis=>!restriction(cube).movementAxes||restriction(cube).movementAxes.includes(axis))).length;
  const tools=[true,available.rotation,available.move,available.spacing,available.light].filter(Boolean).length;
  const errors=[];
  const warnings=[];
  for(const [name,group] of groups)if(group.length>1&&group.some(cube=>restriction(cube).solid)){
    if(group.some(cube=>restriction(cube).noGroup))errors.push('Le groupe solidaire « '+name+' » exclut un de ses membres de la sélection.');
    else if(group.some(cube=>restriction(cube).fixed))warnings.push('Le groupe solidaire « '+name+' » contient un membre fixe.');
  }
  if(cubes.some(cube=>restriction(cube).slots&&!restriction(cube).slots.some(p=>key(p)===key(cube.p)))){
    errors.push('Des cubes occupent des cases absentes de leurs emplacements autorisés.');
  }
  if(opening?.spacing?.some(value=>value<rules.spacing.min||value>rules.spacing.max)) {
    errors.push('La vue initiale publique contient un écartement hors limites.');
  }
  if(rules.movement.swap&&cubes.length<2)warnings.push('La permutation demande au moins deux cubes.');
  if(!rules.rotation.axes.length && (rules.rotation.individual || rules.rotation.collective || rules.rotation.simultaneous))warnings.push('La rotation est activée sans axe autorisé.');
  if(!rules.movement.axes.length&&Object.values(rules.movement).some(value=>value===true))warnings.push('Le déplacement est activé sans axe autorisé.');
  return {available,fixed,rotatable,movable,tools,errors,warnings};
}
