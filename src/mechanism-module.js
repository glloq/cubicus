const collections=['flags','counters','zones','rules','gates','visuals'];

export function selectLogicModule(config, indices) {
  const rules=config.rules.filter((_,index)=>indices.includes(index));
  if(!rules.length)throw Error('Cochez au moins une règle du module.');
  const flags=new Set(),counters=new Set(),zones=new Set();
  for(const rule of rules){
    for(const flag of [rule.set,rule.needs])if(flag)flags.add(flag);
    if(rule.counter)counters.add(rule.counter.id);
    if(rule.zone)zones.add(rule.zone);
    for(const item of rule.when?.items??[]){
      if(item.kind==='flag')flags.add(item.id);
      if(item.kind==='counter')counters.add(item.id);
      if(item.kind==='zone')zones.add(item.id);
    }
  }
  return {
    flags:[...flags],rules,
    counters:config.counters.filter(item=>counters.has(item.id)),
    zones:config.zones.filter(item=>zones.has(item.id)),
    gates:config.gates.filter(item=>flags.has(item.flag)),
    visuals:config.visuals.filter(item=>flags.has(item.flag))
  };
}

export function moduleCubes(module) {
  const ids=new Set();
  function collect(value){
    for(const key of ['cube','other'])if(value[key])ids.add(value[key]);
  }
  for(const rule of module.rules){
    collect(rule);
    for(const item of rule.when?.items??[]){
      collect(item);
      if(['receiver','actor'].includes(item.kind))ids.add(item.id);
    }
  }
  for(const item of [...module.gates,...module.visuals])collect(item);
  return [...ids];
}

export function duplicateLogicModule(config,module,bindings,prefix,offset) {
  if(!/^[a-zA-Z0-9_-]{1,32}$/.test(prefix))throw Error('Indiquez un préfixe de module valide.');
  const local=id=>prefix+'_'+id;
  const target=id=>{
    const mapped=bindings.get(id);
    if(!mapped)throw Error('Raccordez tous les cubes du module.');
    return mapped;
  };
  const mapCubes=item=>({...item,...(item.cube?{cube:target(item.cube)}:{}),...(item.other?{other:target(item.other)}:{})});
  const translated=point=>point.map((value,i)=>value+offset[i]);
  const copied={
    flags:module.flags.map(local),
    counters:module.counters.map(item=>({...item,id:local(item.id)})),
    zones:module.zones.map(item=>({...item,id:local(item.id),from:translated(item.from),to:translated(item.to)})),
    gates:module.gates.map(item=>({...mapCubes(item),flag:local(item.flag)})),
    visuals:module.visuals.map(item=>({...mapCubes(item),flag:local(item.flag)})),
    rules:module.rules.map(rule=>({...mapCubes(rule),
      ...(rule.set?{set:local(rule.set)}:{}),
      ...(rule.needs?{needs:local(rule.needs)}:{}),
      ...(rule.zone?{zone:local(rule.zone)}:{}),
      ...(rule.counter?{counter:{...rule.counter,id:local(rule.counter.id)}}:{}),
      ...(rule.when?{when:{mode:rule.when.mode,items:rule.when.items.map(item=>({...mapCubes(item),
        id:['receiver','actor'].includes(item.kind)?target(item.id):local(item.id)}))}}:{})
    }))
  };
  return {...config,...Object.fromEntries(collections.map(key=>[key,[...config[key],...copied[key]]]))};
}
