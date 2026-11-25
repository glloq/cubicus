import {actionState,executeAction} from './control-actions.js';
import {gatedCubes,mechanismStep} from './mechanisms.js';

export function replayProof(cubes,controls,config,steps) {
  const work=structuredClone(cubes);
  let game=mechanismStep(config,work);
  let completed=0;
  const journal=[{step:0,entries:game.journal}];
  for(const action of steps){
    const restricted=gatedCubes(config,work,game.active);
    const candidate=restricted.map(cube=>({...cube}));
    if(!executeAction(actionState(candidate,controls),action))return {completed,failed:completed+1,cubes:work,active:game.active,counters:game.counters,journal};
    candidate.forEach(({p,r},i)=>Object.assign(work[i],{p,r}));
    game=mechanismStep(config,work,game,action);
    completed++;
    journal.push({step:completed,entries:game.journal});
  }
  return {completed,failed:0,cubes:work,active:game.active,counters:game.counters,journal};
}
