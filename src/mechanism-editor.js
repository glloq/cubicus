import {duplicateLogicModule,moduleCubes,selectLogicModule} from './mechanism-module.js';
import {mechanismConfig,traceBeams} from './mechanisms.js';

export const emptyMechanisms = () => ({version:1,flags:[],rules:[],gates:[],optics:[],joins:[],counters:[],zones:[],visuals:[]});

export function bindMechanismEditor({read,write,cubes,template,record,verify,clearProof,proofLength,status}) {
  const q=id=>document.getElementById(id);
  const fill=(id,options)=>{
    const input=q(id), previous=input.value;
    input.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
    if(options.some(([value])=>String(value)===previous))input.value=previous;
  };
  let draft=[];
  let editingIndex=null;
  const moduleSelection=new Set();
  let module;
  function clearModule(){
    moduleSelection.clear();
    module=undefined;
    q('moduleBindings').replaceChildren();
    q('duplicateModule').disabled=true;
  }
  const cubeOptions=()=>cubes().map((cube,i)=>[cube.id,'Cube '+(i+1)+' · '+cube.p.join(', ')]);
  const named=entries=>(entries??[]).map(({id})=>[id,id]);
  function conditionTargets(){
    const cfg=read();
    const kind=q('conditionKind').value;
    const options={
      flag:cfg.flags.map(id=>[id,id]),counter:named(cfg.counters),zone:named(cfg.zones),
      receiver:cubeOptions().filter(([id])=>cfg.optics.some(device=>device.kind==='receiver'&&device.cube===id)),
      actor:cubeOptions()
    };
    fill('conditionTarget',options[kind]);
    q('conditionCubeField').hidden=kind!=='zone';
    q('conditionNumberFields').hidden=kind!=='counter';
  }
  function showDraft(){
    const list=q('conditionDraft');
    list.replaceChildren(...draft.map((item,index)=>{
      const row=document.createElement('li');
      const cubes=new Map(cubeOptions());
      const target=cubes.get(item.id)??item.id;
      const suffix=item.op?' '+({eq:'=',gte:'≥',lte:'≤'}[item.op])+' '+item.value:item.cube?' · '+(cubes.get(item.cube)??'Cube absent'):'';
      const label=q('conditionKind').querySelector('[value="'+item.kind+'"]').textContent;
      row.textContent=(item.not?'NON · ':'')+label+' · '+target+suffix+' ';
      const remove=document.createElement('button');
      remove.textContent='Retirer';
      remove.onclick=()=>{draft.splice(index,1);showDraft();};
      row.append(remove);
      return row;
    }));
  }
  function loadDraft(rule={},index=null){
    editingIndex=index;
    for(const [field,value] of Object.entries({
      ruleEvent:rule.event??'turn',ruleCube:rule.cube??'',ruleZone:rule.zone??q('ruleZone').value,
      ruleOther:rule.other??q('ruleOther').value,ruleFace:rule.face??0,ruleOtherFace:rule.otherFace??0,
      ruleAxis:rule.axis??'',ruleSign:rule.sign??0,ruleNeeds:rule.needs??'',ruleSet:rule.set??'',
      conditionMode:rule.when?.mode??'all',ruleCounter:rule.counter?.id??'',
      ruleCounterOp:rule.counter?.op??'add',ruleCounterValue:rule.counter?.value??1
    }))q(field).value=value;
    q('ruleValue').checked=rule.value!==false;
    q('ruleEvent').onchange();
    draft=structuredClone(rule.when?.items??[]);
    showDraft();
    q('addRule').textContent=index===null?'Ajouter la règle':'Enregistrer la règle';
  }
  function validateAndWrite(next){
    try{
      const clean=mechanismConfig(next,cubes())??emptyMechanisms();
      clearModule();
      write(clean);
      refresh();
      return true;
    }catch(error){status(error.message);return false;}
  }
  function refresh(){
    const list=cubeOptions();
    const flags=read().flags.map(flag=>[flag,flag]);
    for(const id of ['ruleOther','gateCube','deviceCube','joinCube','joinOther','visualCube'])fill(id,list);
    for(const id of ['ruleCube','conditionCube'])fill(id,[['','Tous'],...list]);
    for(const id of ['gateFlag','visualFlag'])fill(id,flags);
    fill('ruleSet',[['','Aucun effet sur un état'],...flags]);
    fill('ruleCounter',[['','Aucun effet sur un compteur'],...named(read().counters)]);
    fill('ruleZone',named(read().zones));
    for(const id of ['ruleNeeds','deviceFlag'])fill(id,[['','Toujours'],...flags]);
    for(const id of ['ruleFace','ruleOtherFace','deviceFace','deviceExit','joinFace','joinOtherFace','visualFace'])if(!q(id).options.length){
      fill(id,['+X','−X','+Y','−Y','+Z','−Z'].map((face,i)=>[i,face]));
    }
    conditionTargets();
    showDraft();
    const names=new Map(list);
    const name=id=>names.get(id)??'Cube absent';
    const cfg=read();
    const output=q('mechanismList');
    output.replaceChildren();
    for(const [key,items] of Object.entries({flags:cfg.flags,rules:cfg.rules,gates:cfg.gates,optics:cfg.optics,joins:cfg.joins??[],counters:cfg.counters??[],zones:cfg.zones??[],visuals:cfg.visuals??[]})){
      items.forEach((item,index)=>{
        const row=document.createElement('li');
        if(key==='flags')row.textContent='État '+item+' ';
        if(key==='rules'){
          const label=q('ruleEvent').querySelector('[value="'+item.event+'"]').textContent;
          row.textContent=label+' · '+(item.cube?name(item.cube):item.zone??'Tous')+
            ' → '+[item.set,item.counter?.id].filter(Boolean).join(' · ')+' ';
          const checkbox=document.createElement('input');
          checkbox.type='checkbox';
          checkbox.checked=moduleSelection.has(index);
          checkbox.setAttribute('aria-label','Inclure la règle '+(index+1)+' dans le module');
          checkbox.onchange=()=>{
            if(checkbox.checked)moduleSelection.add(index);
            else moduleSelection.delete(index);
            module=undefined;
            q('moduleBindings').replaceChildren();
            q('duplicateModule').disabled=true;
          };
          row.prepend(checkbox);
        }
        if(key==='counters')row.textContent='Compteur '+item.id+' · '+item.initial+' ';
        if(key==='zones')row.textContent='Zone '+item.id+' · '+item.from.join(',')+' à '+item.to.join(',')+' ';
        if(key==='visuals')row.textContent=q('visualKind').querySelector('[value="'+item.kind+'"]').textContent+' · '+item.flag+' ';
        if(key==='gates')row.textContent='Verrou · '+name(item.cube)+' · '+item.flag+' ';
        if(key==='joins')row.textContent='Connecteur · '+name(item.cube)+' / '+name(item.other)+' ';
        if(key==='optics')row.textContent=q('deviceKind').querySelector('[value="'+item.kind+'"]').textContent+' · '+name(item.cube)+' ';
        const remove=document.createElement('button');
        remove.textContent='Retirer';
        remove.onclick=()=>{
          const next=structuredClone(read());
          const removed=next[key].splice(index,1)[0];
          if(key==='flags'){
            next.rules=next.rules.filter(rule=>rule.set!==removed&&rule.needs!==removed&&
              !rule.when?.items.some(item=>item.kind==='flag'&&item.id===removed));
            next.gates=next.gates.filter(gate=>gate.flag!==removed);
            next.optics=next.optics.filter(device=>device.enabledBy!==removed);
            next.visuals=next.visuals.filter(effect=>effect.flag!==removed);
          }
          if(validateAndWrite(next))loadDraft();
        };
        if(key==='rules')for(const [label,edit] of [['Modifier',true],['Réutiliser',false]]){
          const button=document.createElement('button');
          button.textContent=label;
          button.onclick=()=>{
            q('ruleEditor').open=true;
            q('advancedConditions').open=Boolean(item.when||item.counter);
            loadDraft(item,edit?index:null);
            q('ruleEvent').focus();
          };
          row.append(button);
        }
        if(key==='rules')for(const [delta,label] of [[-1,'Monter'],[1,'Descendre']]){
          const target=index+delta;
          const move=document.createElement('button');
          move.textContent=label;
          move.disabled=target<0||target>=items.length;
          move.onclick=()=>{
            const next=structuredClone(read());
            [next.rules[index],next.rules[target]]=[next.rules[target],next.rules[index]];
            if(validateAndWrite(next))loadDraft();
          };
          row.append(move);
        }
        row.append(remove);
        output.append(row);
      });
    }
    const receiverCount=cfg.optics.filter(device=>device.kind==='receiver').length;
    const optics=traceBeams(cfg,cubes(),cfg.flags);
    q('opticalReport').textContent=cfg.optics.length?
      optics.receivers.size+' / '+receiverCount+' capteurs éclairés · '+optics.segments.length+' segments visibles dans la scène':'';
    q('proofCount').textContent=proofLength()+' actions privées';
  }
  function append(key,item){
    const next=structuredClone(read());
    (next[key]??=[]).push(item);
    return validateAndWrite(next);
  }
  q('ruleEvent').onchange=()=>{
    const event=q('ruleEvent').value;
    q('ruleCubeField').hidden=event==='tick';
    q('ruleZoneField').hidden=!['enter','leave'].includes(event);
    q('contactFields').hidden=q('ruleEvent').value!=='contact';
    q('rotationFields').hidden=q('ruleEvent').value!=='turn';
  };
  q('deviceKind').onchange=()=>{
    q('mirrorFields').hidden=q('deviceKind').value!=='mirror';
    q('emitterFields').hidden=q('deviceKind').value!=='emitter';
  };
  q('addFlag').onclick=()=>{append('flags',q('flagName').value.trim());};
  q('addGate').onclick=()=>append('gates',{cube:q('gateCube').value,flag:q('gateFlag').value,positionOnly:q('gatePosition').checked});
  q('conditionKind').onchange=conditionTargets;
  q('addCondition').onclick=()=>{
    const kind=q('conditionKind').value;
    const id=q('conditionTarget').value;
    if(!id||draft.length>=12){status('Choisissez une cible et limitez la règle à 12 conditions.');return;}
    draft.push({kind,id,not:q('conditionNot').checked,
      ...(kind==='counter'?{op:q('conditionOp').value,value:Number(q('conditionValue').value)}:{}),
      ...(kind==='zone'&&q('conditionCube').value?{cube:q('conditionCube').value}:{})});
    showDraft();
  };
  q('resetRuleDraft').onclick=()=>loadDraft();
  q('addRule').onclick=()=>{
    const rule={
      event:q('ruleEvent').value,cube:q('ruleCube').value,set:q('ruleSet').value,zone:q('ruleZone').value,
      needs:q('ruleNeeds').value,value:q('ruleValue').checked,axis:q('ruleAxis').value,sign:Number(q('ruleSign').value),
      other:q('ruleOther').value,face:Number(q('ruleFace').value),otherFace:Number(q('ruleOtherFace').value)
    };
    if(draft.length)rule.when={mode:q('conditionMode').value,items:draft};
    if(q('ruleCounter').value)rule.counter={id:q('ruleCounter').value,op:q('ruleCounterOp').value,value:Number(q('ruleCounterValue').value)};
    if(editingIndex===null){if(append('rules',rule))loadDraft();return;}
    const next=structuredClone(read());
    next.rules[editingIndex]=rule;
    if(validateAndWrite(next))loadDraft();
  };
  q('addCounter').onclick=()=>append('counters',{id:q('counterName').value.trim(),initial:Number(q('counterInitial').value)});
  q('addZone').onclick=()=>{
    const point=id=>q(id).value.split(',').map(value=>value.trim()?Number(value):NaN);
    append('zones',{id:q('zoneName').value.trim(),from:point('zoneFrom'),to:point('zoneTo'),
      ...(q('zoneVisible').checked?{color:q('zoneColor').value}:{})});
  };
  q('visualKind').onchange=()=>{
    q('visualCubeField').hidden=q('visualKind').value==='beam';
    q('visualFaceField').hidden=q('visualKind').value!=='reveal';
    q('visualColorField').hidden=q('visualKind').value==='reveal';
  };
  q('addVisual').onclick=()=>append('visuals',{kind:q('visualKind').value,flag:q('visualFlag').value,
    cube:q('visualCube').value,face:Number(q('visualFace').value),color:q('visualColor').value});
  q('addJoin').onclick=()=>append('joins',{cube:q('joinCube').value,other:q('joinOther').value,
    face:Number(q('joinFace').value),otherFace:Number(q('joinOtherFace').value)});
  q('addDevice').onclick=()=>append('optics',{kind:q('deviceKind').value,cube:q('deviceCube').value,
    face:Number(q('deviceFace').value),exit:Number(q('deviceExit').value),enabledBy:q('deviceFlag').value});
  q('prepareModule').onclick=()=>{
    try{
      module=selectLogicModule(read(),[...moduleSelection]);
      const options=cubeOptions();
      const names=new Map(options);
      q('moduleBindings').replaceChildren(...moduleCubes(module).map(id=>{
        const label=document.createElement('label');
        label.textContent=(names.get(id)??'Cube absent')+' → ';
        const select=document.createElement('select');
        select.dataset.source=id;
        select.replaceChildren(...options.map(([value,name])=>new Option(name,value)));
        select.value=id;
        label.append(select);
        return label;
      }));
      q('duplicateModule').disabled=false;
    }catch(error){status(error.message);}
  };
  q('duplicateModule').onclick=()=>{
    if(!module)return;
    try{
      const offset=q('moduleOffset').value.split(',').map(value=>value.trim()?Number(value):NaN);
      if(offset.length!==3||!offset.every(Number.isInteger))throw Error('Indiquez trois décalages entiers.');
      const bindings=new Map([...q('moduleBindings').querySelectorAll('select')].map(input=>[input.dataset.source,input.value]));
      const next=duplicateLogicModule(read(),module,bindings,q('modulePrefix').value.trim(),offset);
      if(validateAndWrite(next))status('Module dupliqué.');
    }catch(error){status(error.message);}
  };
  q('loadMechanismTemplate').onclick=()=>{
    if(confirm('Remplacer l’assemblage et ses règles par ce modèle ?'))template(q('mechanismTemplate').value);
  };
  q('recordProof').onclick=()=>{q('recordProof').setAttribute('aria-pressed',String(record()));};
  q('verifyProof').onclick=verify;
  q('clearProof').onclick=()=>{clearProof();refresh();};
  return {refresh,resetDraft(){clearModule();loadDraft();},stop(){q('recordProof').setAttribute('aria-pressed','false');}};
}
