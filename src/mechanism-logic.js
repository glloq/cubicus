import {validSlot} from './control-rules.js';

const logicName=/^[a-zA-Z0-9_-]{1,40}$/;
const operators=['eq','gte','lte'];
const validNumber=value=>Number.isInteger(value)&&Math.abs(value)<=9999;
const styles=['lamp','reveal','beam'];
const number=value=>{
  if(!validNumber(value))throw Error('Le compteur doit rester entre −9999 et 9999.');
  return value;
};
const name=value=>{
  if(typeof value!=='string'||!logicName.test(value))throw Error('Identifiant de logique invalide.');
  return value;
};
const hex=value=>{
  if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error('Couleur invalide.');
  return value;
};

export function normalizeLogic(list,requireCube,requireFlag,faceIndex) {
  const counters=list('counters',64).map(item=>({id:name(item.id),initial:number(item.initial??0)}));
  const zones=list('zones',64).map(item=>{
    if(!validSlot(item.from)||!validSlot(item.to))throw Error('Les coins de la zone doivent être des cases de la grille.');
    return {id:name(item.id),from:item.from.map((value,i)=>Math.min(value,item.to[i])),
      to:item.to.map((value,i)=>Math.max(value,item.from[i])),...(item.color?{color:hex(item.color)}:{})};
  });
  function references(items,label){
    const ids=new Set(items.map(item=>item.id));
    if(ids.size!==items.length)throw Error(label+' en double.');
    return id=>{if(!ids.has(id))throw Error(label+' absent : '+id);return id;};
  }
  const requireCounter=references(counters,'Compteur'),requireZone=references(zones,'Zone');
  const visuals=list('visuals',64).map(effect=>{
    if(!styles.includes(effect.kind))throw Error('Effet visuel invalide.');
    const result={kind:effect.kind,flag:requireFlag(effect.flag)};
    if(effect.kind!=='beam')result.cube=requireCube(effect.cube);
    if(effect.kind==='reveal')result.face=faceIndex(effect.face);
    else result.color=hex(effect.color);
    return result;
  });
  function condition(raw){
    const result={kind:raw.kind,not:raw.not===true};
    if(raw.kind==='flag')result.id=requireFlag(raw.id);
    else if(raw.kind==='receiver'||raw.kind==='actor')result.id=requireCube(raw.id);
    else if(raw.kind==='zone'){
      result.id=requireZone(raw.id);
      if(raw.cube)result.cube=requireCube(raw.cube);
    }else if(raw.kind==='counter'){
      result.id=requireCounter(raw.id);
      if(!operators.includes(raw.op))throw Error('Comparateur de compteur invalide.');
      result.op=raw.op;
      result.value=number(raw.value);
    }else throw Error('Condition de logique invalide.');
    return result;
  }
  function extendRule(raw,next){
    if(raw.event==='enter'||raw.event==='leave'){
      next.zone=requireZone(raw.zone);
      if(raw.cube)next.cube=requireCube(raw.cube);
    }
    if(raw.when){
      if(!['all','any'].includes(raw.when.mode)||!Array.isArray(raw.when.items)||!raw.when.items.length||raw.when.items.length>12){
        throw Error('Groupe de conditions invalide.');
      }
      next.when={mode:raw.when.mode,items:raw.when.items.map(condition)};
    }
    if(raw.counter){
      if(!['set','add'].includes(raw.counter.op))throw Error('Effet de compteur invalide.');
      next.counter={id:requireCounter(raw.counter.id),op:raw.counter.op,value:number(raw.counter.value)};
    }
    if(!next.set&&!next.counter)throw Error('Choisissez au moins un effet.');
  }
  return {counters,zones,visuals,extendRule};
}

export function occupancyFor(zones,cubes){
  return Object.fromEntries(zones.map(zone=>[zone.id,cubes.filter(cube=>cube.p.every((value,i)=>
    value>=zone.from[i]&&value<=zone.to[i])).map(cube=>cube.id)]));
}

export function matchZone(event,id,cube,previous,current) {
  const before=previous[id]??[], after=current[id]??[];
  const [entered,left]=event==='enter'?[after,before]:[before,after];
  return entered.some(id=>(!cube||cube===id)&&!left.includes(id));
}

export function evaluateCondition({kind,id,cube,op,value,not},active,counters,occupancy,receivers,action) {
  let matched;
  if(kind==='flag')matched=active.has(id);
  else if(kind==='actor')matched=Boolean(action&&[...(action.ids??[]),...(action.otherIds??[])].includes(id));
  else if(kind==='receiver')matched=receivers.has(id);
  else if(kind==='zone')matched=cube?occupancy[id].includes(cube):occupancy[id].length>0;
  else {
    const actual=counters[id];
    matched=op==='eq'?actual===value:op==='gte'?actual>=value:actual<=value;
  }
  return not?!matched:matched;
}

export function applyCounter(counters,{id,op,value}){
  counters[id]=op==='set'?value:Math.max(-9999,Math.min(9999,counters[id]+value));
}

export function remapLogic(config,idMap,flags) {
  const counters=new Map(config.counters.map(({id},i)=>[id,'c'+i]));
  const zones=new Map(config.zones.map(({id},i)=>[id,'z'+i]));
  const rename=({kind,id,cube,...fields})=>({...fields,kind,
    id:(kind==='flag'?flags:['receiver','actor'].includes(kind)?idMap:kind==='zone'?zones:counters).get(id),
    ...(cube?{cube:idMap.get(cube)}:{})});
  return {
    counters:config.counters.map(counter=>({...counter,id:counters.get(counter.id)})),
    zones:config.zones.map(zone=>({...zone,id:zones.get(zone.id)})),
    visuals:config.visuals.map(effect=>({...effect,flag:flags.get(effect.flag),
      ...(effect.cube?{cube:idMap.get(effect.cube)}:{})})),
    remapRule(rule){
      return {
        ...(rule.zone?{zone:zones.get(rule.zone)}:{}),
        ...(rule.when?{when:{mode:rule.when.mode,items:rule.when.items.map(rename)}}:{}),
        ...(rule.counter?{counter:{...rule.counter,id:counters.get(rule.counter.id)}}:{})
      };
    }
  };
}
