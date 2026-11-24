import test from 'node:test';import assert from 'node:assert/strict';import {grid,identity,quarter,mul,exportPuzzle,validate,shuffle} from '../src/model.js';
test('arbitrary grid dimensions',()=>{for(const [x,y,z] of [[1,1,1],[2,2,1],[3,3,2],[3,3,3]])assert.equal(grid(x,y,z).length,x*y*z)});
test('quarter turns close exactly',()=>{for(const a of ['X','Y','Z']){let m=identity();for(let i=0;i<4;i++)m=mul(quarter(a),m);assert.deepEqual(m,identity());assert.deepEqual(mul(quarter(a,-1),quarter(a)),identity())}});
test('24 proper cube rotations',()=>{const seen=new Map([[identity().join(),identity()]]);for(const m of seen.values())for(const a of ['X','Y','Z']){const n=mul(quarter(a),m);seen.set(n.join(),n)}assert.equal(seen.size,24)});
test('public export excludes private fields',()=>{const c=grid(1,1,1);c[0].answer='SECRET';c[0].target=[9,9,9];const p=exportPuzzle(c);assert.deepEqual(Object.keys(p.cubes[0]),['id','p','r','faces']);assert.notEqual(p.cubes[0].id,c[0].id);assert.equal(validate(p).length,1)});
test('shuffle preserves slots and valid rotations',()=>{const c=grid(3,3,2),p=c.map(x=>x.p.join()).sort();shuffle(c);assert.deepEqual(c.map(x=>x.p.join()).sort(),p);assert.equal(validate(exportPuzzle(c)).length,18)});
test('invalid rotation rejected',()=>{const p=exportPuzzle(grid(1,1,1));p.cubes[0].r=[-1,0,0,0,1,0,0,0,1];assert.throws(()=>validate(p))});
