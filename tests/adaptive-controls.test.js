import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cube, grid, quarter, exportPuzzle, validate} from '../src/model.js';
import {controlRules} from '../src/control-rules.js';
import {actionState, capabilities, executeAction, previewAction, selection} from '../src/control-actions.js';
import {mixPuzzle,seededRandom} from '../src/mix.js';

const rules = overrides => controlRules({version:2,...overrides});

test('legacy flags migrate and versioned rules strip unknown values and normalize ranges', () => {
  const legacy = controlRules({move:false,groups:false,observe:false});
  assert.equal(legacy.movement.swap,false);
  assert.equal(legacy.movement.emptySlots,false);
  assert.equal(legacy.selection.line,false);
  assert.equal(legacy.camera.orbit,false);
  const normalized = rules({rotation:{axes:['Z','Y','Z','Q'],answer:'private'},spacing:{min:4,max:-4,step:0}, profile:'private'});
  assert.deepEqual(normalized.rotation.axes,['Y','Z']);
  assert.deepEqual(normalized.spacing,{global:true,independentAxes:true,axes:['X','Y','Z'],min:2,max:2,step:.01});
  assert.equal('answer' in normalized.rotation,false);
  assert.equal('profile' in normalized,false);
});

test('planar spacing axes and group modes follow occupied coordinates, including large puzzles', () => {
  for (const [dims,axes] of [[[1,1,1],[]],[[2,2,1],['X','Y']],[[2,1,2],['X','Z']],[[8,8,8],['X','Y','Z']]]) {
    const cubes = grid(...dims);
    const available = capabilities(actionState(cubes,rules()));
    assert.deepEqual(available.gapAxes,axes);
    assert.equal(available.scopes.includes('line'),cubes.length>1);
    assert.equal(available.scopes.includes('layer'),cubes.length>1);
  }
  const one = cube();
  one.constraints={fixed:true};
  assert.deepEqual(capabilities(actionState([one],rules({lighting:{direction:false}}))),{
    rotation:false,move:false,spacing:false,gapAxes:[],scopes:['cube'],light:false
  });
});

test('rotation, swap and empty slots share atomic validation with both cubes and all destinations', () => {
  const cubes=grid(2,1,1);
  const [a,b]=cubes;
  b.constraints={positionLocked:true};
  a.constraints={rotationAxes:['Z'],slots:[[0,0,0],[0,1,0]]};
  const config=rules({rotation:{axes:['X','Z']},movement:{axes:['X','Y']}});
  const state=()=>actionState(cubes,config);
  assert.equal(previewAction(state(),{type:'swap',ids:[a.id,b.id]}),null);
  assert.equal(executeAction(state(),{type:'step',ids:[a.id],axis:'Z',sign:1}),false);
  assert.equal(executeAction(state(),{type:'rotate',ids:[a.id],axis:'X',sign:1}),false);
  assert.equal(executeAction(state(),{type:'rotate',ids:[a.id],axis:'Z',sign:1}),true);
  assert.deepEqual(a.r,quarter('Z'));
  assert.equal(executeAction(state(),{type:'step',ids:[a.id],axis:'Y',sign:1}),true);
  assert.deepEqual(cubes.map(cube=>cube.p),[[0,1,0],[1,0,0]]);
});

test('solid groups require complete collective operations and preserve the original state on collision', () => {
  const cubes=[...grid(3,1,1),cube([0,1,0])];
  for (const item of cubes.slice(0,3)) item.constraints={group:'private-name',solid:true};
  const config=rules({movement:{groupTranslation:true}});
  const state=()=>actionState(cubes,config);
  const ids=selection(state(),{id:cubes[0].id,scope:'definedGroups'}).map(cube=>cube.id);
  assert.equal(executeAction(state(),{type:'rotate',ids:ids.slice(0,1),axis:'Z',sign:1}),false);
  assert.equal(executeAction(state(),{type:'translate',ids,axis:'Y',sign:1,scope:'definedGroups'}),false);
  assert.deepEqual(cubes.map(cube=>cube.p),[[0,0,0],[1,0,0],[2,0,0],[0,1,0]]);
  assert.equal(executeAction(state(),{type:'collective',ids,axis:'Z',sign:1,scope:'definedGroups'}),true);
  assert.deepEqual(cubes.map(cube=>cube.p),[[1,-1,0],[1,0,0],[1,1,0],[0,1,0]]);
  const exported=exportPuzzle(cubes,config);
  assert.ok(!JSON.stringify(exported).includes('private-name'));
  assert.equal(new Set(validate(exported).filter(cube=>cube.constraints).map(cube=>cube.constraints.group)).size,1);
});

