import {applyCounter,evaluateCondition,matchZone,normalizeLogic,occupancyFor,remapLogic} from './mechanism-logic.js';
import {AXES} from './control-rules.js';

export const faces = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const events = ['turn','move','contact','beam','tick','enter','leave'];
const devices = ['emitter','mirror','receiver'];
const flagPattern = /^[a-zA-Z0-9_-]{1,40}$/;
const same = (a,b) => a.every((value,i)=>value===b[i]);
const opposite = a => a.map(value=>-value);
const add = (a,b) => a.map((value,i)=>value+b[i]);
const direction = (cube,face) => [0,1,2].map(i=>faces[face].reduce((sum,value,j)=>sum+cube.r[i*3+j]*value,0));
const validFace = face => Number.isInteger(face)&&face>=0&&face<6;

export function mechanismConfig(raw,cubes) {
  if (!raw) return null;
  if (raw.version!==1) throw Error('Format de mécanismes inconnu.');
  function list(key,limit){
    const values=raw[key]??[];
    if(!Array.isArray(values)||values.length>limit)throw Error('Liste de mécanismes invalide : '+key+'.');
    return values;
  }
  const ids=new Set(cubes.map(cube=>cube.id));
  const flags=list('flags',64).map(id=>{
    if(typeof id!=='string'||!flagPattern.test(id)) throw Error('Nom d’état invalide.');
    return id;
  });
  if(new Set(flags).size!==flags.length)throw Error('États en double.');
  const requireCube=id=>{if(!ids.has(id))throw Error('Un mécanisme référence un cube absent.');return id;};
  const requireFlag=id=>{if(!flags.includes(id))throw Error('Un mécanisme référence un état absent.');return id;};
  const faceIndex=face=>{if(!validFace(face))throw Error('Face de mécanisme invalide.');return face;};
  const gates=list('gates',64).map(gate=>({
    cube:requireCube(gate.cube), flag:requireFlag(gate.flag), positionOnly:gate.positionOnly===true
  }));
  const joins=list('joins',64).map(join=>{
    if(join.cube===join.other)throw Error('Reliez deux cubes distincts.');
    return {cube:requireCube(join.cube),other:requireCube(join.other),face:faceIndex(join.face),otherFace:faceIndex(join.otherFace)};
  });
  const optics=list('optics',64).map(device=>{
    if(!devices.includes(device.kind))throw Error('Dispositif optique invalide.');
    const result={cube:requireCube(device.cube),kind:device.kind,face:faceIndex(device.face)};
    if(device.kind==='emitter'&&device.enabledBy)result.enabledBy=requireFlag(device.enabledBy);
    if(device.kind==='mirror'){
      result.exit=faceIndex(device.exit);
      if(Math.floor(result.face/2)===Math.floor(result.exit/2))throw Error('Un miroir de grille relie deux faces perpendiculaires.');
    }
    return result;
  });
  if(new Set(optics.map(device=>device.cube)).size!==optics.length)throw Error('Un seul dispositif optique par cube.');
  const {extendRule,...logic}=normalizeLogic(list,requireCube,requireFlag,faceIndex);
  const rules=list('rules',128).map(rule=>{
    if(!events.includes(rule.event))throw Error('Événement de mécanisme invalide.');
    const next={event:rule.event};
    if(['contact','beam'].includes(rule.event)||(['turn','move'].includes(rule.event)&&rule.cube))next.cube=requireCube(rule.cube);
    if(rule.set){next.set=requireFlag(rule.set);next.value=rule.value!==false;}
    if(rule.needs)next.needs=requireFlag(rule.needs);
    if(rule.event==='contact')Object.assign(next,{other:requireCube(rule.other),face:faceIndex(rule.face),otherFace:faceIndex(rule.otherFace)});
    if(rule.event==='turn'&&AXES.includes(rule.axis))next.axis=rule.axis;
    if(rule.event==='turn'&&[-1,1].includes(rule.sign))next.sign=rule.sign;
    extendRule(rule,next);
    return next;
  });
  return flags.length||optics.length||joins.length||logic.counters.length||logic.zones.length ? {version:1,flags,gates,optics,rules,joins,...logic} : null;
}

