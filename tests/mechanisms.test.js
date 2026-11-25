import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cube,exportPuzzle,quarter,validate} from '../src/model.js';
import {controlRules} from '../src/control-rules.js';
import {actionState,previewAction} from '../src/control-actions.js';
import {gatedCubes,mechanismConfig,mechanismStep,traceBeams} from '../src/mechanisms.js';
import {mechanismTemplate} from '../src/mechanism-templates.js';
import {replayProof} from '../src/mechanism-proof.js';
import {makeVolume,paintVolumeRegion} from '../src/volumes.js';
import {normalizeVector} from '../src/vector-layer.js';

for(const kind of ['sequence','rails','mirrors','contact','connectors','hinge','fresco','window','double','switched'])test('private proof completes the '+kind+' template',()=>{
  const {cubes,controls,mechanisms,proof}=mechanismTemplate(kind);
  const snapshot=structuredClone(cubes);
  const result=replayProof(cubes,controls,mechanismConfig(mechanisms,cubes),proof);
  assert.equal(result.completed,proof.length);
  assert.equal(result.failed,0);
  assert.deepEqual(cubes,snapshot);
});

test('sequence predicates use previous state and never permit a locked cube before the unlock',()=>{
  const {cubes,controls,mechanisms,proof}=mechanismTemplate('sequence');
  const config=mechanismConfig(mechanisms,cubes);
  assert.equal(replayProof(cubes,controls,config,[proof[1],proof[0],proof[2]]).failed,3);
  const payload=exportPuzzle(cubes,controls,null,{...mechanisms,proof,privateName:'inédit'});
  assert.equal('proof' in payload,false);
  assert.equal('proof' in payload.mechanisms,false);
  assert.equal('privateName' in payload.mechanisms,false);
  assert.deepEqual(payload.mechanisms.flags,['s0','s1']);
  assert.ok(mechanismConfig(payload.mechanisms,validate(payload)));
  assert.ok(payload.mechanisms.rules.every(rule=>cubes.every(cube=>cube.id!==rule.cube)));
});

test('logical mirrors only reach aligned receivers and opaque grid occupants stop the ray',()=>{
  const {cubes,mechanisms}=mechanismTemplate('mirrors');
  const config=mechanismConfig(mechanisms,cubes);
  assert.equal(traceBeams(config,cubes).receivers.size,0);
  cubes[1].r=quarter('Z');
  assert.equal(traceBeams(config,cubes).receivers.size,1);
  assert.deepEqual(mechanismStep(config,cubes).active,['actif']);
  assert.equal(traceBeams(config,[...cubes,cube([2,1,0])]).receivers.size,0);
});

test('facing connectors enforce solidarity and a shared hinge uses the declared pivot',()=>{
  const a=cube([0,0,0]), b=cube([1,0,0]);
  const raw={version:1,joins:[{cube:a.id,other:b.id,face:0,otherFace:1}]};
  const config=mechanismConfig(raw,[a,b]);
  const controls=controlRules({version:2,movement:{groupTranslation:true}});
  const state=actionState(gatedCubes(config,[a,b],[]),controls);
  assert.equal(previewAction(state,{type:'step',ids:[a.id],axis:'Y',sign:1}),null);
  assert.ok(previewAction(state,{type:'translate',ids:[a.id,b.id],axis:'Y',sign:1}));
  for(const item of [a,b])item.constraints={group:'hinge',solid:true,pivot:[0,0,0]};
  const changes=previewAction(actionState([a,b],controls),{type:'collective',ids:[a.id,b.id],axis:'Z',sign:1});
  assert.deepEqual(changes.map(change=>change.p),[[0,0,0],[0,1,0]]);
});

test('contact conditions require adjacent cubes and opposing face normals',()=>{
  const a=cube([0,0,0]),b=cube([1,0,0]);
  const config=mechanismConfig({version:1,flags:['contact'],rules:[
    {event:'contact',cube:a.id,other:b.id,face:0,otherFace:1,set:'contact'}
  ]},[a,b]);
  assert.deepEqual(mechanismStep(config,[a,b]).active,['contact']);
  b.r=quarter('Z');
  assert.deepEqual(mechanismStep(config,[a,b]).active,[]);
});

test('volume regions edit several layers and vector shapes are bounded',()=>{
  const full=makeVolume(4,'solid');
  const volume=paintVolumeRegion(full,[0,0,0],[1,1,1],false);
  assert.equal(volume.cells.split('0').length-1,8);
  assert.deepEqual(paintVolumeRegion(volume,[0,0,0],[1,1,1],true),full);
  assert.throws(()=>paintVolumeRegion(full,[0,0,0],[3,3,3],false),/conserver/);
  const vector=normalizeVector({shape:'ellipse',x:-5,color:'url(https://example.invalid)'});
  assert.equal(vector.x,0);
  assert.equal(vector.color,'#ffffff');
});