test('legal cyclic shift and selection legality validate exact lines', () => {
  const cubes=grid(3,2,1);
  const config=rules({movement:{cyclicShift:true}});
  const state=()=>actionState(cubes,config);
  const row=cubes.slice(0,3);
  assert.equal(executeAction(state(),{type:'cycle',ids:row.slice(1).map(cube=>cube.id),axis:'X',sign:1,scope:'line',selectionAxis:'X'}),false);
  assert.equal(executeAction(state(),{type:'cycle',ids:row.map(cube=>cube.id),axis:'X',sign:1,scope:'line',selectionAxis:'X'}),true);
  assert.deepEqual(row.map(cube=>cube.p[0]),[1,2,0]);
});

test('seeded mixing uses legal collective turns when individual rotations are disabled', () => {
  const cubes=grid(3,1,1);
  const config=rules({rotation:{individual:false,simultaneous:false,axes:['Z']},movement:{swap:false,emptySlots:false}});
  const copy=structuredClone(cubes);
  for (const list of [cubes,copy]) {
    assert.equal(mixPuzzle(list,config,{steps:1,random:seededRandom('test')}),1);
  }
  assert.deepEqual(cubes,copy);
  assert.equal(new Set(cubes.map(cube=>cube.p[1])).size,3);
});

test('compatible layers and independent solid groups swap atomically', () => {
  const cubes=grid(2,2,1);
  for(const [i,cube] of cubes.entries())cube.constraints={group:i<2?'one':'two',solid:true};
  const config=rules({movement:{layerSwap:true,groupSwap:true,axes:['Y']}});
  const state=()=>actionState(cubes,config);
  const ids=cubes.slice(0,2).map(cube=>cube.id);
  const otherIds=cubes.slice(2).map(cube=>cube.id);
  assert.equal(executeAction(state(),{type:'swapLayers',ids,otherIds,axis:'Y'}),true);
  assert.deepEqual(cubes.map(cube=>cube.p[1]),[1,1,0,0]);
  assert.equal(executeAction(state(),{type:'swapGroups',ids,otherIds}),true);
  assert.deepEqual(cubes.map(cube=>cube.p[1]),[0,0,1,1]);
  cubes[2].constraints.positionLocked=true;
  assert.equal(executeAction(state(),{type:'swapGroups',ids,otherIds}),false);
  assert.deepEqual(cubes.map(cube=>cube.p[1]),[0,0,1,1]);
});

test('a bounded partial mix can use empty slots and retains an inverse operation', () => {
  const [a,b]=grid(2,1,1);
  a.constraints={slots:[[0,0,0],[0,1,0]]};
  const config=rules({rotation:{individual:false,simultaneous:false,collective:false},movement:{swap:false,axes:['Y']}});
  assert.equal(mixPuzzle([a,b],config,{ids:[a.id],steps:1,random:()=>0}),1);
  assert.deepEqual(a.p,[0,1,0]);
  assert.deepEqual(b.p,[1,0,0]);
  assert.equal(executeAction(actionState([a,b],config),{type:'step',ids:[a.id],axis:'Y',sign:-1}),true);
});

test('illumination capabilities distinguish source type and scrub presentation metadata', () => {
  const cubes=grid(1,1,1);
  const config=rules({lighting:{direction:false,position:true,angle:true}});
  assert.equal(capabilities(actionState(cubes,config,'directional')).light,false);
  assert.equal(capabilities(actionState(cubes,config,'point')).light,true);
  assert.equal(capabilities(actionState(cubes,config,'spot')).light,true);
  const view={position:[1,2,3],target:[0,0,0],spacing:[0,0,0],zoom:1,
    lighting:{type:'spot',position:[1,2,3],angle:120,intensity:1,privateName:'private'}};
  assert.deepEqual(exportPuzzle(cubes,config,view).view.lighting,{type:'spot',position:[1,2,3],angle:90,intensity:1});
});
