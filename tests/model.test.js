import test from 'node:test';import assert from 'node:assert/strict';import {grid,identity,quarter,mul,exportPuzzle,validate,shuffle,moveTo,rotateGroup,publicControls} from '../src/model.js';
test('arbitrary grid dimensions',()=>{for(const [x,y,z] of [[1,1,1],[2,2,1],[3,3,2],[3,3,3]])assert.equal(grid(x,y,z).length,x*y*z)});
test('quarter turns close exactly',()=>{for(const a of ['X','Y','Z']){let m=identity();for(let i=0;i<4;i++)m=mul(quarter(a),m);assert.deepEqual(m,identity());assert.deepEqual(mul(quarter(a,-1),quarter(a)),identity())}});
test('24 proper cube rotations',()=>{const seen=new Map([[identity().join(),identity()]]);for(const m of seen.values())for(const a of ['X','Y','Z']){const n=mul(quarter(a),m);seen.set(n.join(),n)}assert.equal(seen.size,24)});
test('public export excludes private fields',()=>{const c=grid(1,1,1);c[0].answer='SECRET';c[0].target=[9,9,9];const p=exportPuzzle(c);assert.deepEqual(Object.keys(p.cubes[0]),['id','p','r','faces']);assert.notEqual(p.cubes[0].id,c[0].id);assert.equal(validate(p).length,1)});
test('shuffle preserves slots and valid rotations',()=>{const c=grid(3,3,2),p=c.map(x=>x.p.join()).sort();shuffle(c);assert.deepEqual(c.map(x=>x.p.join()).sort(),p);assert.equal(validate(exportPuzzle(c)).length,18)});
test('invalid rotation rejected',()=>{const p=exportPuzzle(grid(1,1,1));p.cubes[0].r=[-1,0,0,0,1,0,0,0,1];assert.throws(()=>validate(p))});

test('move rejects occupied slots without mutation',()=>{const c=grid(2,1,1);assert.equal(moveTo(c,c[0].id,[1,0,0]),false);assert.deepEqual(c[0].p,[0,0,0]);assert.equal(moveTo(c,c[0].id,[0,1,0]),true)});
test('rigid layer rotation preserves grid and four turns restore poses',()=>{const c=grid(3,3,2),ids=c.filter(x=>x.p[2]===0).map(x=>x.id),before=structuredClone(c);for(let i=0;i<4;i++)assert.equal(rotateGroup(c,ids,'Z',1),true);assert.deepEqual(c,before)});
test('rigid rotation rejects fractional slots and collisions atomically',()=>{const c=grid(2,1,1),before=structuredClone(c);assert.equal(rotateGroup(c,c.map(x=>x.id),'Z',1),false);assert.deepEqual(c,before);const d=grid(3,2,1),ids=d.filter(x=>x.p[1]===0).map(x=>x.id),original=structuredClone(d);assert.equal(rotateGroup(d,ids,'Z',1),false);assert.deepEqual(d,original)});

test('public control allowlist excludes solution metadata',()=>{const p=exportPuzzle(grid(1,1,1),{rotate:false,answer:'secret',target:[1,2,3]});assert.equal(p.controls.rotate,false);assert.equal(p.controls.move,true);assert.equal('answer' in p.controls,false);assert.equal('target' in p.controls,false);assert.equal(publicControls(null).rotate,true)});

test('optical material export is sanitized',()=>{const c=grid(1,1,1);c[0].opacity=[-1,.5,2,0,1,1];c[0].alphaFaces=[true,false,false,false,false,false];const p=exportPuzzle(c);assert.deepEqual(p.cubes[0].opacity,[0,.5,1,0,1,1]);assert.deepEqual(validate(p)[0].alphaFaces,[true,false,false,false,false,false])});

test('shuffle can independently preserve positions or rotations',()=>{const c=grid(3,2,1),p=c.map(x=>[...x.p]),r=c.map(x=>[...x.r]);shuffle(c,{positions:false,rotations:true});assert.deepEqual(c.map(x=>x.p),p);const after=c.map(x=>[...x.r]);shuffle(c,{positions:true,rotations:false});assert.deepEqual(c.map(x=>x.r),after);const before=structuredClone(c);shuffle(c,{positions:false,rotations:false});assert.deepEqual(c,before)});