export function remapMechanisms(config,idMap) {
  if(!config)return null;
  const states=new Map(config.flags.map((flag,i)=>[flag,'s'+i]));
  const {remapRule,...logic}=remapLogic(config,idMap,states);
  return {
    version:1, ...logic,
    flags:[...states.values()],
    gates:config.gates.map(gate=>({...gate,cube:idMap.get(gate.cube),flag:states.get(gate.flag)})),
    joins:config.joins.map(join=>({...join,cube:idMap.get(join.cube),other:idMap.get(join.other)})),
    optics:config.optics.map(device=>({...device,cube:idMap.get(device.cube),
      ...(device.enabledBy?{enabledBy:states.get(device.enabledBy)}:{})})),
    rules:config.rules.map(rule=>({...rule,...remapRule(rule),
      ...(rule.cube?{cube:idMap.get(rule.cube)}:{}),...(rule.set?{set:states.get(rule.set)}:{}),
      ...(rule.other?{other:idMap.get(rule.other)}:{}),...(rule.needs?{needs:states.get(rule.needs)}:{})}))
  };
}

export function traceBeams(config,cubes,active=[]) {
  const segments=[];
  const receivers=new Set();
  if(!config?.optics?.length)return {segments,receivers};
  const byId=new Map(cubes.map(cube=>[cube.id,cube]));
  const occupied=new Map(cubes.map(cube=>[cube.p.join(','),cube]));
  const equipment=new Map(config.optics.map(device=>[device.cube,device]));
  for(const source of config.optics.filter(device=>device.kind==='emitter'&&(!device.enabledBy||active.includes(device.enabledBy)))){
    const cube=byId.get(source.cube);
    if(!cube)continue;
    let start=cube.p;
    let ray=direction(cube,source.face);
    const visited=new Set();
    for(let bounce=0;bounce<64;bounce++){
      const token=start.join(',')+'|'+ray.join(',');
      if(visited.has(token))break;
      visited.add(token);
      let next=start;
      let hit;
      for(let step=0;step<201;step++){
        next=add(next,ray);
        if(next.some(value=>Math.abs(value)>100))break;
        hit=occupied.get(next.join(','));
        if(hit)break;
      }
      if(!hit)next=add(start,ray.map(value=>value*3));
      segments.push([start,next]);
      const device=hit&&equipment.get(hit.id);
      if(!device)break;
      const entry=opposite(ray);
      const first=direction(hit,device.face);
      if(device.kind==='receiver'&&same(entry,first))receivers.add(hit.id);
      if(device.kind!=='mirror')break;
      const second=direction(hit,device.exit);
      if(same(entry,first))ray=second;
      else if(same(entry,second))ray=first;
      else break;
      start=next;
    }
  }
  return {segments,receivers};
}

export function mechanismStep(config,cubes,previous=[],action=null) {
  const previousFlags=Array.isArray(previous)?previous:previous.active;
  const active=new Set(previousFlags);
  const beams=traceBeams(config,cubes,previousFlags);
  const counters={...Object.fromEntries((config?.counters??[]).map(counter=>[counter.id,counter.initial])),...previous.counters};
  const occupancy=occupancyFor(config?.zones??[],cubes);
  const journal=[];
  if(!config)return {active:[...active],counters,occupancy,journal,...beams};
  const byId=new Map(cubes.map(cube=>[cube.id,cube]));
  function occurred(rule){
    if(rule.event==='tick')return true;
    if(rule.event==='enter'||rule.event==='leave')return action&&matchZone(rule.event,rule.zone,rule.cube,previous.occupancy??{},occupancy);
    if(rule.event==='beam')return beams.receivers.has(rule.cube);
    if(rule.event==='contact')return faceContact(byId.get(rule.cube),rule.face,byId.get(rule.other),rule.otherFace);
    if(!action||(rule.cube&&![...(action.ids??[]),...(action.otherIds??[])].includes(rule.cube)))return false;
    const turn=action.type==='rotate'||action.type==='collective';
    return rule.event==='move'?!turn:turn&&(!rule.axis||rule.axis===action.axis)&&(!rule.sign||rule.sign===action.sign);
  }
  // Every rule observes the same initial flags and counters, plus the new positions.
  const eligible=config.rules.filter((rule,index)=>{
    if(!occurred(rule))return false;
    const conditions=rule.when?.items.map(item=>evaluateCondition(item,active,counters,occupancy,beams.receivers,action))??[];
    const matched=(!rule.needs||active.has(rule.needs))&&
      (!rule.when||(rule.when.mode==='any'?conditions.some(Boolean):conditions.every(Boolean)));
    journal.push({rule:index+1,matched,conditions});
    return matched;
  });
  for(const rule of eligible){
    if(rule.set){if(rule.value)active.add(rule.set);else active.delete(rule.set);}
    if(rule.counter)applyCounter(counters,rule.counter);
  }
  const next=[...active];
  const output=config.optics.some(device=>device.enabledBy&&active.has(device.enabledBy)!==previousFlags.includes(device.enabledBy))
    ?traceBeams(config,cubes,next):beams;
  return {active:next,counters,occupancy,journal,...output};
}

