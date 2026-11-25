import {templateInstructions} from './mechanism-templates.js';
import {duplicateLogicModule,moduleCubes,selectLogicModule} from './mechanism-module.js';
import {mechanismConfig,traceBeams} from './mechanisms.js';

export const emptyMechanisms = () => ({version:1,flags:[],rules:[],gates:[],optics:[],joins:[],counters:[],zones:[],visuals:[]});

export function bindMechanismEditor({read,write,cubes,selected,template,pickCube,highlightCube,record,verify,clearProof,proofLength,status}) {
  const q=id=>document.getElementById(id);
  const fill=(id,options)=>{
    const input=q(id), previous=input.value;
    input.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
    if(options.some(([value])=>String(value)===previous))input.value=previous;
  };
  let draft=[];
  let editingIndex=null;
  const dialog=q('ruleEditor');
  const stepNames=['Événement','Conditions','Effets'];
  let step=0;
  let quick=false;
  function error(message){
    if(dialog.open)q('ruleError').textContent=message;
    else status(message);
  }
  function preview(){
    const label=id=>q(id).selectedOptions[0]?.textContent??'';
    const effect=q('ruleNewFlag').value.trim()||q('ruleSet').value;
    const counter=q('ruleCounter').value;
    const when=label('ruleEvent');
    const cube=q('ruleCubeField').hidden?'':label('ruleCube');
    const zone=q('ruleZoneField').hidden?'':label('ruleZone');
    const required=q('ruleNeeds').value;
    const group=draft.length?draft.length+' condition'+(draft.length>1?'s':'')+' ('+(q('conditionMode').value==='all'?'ET':'OU')+')':null;
    const results=[
      effect?(q('ruleValue').checked?'Activer ':'Désactiver ')+effect:'',
      counter?'Modifier '+counter:'',
      q('ruleGateTarget').value?'Déverrouiller '+label('ruleGateTarget'):''
    ].filter(Boolean);
    q('rulePreview').textContent=[[when,cube,zone].filter(Boolean).join(' · '),required?'État requis : '+required:'',group,results.join(' · ')].filter(Boolean).join(' → ');
  }
  function showStep(index,focus=true){
    step=index;
    q('ruleStepLabel').textContent=stepNames[index]+' · '+(quick?(index===0?'1 / 2':'2 / 2'):(index+1)+' / '+stepNames.length);
    for(const section of dialog.querySelectorAll('[data-rule-step]'))section.hidden=Number(section.dataset.ruleStep)!==index;
    q('previousRuleStep').hidden=index===0;
    q('nextRuleStep').hidden=index===2;
    q('addRule').hidden=index!==2;
    q('ruleError').textContent='';
    preview();
    if(focus)[...dialog.querySelectorAll('[data-rule-step="'+index+'"] :is(select,input)')].find(input=>!input.closest('[hidden]'))?.focus();
  }
  function openEditor(rule,index,shortcut=false){
    quick=shortcut;
    loadDraft(rule,index);
    q('ruleEditorTitle').textContent=shortcut?'Créer un verrou par rotation':index===null?'Créer une règle':'Modifier la règle';
    q('ruleEventField').hidden=shortcut;
    q('customRuleEffects').hidden=shortcut;
    q('ruleCubeLabel').textContent=shortcut?'Cube à tourner':'Cube';
    q('ruleGateLabel').textContent=shortcut?'Cube à libérer':'Déverrouiller un cube quand cet état est actif';
    if(shortcut){
      let number=1;
      while(read().flags.includes('verrou_'+number))number++;
      q('ruleNewFlag').value='verrou_'+number;
      q('ruleGateTarget').value=cubeOptions().find(([id])=>id!==q('ruleCube').value)?.[0]??'';
    }
    if(!dialog.open)dialog.showModal();
    showStep(0);
  }
  const moduleSelection=new Set();
  let module;
  function clearModule(){
    moduleSelection.clear();
    module=undefined;
    q('moduleBindings').replaceChildren();
    q('duplicateModule').disabled=true;
  }
  const cubeOptions=()=>cubes().map((cube,i)=>[cube.id,cube.name||'Cube '+(i+1)]);
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
      remove.onclick=()=>{draft.splice(index,1);showDraft();preview();};
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
    q('ruleNewFlag').value='';
    q('ruleGateTarget').value='';
    q('addRule').textContent='Enregistrer la règle';
    preview();
  }
  function validateAndWrite(next){
    try{
      const clean=mechanismConfig(next,cubes())??emptyMechanisms();
      clearModule();
      write(clean);
      refresh();
      return true;
    }catch(failure){error(failure.message);return false;}
  }
  function conditionText(item,name){
    const targets={flag:'État actif',counter:'Compteur',zone:'Zone occupée',receiver:'Capteur éclairé',actor:'Cube manipulé'};
    const label=['receiver','actor'].includes(item.kind)?name(item.id):item.id;
    const detail=item.kind==='counter'?' '+({eq:'=',gte:'≥',lte:'≤'}[item.op])+' '+item.value:
      item.cube?' par '+name(item.cube):'';
    return (item.not?'NON · ':'')+targets[item.kind]+' '+label+detail;
  }
  function describe(rule,name){
    const event=q('ruleEvent').querySelector('[value="'+rule.event+'"]').textContent;
    const subject=rule.cube?name(rule.cube):rule.zone;
    const gates=rule.value?read().gates.filter(gate=>gate.flag===rule.set):[];
    const effect=[rule.set?(rule.value?'active ':'désactive ')+rule.set:'',
      ...gates.map(gate=>'libère '+name(gate.cube)),rule.counter?'modifie '+rule.counter.id:''].filter(Boolean).join(', ');
    return [subject?event+' · '+subject:event,effect].filter(Boolean).join(' → ');
  }
  function report(entries){
    const names=new Map(cubeOptions());
    const name=id=>names.get(id)??'Cube absent';
    return entries.map(entry=>{
      const rule=read().rules[entry.rule-1];
      if(!rule)return '';
      const blocked=rule.when?.items.filter((item,index)=>!entry.conditions[index]).map(item=>conditionText(item,name))??[];
      if(entry.requiredMissing&&rule.needs)blocked.unshift('État requis '+rule.needs);
      return describe(rule,name)+' · '+(entry.matched?'Déclenchée':'Bloquée'+(blocked.length?' · '+blocked.join(' ; '):''));
    }).filter(Boolean);
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
    fill('ruleGateTarget',[['','Aucun cube'],...list]);
    for(const id of ['ruleNeeds','deviceFlag'])fill(id,[['','Toujours'],...flags]);
    for(const id of ['ruleFace','ruleOtherFace','deviceFace','deviceExit','joinFace','joinOtherFace','visualFace'])if(!q(id).options.length){
      fill(id,['Droite (+X)','Gauche (−X)','Haut (+Y)','Bas (−Y)','Avant (+Z)','Arrière (−Z)'].map((face,i)=>[i,face]));
    }
    conditionTargets();
    showDraft();
    const names=new Map(list);
    const name=id=>names.get(id)??'Cube absent';
    const cfg=read();
    q('templateDescription').textContent=templateInstructions[q('mechanismTemplate').value]??'';
    const filter=q('mechanismFilter').value;
    const output=q('mechanismList');
    output.replaceChildren();
    for(const [key,items] of Object.entries({flags:cfg.flags,rules:cfg.rules,gates:cfg.gates,optics:cfg.optics,joins:cfg.joins??[],counters:cfg.counters??[],zones:cfg.zones??[],visuals:cfg.visuals??[]})){
      const category=key==='rules'?'rules':['flags','counters','zones'].includes(key)?'components':'effects';
      if(filter!=='all'&&filter!==category)continue;
      items.forEach((item,index)=>{
        const row=document.createElement('li');
        if(key==='flags')row.textContent='État '+item+' ';
        if(key==='rules'){
          const sentence=document.createElement('strong');
          sentence.textContent=describe(item,name);
          row.append(sentence);
          const group=item.when?.items.map(condition=>conditionText(condition,name)).join(item.when.mode==='any'?' OU ':' ET ');
          const conditions=[item.needs?'État requis '+item.needs:'',group].filter(Boolean).join(' ET ');
          if(conditions){
            const detail=document.createElement('p');
            detail.textContent=conditions;
            row.append(detail);
          }
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
        if(key==='rules'){
          const edit=document.createElement('button');
          edit.textContent='Modifier';
          edit.onclick=()=>openEditor(item,index);
          const more=document.createElement('details');
          const toggle=document.createElement('summary');
          toggle.textContent='Autres actions';
          more.append(toggle);
          const reuse=document.createElement('button');
          reuse.textContent='Réutiliser';
          reuse.onclick=()=>openEditor(item,null);
          more.append(reuse);
          for(const [delta,label] of [[-1,'Monter'],[1,'Descendre']]){
            const target=index+delta;
            const move=document.createElement('button');
            move.textContent=label;
            move.disabled=target<0||target>=items.length;
            move.onclick=()=>{
              const next=structuredClone(read());
              [next.rules[index],next.rules[target]]=[next.rules[target],next.rules[index]];
              if(validateAndWrite(next))loadDraft();
            };
            more.append(move);
          }
          more.append(remove);
          row.append(edit,more);
        }else row.append(remove);
        output.append(row);
      });
    }
    q('mechanismEmpty').textContent=output.children.length?'':'Aucun élément dans cette vue.';
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
    q('pickRuleCube').hidden=event==='tick';
    q('ruleZoneField').hidden=!['enter','leave'].includes(event);
    q('contactFields').hidden=q('ruleEvent').value!=='contact';
    q('rotationFields').hidden=event!=='turn';
    preview();
  };
  q('deviceKind').onchange=()=>{
    q('mirrorFields').hidden=q('deviceKind').value!=='mirror';
    q('emitterFields').hidden=q('deviceKind').value!=='emitter';
  };
  q('addFlag').onclick=()=>{append('flags',q('flagName').value.trim());};
  q('addGate').onclick=()=>append('gates',{cube:q('gateCube').value,flag:q('gateFlag').value,positionOnly:q('gatePosition').checked});
  q('newRule').onclick=()=>openEditor({cube:selected()},null);
  q('quickUnlock').onclick=()=>{
    if(cubes().length<2){status('Ajoutez un deuxième cube pour créer un verrou.');return;}
    openEditor({event:'turn',cube:selected()||cubes()[0].id},null,true);
  };
  q('mechanismFilter').onchange=refresh;
  q('mechanismTemplate').onchange=()=>{q('templateDescription').textContent=templateInstructions[q('mechanismTemplate').value]??'';};
  q('conditionKind').onchange=conditionTargets;
  q('closeRuleEditor').onclick=q('resetRuleDraft').onclick=()=>dialog.close();
  q('previousRuleStep').onclick=()=>showStep(quick?0:step-1);
  q('nextRuleStep').onclick=()=>{
    const event=q('ruleEvent').value;
    if(step===0&&(['contact','beam'].includes(event)&&!q('ruleCube').value||
      ['enter','leave'].includes(event)&&!q('ruleZone').value||quick&&!q('ruleCube').value)){
      error('Choisissez le cube ou la zone qui déclenche la règle.');
      return;
    }
    showStep(quick?2:step+1);
  };
  for(const [button,field] of [['pickRuleCube','ruleCube'],['pickGateCube','ruleGateTarget']]){
    q(button).onclick=()=>{
      dialog.close();
      pickCube(id=>{
        dialog.showModal();
        if(id)q(field).value=id;
        showStep(step);
      });
    };
    q(field).onchange=()=>highlightCube(q(field).value);
  }
  dialog.addEventListener('close',()=>highlightCube(''));
  dialog.oninput=()=>{
    q('ruleError').textContent='';
    preview();
  };
  q('addCondition').onclick=()=>{
    const kind=q('conditionKind').value;
    const id=q('conditionTarget').value;
    if(!id||draft.length>=12){error('Choisissez une cible et limitez la règle à 12 conditions.');return;}
    draft.push({kind,id,not:q('conditionNot').checked,
      ...(kind==='counter'?{op:q('conditionOp').value,value:Number(q('conditionValue').value)}:{}),
      ...(kind==='zone'&&q('conditionCube').value?{cube:q('conditionCube').value}:{})});
    showDraft();
    preview();
  };
  q('addRule').onclick=()=>{
    const rule={
      event:q('ruleEvent').value,cube:q('ruleCube').value,set:q('ruleSet').value,zone:q('ruleZone').value,
      needs:q('ruleNeeds').value,value:q('ruleValue').checked,axis:q('ruleAxis').value,sign:Number(q('ruleSign').value),
      other:q('ruleOther').value,face:Number(q('ruleFace').value),otherFace:Number(q('ruleOtherFace').value)
    };
    if(draft.length)rule.when={mode:q('conditionMode').value,items:draft};
    if(q('ruleCounter').value)rule.counter={id:q('ruleCounter').value,op:q('ruleCounterOp').value,value:Number(q('ruleCounterValue').value)};
    const next=structuredClone(read());
    const newFlag=q('ruleNewFlag').value.trim();
    if(newFlag){
      if(next.flags.includes(newFlag)){error('Cet état existe déjà. Sélectionnez-le dans la liste.');return;}
      next.flags.push(newFlag);
      rule.set=newFlag;
    }
    const gate=q('ruleGateTarget').value;
    if(quick&&(!gate||!rule.cube||gate===rule.cube)){
      error('Choisissez une pièce à déverrouiller différente du cube à tourner.');
      return;
    }
    if(gate){
      if(!rule.set||!rule.value){error('Pour déverrouiller un cube, choisissez un état à activer.');return;}
      next.gates.push({cube:gate,flag:rule.set});
    }
    if(editingIndex===null)next.rules.push(rule);
    else next.rules[editingIndex]=rule;
    if(validateAndWrite(next)){
      dialog.close();
      status('Règle enregistrée.');
    }
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
  q('newFromMechanismTemplate').onclick=()=>template(q('mechanismTemplate').value,true);
  return {refresh,report,resetDraft(){clearModule();if(dialog.open)dialog.close();loadDraft();},stop(){q('recordProof').setAttribute('aria-pressed','false');}};
}