test('a hinged turn rejects an obstruction along the arc even when the destination is empty',()=>{
  const {cubes,controls,proof}=mechanismTemplate('hinge');
  const initial=actionState(cubes,controls);
  assert.equal(previewAction(initial,proof[1]),null);
  assert.equal(replayProof(cubes,controls,null,proof).completed,2);
});

test('combined conditions advance the counter only with two occupied zones and a wrong turn resets it',()=>{
  const {cubes,controls,mechanisms,proof}=mechanismTemplate('logicDoor');
  const config=mechanismConfig(mechanisms,cubes);
  const attempt=replayProof(cubes,controls,config,[proof[2],proof[4]]);
  assert.equal(attempt.failed,2);
  assert.equal(attempt.counters.tours,0);
  const interrupted=replayProof(cubes,controls,config,[...proof.slice(0,3),
    {type:'rotate',ids:[cubes[0].id],axis:'Z',sign:1},proof[3],proof[4]]);
  assert.equal(interrupted.failed,6);
  assert.equal(interrupted.counters.tours,1);
  const done=replayProof(cubes,controls,config,proof);
  assert.equal(done.failed,0);
  assert.equal(done.counters.tours,2);
  assert.ok(done.active.includes('porte'));
  assert.ok(done.journal.some(entry=>entry.entries.some(rule=>!rule.matched)));
});

test('zones trigger entry and exit only on transitions and public exports rename logic identifiers',()=>{
  const {cubes,controls,mechanisms,proof}=mechanismTemplate('logicDoor');
  const config=mechanismConfig(mechanisms,cubes);
  const reversed={...proof[0],sign:-1};
  const result=replayProof(cubes,controls,config,[proof[0],reversed]);
  assert.equal(result.failed,0);
  assert.equal(result.active.includes('voyant_a'),false);
  const publicPuzzle=exportPuzzle(cubes,controls,null,mechanisms);
  assert.deepEqual(publicPuzzle.mechanisms.zones.map(zone=>zone.id),['z0','z1']);
  assert.deepEqual(publicPuzzle.mechanisms.counters,[{id:'c0',initial:0}]);
  assert.equal(JSON.stringify(publicPuzzle).includes('plaque_a'),false);
  assert.equal(JSON.stringify(publicPuzzle).includes('conditions non remplies'),false);
  assert.ok(mechanismConfig(publicPuzzle.mechanisms,validate(publicPuzzle)));
});

test('visual effects are derived from flags without changing logical cubes',async()=>{
  const {visualEffects}=await import('../src/mechanisms.js');
  const piece=cube();
  const config=mechanismConfig({version:1,flags:['signal'],visuals:[
    {kind:'lamp',cube:piece.id,flag:'signal',color:'#ffffff'},
    {kind:'reveal',cube:piece.id,face:3,flag:'signal'},
    {kind:'beam',flag:'signal',color:'#ff0000'}
  ]},[piece]);
  assert.equal(visualEffects(config,[piece],[]).cubes[0].opacity[3],0);
  const on=visualEffects(config,[piece],['signal']);
  assert.equal(on.cubes[0].opacity[3],1);
  assert.equal(on.beamColor,'#ff0000');
  assert.equal(on.lamps.length,1);
  assert.equal(piece.opacity,undefined);
});

test('a module rebinds cube references and duplicates its own counters, zones and effects',async()=>{
  const {duplicateLogicModule,moduleCubes,selectLogicModule}=await import('../src/mechanism-module.js');
  const {cubes,mechanisms}=mechanismTemplate('logicDoor');
  const config=mechanismConfig(mechanisms,cubes);
  const module=selectLogicModule(config,[0,1,4,5]);
  const copies=cubes.map(({p})=>cube(p.map((value,i)=>i===2?value+1:value)));
  const bindings=new Map(moduleCubes(module).map(id=>[id,copies[cubes.findIndex(cube=>cube.id===id)].id]));
  const combined=duplicateLogicModule(config,module,bindings,'copie',[0,0,1]);
  assert.equal(combined.rules.length,config.rules.length+4);
  assert.ok(combined.flags.includes('copie_porte'));
  assert.ok(combined.visuals.some(effect=>effect.cube===copies[0].id&&effect.flag==='copie_voyant_a'));
  assert.deepEqual(combined.zones.find(zone=>zone.id==='copie_plaque_a').from,[1,0,1]);
  assert.ok(mechanismConfig(combined,[...cubes,...copies]));
  assert.throws(()=>mechanismConfig(duplicateLogicModule(combined,module,bindings,'copie',[0,0,1]),[...cubes,...copies]),/en double/);
});
