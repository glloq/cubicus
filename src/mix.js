import {controlRules} from './control-rules.js';
import {actionState, applyChanges, groupSwapAction, layerSwapAction, previewAction, selection} from './control-actions.js';

export function seededRandom(seed) {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.codePointAt(0), 16777619);
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let result = Math.imul(value ^ value >>> 15,value | 1);
    result ^= result + Math.imul(result ^ result >>> 7,result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export function mixPuzzle(cubes, controls, {positions = true, rotations = true, steps = 20, axes = 'XYZ', ids, random = Math.random} = {}) {
  const rules = controlRules(controls);
  const rotateAxes = rules.rotation.axes.filter(axis => axes.includes(axis));
  const count = Math.max(1,Math.min(200,Math.floor(Number(steps)) || 1));
  const allowed = ids ? new Set(ids) : null;
  const pool = cubes.filter(cube => !allowed || allowed.has(cube.id));
  const pick = length => Math.floor(random()*length);
  let executed = 0;
  for (; executed < count; executed++) {
    const state = actionState(cubes,rules);
    const find = action => previewAction(state,action);
    const first = pick(pool.length);
    const firstAxis = pick(rotateAxes.length);
    const sign = random() < .5 ? -1 : 1;
    const swapFirst = positions && (!rotations || random() < .5);
    function tryRotations() {
      if (!rotations || !rotateAxes.length) return null;
      for (let i = 0; i < pool.length; i++) {
        const id = pool[(first+i)%pool.length].id;
        for (let j = 0; j < rotateAxes.length; j++) {
          const axis = rotateAxes[(firstAxis+j)%rotateAxes.length];
          if (rules.selection.individual) {
            const changes = find({type:'rotate',ids:[id],axis,sign,scope:'cube'});
            if (changes) return changes;
          }
          for (const scope of ['definedGroups','line','layer','all','multiple']) {
            if (!rules.selection[scope]) continue;
            for (const selectionAxis of ['X','Y','Z']) {
              const members = selection(state,{id,scope,axis:selectionAxis,multiple:pool.map(cube=>cube.id)});
              if (members.length < 2 || members.some(cube=>allowed&&!allowed.has(cube.id))) continue;
              const group = members.map(cube=>cube.id);
              for (const type of ['collective','rotate']) for (const direction of [sign,-sign]) {
                const changes = find({type,ids:group,axis,sign:direction,scope});
                if (changes) return changes;
              }
            }
          }
        }
      }
      return null;
    }
    function trySwaps() {
      if (!positions || !rules.movement.swap || !rules.selection.individual) return null;
      for (let i = 0; i < pool.length; i++) for (let offset = 1; offset < pool.length; offset++) {
        const a = (first+i)%pool.length;
        const b = (a+offset)%pool.length;
        const changes = find({type:'swap',ids:[pool[a].id,pool[b].id]});
        if (changes) return changes;
      }
      return null;
    }
    function tryOtherMoves() {
      if (!positions) return null;
      const options=rules.movement;
      if (![options.emptySlots,options.groupTranslation,options.cyclicShift,options.layerSwap,options.groupSwap].some(Boolean)) return null;
      const within=action=>action && (!allowed || [...action.ids,...(action.otherIds??[])].every(id=>allowed.has(id)));
      const attempt=action=>within(action) ? find(action) : null;
      for(let i=0;i<pool.length;i++){
        const id=pool[(first+i)%pool.length].id;
        for(const axis of options.axes)for(const direction of [sign,-sign]){
          const step=attempt({type:'step',ids:[id],axis,sign:direction});
          if(step)return step;
          if(options.layerSwap){
            const layer=attempt(layerSwapAction(state,id,axis,direction));
            if(layer)return layer;
          }
          if(!options.groupTranslation&&!options.cyclicShift)continue;
          for(const scope of ['definedGroups','line','layer','all','multiple']){
            if(!rules.selection[scope])continue;
            for(const selectionAxis of ['X','Y','Z']){
              const members=selection(state,{id,scope,axis:selectionAxis,multiple:pool.map(cube=>cube.id)});
              const ids=members.map(cube=>cube.id);
              for(const type of ['translate','cycle']){
                const changes=attempt({type,ids,axis,sign:direction,scope,selectionAxis});
                if(changes)return changes;
              }
            }
          }
        }
        if(options.groupSwap)for(const candidate of state.groups.values()){
          const changes=attempt(groupSwapAction(state,id,candidate[0].id));
          if(changes)return changes;
        }
      }
      return null;
    }
    const changes = swapFirst ? trySwaps() ?? tryOtherMoves() ?? tryRotations() : tryRotations() ?? trySwaps() ?? tryOtherMoves();
    if (!changes) break;
    applyChanges(state,changes);
  }
  return executed;
}
