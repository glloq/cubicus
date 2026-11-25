import {mechanismConfig,traceBeams} from './mechanisms.js';

export const emptyMechanisms = () => ({version:1,flags:[],rules:[],gates:[],optics:[],joins:[]});

export function bindMechanismEditor({read,write,cubes,template,record,verify,clearProof,proofLength,status}) {
  const q=id=>document.getElementById(id);
  const fill=(id,options)=>{
    const input=q(id), previous=input.value;
    input.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
    if(options.some(([value])=>String(value)===previous))input.value=previous;
  };
  function refresh(){
    const list=cubes().map((cube,i)=>[cube.id,'Cube '+(i+1)+' · '+cube.p.join(', ')]);
    for(const id of ['ruleCube','ruleOther','gateCube','deviceCube','joinCube','joinOther'])fill(id,list);
    for(const id of ['ruleSet','gateFlag'])fill(id,read().flags.map(flag=>[flag,flag]));
    for(const id of ['ruleNeeds','deviceFlag'])fill(id,[['','Toujours'],...read().flags.map(flag=>[flag,flag])]);
    for(const id of ['ruleFace','ruleOtherFace','deviceFace','deviceExit','joinFace','joinOtherFace'])if(!q(id).options.length){
      fill(id,['+X','−X','+Y','−Y','+Z','−Z'].map((face,i)=>[i,face]));
    }
    const names=new Map(list);
    const name=id=>names.get(id)??'Cube absent';
    const cfg=read();
    const output=q('mechanismList');
    output.replaceChildren();
    for(const [key,items] of Object.entries({flags:cfg.flags,rules:cfg.rules,gates:cfg.gates,optics:cfg.optics,joins:cfg.joins??[]})){
      items.forEach((item,index)=>{
        const row=document.createElement('li');
        if(key==='flags')row.textContent='État '+item+' ';
        if(key==='rules')row.textContent=q('ruleEvent').querySelector('[value="'+item.event+'"]').textContent+' · '+name(item.cube)+' → '+item.set+' ';
        if(key==='gates')row.textContent='Verrou · '+name(item.cube)+' · '+item.flag+' ';
        if(key==='joins')row.textContent='Connecteur · '+name(item.cube)+' / '+name(item.other)+' ';
        if(key==='optics')row.textContent=q('deviceKind').querySelector('[value="'+item.kind+'"]').textContent+' · '+name(item.cube)+' ';
        const remove=document.createElement('button');
        remove.textContent='Retirer';
        remove.onclick=()=>{
          const next=structuredClone(read());
          const removed=next[key].splice(index,1)[0];
          if(key==='flags'){
            next.rules=next.rules.filter(rule=>rule.set!==removed&&rule.needs!==removed);
            next.gates=next.gates.filter(gate=>gate.flag!==removed);
            next.optics=next.optics.filter(device=>device.enabledBy!==removed);
          }
          write(next);
          refresh();
        };
        if(key==='rules')for(const [delta,label] of [[-1,'Monter'],[1,'Descendre']]){
          const target=index+delta;
          const move=document.createElement('button');
          move.textContent=label;
          move.disabled=target<0||target>=items.length;
          move.onclick=()=>{
            const next=structuredClone(read());
            [next.rules[index],next.rules[target]]=[next.rules[target],next.rules[index]];
            write(next);
            refresh();
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
    try{
      const clean=mechanismConfig(next,cubes());
      write(clean??emptyMechanisms());
      refresh();
    }catch(error){status(error.message);}
  }
  q('ruleEvent').onchange=()=>{
    q('contactFields').hidden=q('ruleEvent').value!=='contact';
    q('rotationFields').hidden=q('ruleEvent').value!=='turn';
  };
  q('deviceKind').onchange=()=>{
    q('mirrorFields').hidden=q('deviceKind').value!=='mirror';
    q('emitterFields').hidden=q('deviceKind').value!=='emitter';
  };
  q('addFlag').onclick=()=>{append('flags',q('flagName').value.trim());};
  q('addGate').onclick=()=>append('gates',{cube:q('gateCube').value,flag:q('gateFlag').value,positionOnly:q('gatePosition').checked});
  q('addRule').onclick=()=>append('rules',{
    event:q('ruleEvent').value,cube:q('ruleCube').value,set:q('ruleSet').value,
    needs:q('ruleNeeds').value,value:q('ruleValue').checked,axis:q('ruleAxis').value,sign:Number(q('ruleSign').value),
    other:q('ruleOther').value,face:Number(q('ruleFace').value),otherFace:Number(q('ruleOtherFace').value)
  });
  q('addJoin').onclick=()=>append('joins',{cube:q('joinCube').value,other:q('joinOther').value,
    face:Number(q('joinFace').value),otherFace:Number(q('joinOtherFace').value)});
  q('addDevice').onclick=()=>append('optics',{kind:q('deviceKind').value,cube:q('deviceCube').value,
    face:Number(q('deviceFace').value),exit:Number(q('deviceExit').value),enabledBy:q('deviceFlag').value});
  q('loadMechanismTemplate').onclick=()=>{
    if(confirm('Remplacer l’assemblage et ses règles par ce modèle ?'))template(q('mechanismTemplate').value);
  };
  q('recordProof').onclick=()=>{q('recordProof').setAttribute('aria-pressed',String(record()));};
  q('verifyProof').onclick=verify;
  q('clearProof').onclick=()=>{clearProof();refresh();};
  return {refresh,stop(){q('recordProof').setAttribute('aria-pressed','false');}};
}
