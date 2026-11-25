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
