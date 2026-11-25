import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cube,exportPuzzle} from '../src/model.js';
import {publicTutorial,topicsFor} from '../src/tutorial-topics.js';

test('tutorial types are allowlisted in public exports and mechanics are inferred separately', ()=>{
  const piece=cube();
  piece.constraints={slots:[[0,0,0],[1,0,0]]};
  const mechanics={gates:[{}],rules:[{event:'contact'}],joins:[],optics:[{}]};
  assert.deepEqual(publicTutorial(['shadow','secret','shadow','fresco']),['fresco','shadow']);
  assert.deepEqual(topicsFor([piece],mechanics,['shadow']),['states','contacts','rails','beam','shadow']);
  const puzzle=exportPuzzle([piece],{},null,null,'Observation',['shadow','secret']);
  assert.deepEqual(puzzle.tutorial,['shadow']);
});