export function visualEffects(config,cubes,active){
  const visuals=config?.visuals??[];
  if(!visuals.length)return {cubes,lamps:[],beamColor:null};
  const byId=new Map(cubes.map(cube=>[cube.id,cube]));
  const visibility=new Map();
  const lamps=[];
  let beamColor=null;
  for(const effect of visuals){
    if(effect.kind==='reveal'){
      const key=effect.cube+':'+effect.face;
      visibility.set(key,Boolean(visibility.get(key)||active.includes(effect.flag)));
    }else if(active.includes(effect.flag)){
      if(effect.kind==='lamp'&&byId.has(effect.cube))lamps.push({p:byId.get(effect.cube).p,color:effect.color});
      if(effect.kind==='beam')beamColor=effect.color;
    }
  }
  const visibleCubes=visibility.size?cubes.map(cube=>{
    if(![0,1,2,3,4,5].some(face=>visibility.has(cube.id+':'+face)))return cube;
    return {...cube,opacity:[0,1,2,3,4,5].map(face=>visibility.has(cube.id+':'+face)
      ?Number(visibility.get(cube.id+':'+face)):cube.opacity?.[face]??1)};
  }):cubes;
  return {cubes:visibleCubes,lamps,beamColor};
}

function faceContact(a, aFace, b, bFace) {
  if(!a||!b)return false;
  const normal=direction(a,aFace);
  return same(add(a.p,normal),b.p)&&same(direction(b,bFace),opposite(normal));
}

function connectedGroups(joins,cubes) {
  const byId=new Map(cubes.map(cube=>[cube.id,cube]));
  const joined=new Map();
  const original=new Map();
  for(const cube of cubes)if(cube.constraints?.group){
    const group=cube.constraints.group;
    if(!original.has(group))original.set(group,[]);
    original.get(group).push(cube.id);
  }
  for(const join of joins){
    const a=byId.get(join.cube),b=byId.get(join.other);
    if(!faceContact(a,join.face,b,join.otherFace))continue;
    const members=new Set([a.id,b.id]);
    for(const cube of [a,b])for(const id of original.get(cube.constraints?.group)??[])members.add(id);
    for(const id of members)for(const other of joined.get(id)??[])members.add(other);
    for(const id of members)joined.set(id,members);
  }
  const groups=new Map();
  const tokens=new Map();
  for(const [id,members] of joined){
    if(!tokens.has(members))tokens.set(members,Symbol());
    groups.set(id,tokens.get(members));
  }
  return groups;
}

export function gatedCubes(config,cubes,active) {
  if(!config||(!config.gates.length&&!config.joins?.length))return cubes;
  const locks=new Map();
  for(const gate of config.gates)if(!active.includes(gate.flag))locks.set(gate.cube,Boolean(locks.get(gate.cube)||!gate.positionOnly));
  const joins=connectedGroups(config.joins??[],cubes);
  return cubes.map(cube=>{
    const id=cube.id;
    if(!locks.has(id)&&!joins.has(id))return cube;
    return {...cube,constraints:{...cube.constraints,
      ...(joins.has(id)?{group:joins.get(id),solid:true}:{}),
      ...(locks.has(id)?locks.get(id)?{fixed:true}:{positionLocked:true}:{})}};
  });
}
