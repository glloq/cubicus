import {makeVolume} from './volumes.js';
import {cube} from './model.js';
import {controlRules} from './control-rules.js';

export const templateInstructions={
  sequence:'Déverrouillez le cube rouge en trouvant l’ordre de rotation des deux disques.',
  rails:'Amenez la navette à l’extrémité droite du rail. Déplacez le barrage sur sa voie pour libérer le passage.',
  mirrors:'Orientez le miroir pour relier la source et le capteur, puis déplacez le verrou.',
  contact:'Accolez la face du cube mobile au contact fixe, puis déplacez le cube rouge.',
  connectors:'Accolez les connecteurs. Sélectionnez le groupe formé et translatez les deux cubes ensemble.',
  hinge:'Dégagez le passage du bras. Sélectionnez son groupe et faites-le pivoter autour de la charnière.',
  fresco:'Reconstituez le motif circulaire sur les quatre faces avant. Permutez les tuiles et corrigez leur orientation.',
  window:'Libérez la vue à travers la fenêtre et observez la face derrière le passage.',
  double:'Orientez les deux miroirs pour faire passer le faisceau par les relais jusqu’au capteur. Déplacez ensuite le verrou.',
  switched:'Activez la source avec le commutateur. Réorientez-le une nouvelle fois pour valider le contact optique, puis déplacez le verrou.'
};

export function mechanismTemplate(kind) {
  const make=p=>cube(p);
  const controls=controlRules({version:2,rotation:{axes:['Z']},
    movement:{swap:false},lighting:{direction:false,shadows:false}});
  if(kind==='sequence'){
    const cubes=[make([0,0,0]),make([1,0,0]),make([2,0,0])];
    const [a,b,c]=cubes.map(cube=>cube.id);
    return {cubes,controls,mechanisms:{version:1,flags:['premier','ouvert'],gates:[{cube:c,flag:'ouvert'}],rules:[
      {event:'turn',cube:a,axis:'Z',set:'premier'},
      {event:'turn',cube:b,axis:'Z',needs:'premier',set:'ouvert'}
    ]}, proof:[{type:'rotate',ids:[a],axis:'Z',sign:1},{type:'rotate',ids:[b],axis:'Z',sign:1},{type:'rotate',ids:[c],axis:'Z',sign:1}]};
  }
  if(kind==='rails'){
    const cubes=[make([0,0,0]),make([1,1,0]),make([2,0,0])];
    const [a,b]=cubes;
    a.constraints={orientationLocked:true,slots:[[0,0,0],[1,0,0],[2,0,0],[3,0,0]]};
    b.constraints={orientationLocked:true,slots:[[1,1,0],[1,0,0],[1,-1,0]]};
    cubes[2].constraints={orientationLocked:true,slots:[[2,0,0],[2,1,0]]};
    return {cubes,controls,mechanisms:null,proof:[
      {type:'step',ids:[a.id],axis:'X',sign:1},
      {type:'step',ids:[cubes[2].id],axis:'Y',sign:1},
      {type:'step',ids:[a.id],axis:'X',sign:1},{type:'step',ids:[a.id],axis:'X',sign:1}
    ]};
  }
  if(kind==='contact'){
    const cubes=[make([0,0,0]),make([2,0,0]),make([2,2,0])];
    const [a,b,c]=cubes.map(cube=>cube.id);
    cubes[0].constraints={slots:[[0,0,0],[1,0,0]]};
    cubes[1].constraints={fixed:true};
    return {cubes,controls,mechanisms:{version:1,flags:['contact'],gates:[{cube:c,flag:'contact'}],rules:[
      {event:'contact',cube:a,face:0,other:b,otherFace:1,set:'contact'}
    ]},proof:[{type:'step',ids:[a],axis:'X',sign:1},{type:'step',ids:[c],axis:'Y',sign:1}]};
  }
  if(kind==='connectors'){
    const cubes=[make([0,0,0]),make([2,0,0])];
    const [a,b]=cubes.map(cube=>cube.id);
    controls.movement.groupTranslation=true;
    return {cubes,controls,mechanisms:{version:1,joins:[{cube:a,other:b,face:0,otherFace:1}]},proof:[
      {type:'step',ids:[a],axis:'X',sign:1},{type:'translate',ids:[a,b],scope:'definedGroups',axis:'Y',sign:1}
    ]};
  }
  if(kind==='hinge'){
    const cubes=[make([0,0,0]),make([1,0,0]),make([1,1,0])];
    const [a,b,c]=cubes.map(cube=>cube.id);
    for(const cube of cubes.slice(0,2))cube.constraints={group:'bras',solid:true,pivot:[0,0,0]};
    cubes[2].constraints={slots:[[1,1,0],[1,2,0]]};
    return {cubes,controls,mechanisms:null,proof:[
      {type:'step',ids:[c],axis:'Y',sign:1},{type:'collective',ids:[a,b],scope:'definedGroups',axis:'Z',sign:1}
    ]};
  }
  if(kind==='fresco'){
    const cubes=[make([1,0,0]),make([0,0,0]),make([0,1,0]),make([1,1,0])];
    const [a,b,c]=cubes.map(cube=>cube.id);
    cubes[2].r=[0,1,0,-1,0,0,0,0,1];
    controls.movement.swap=true;
    return {cubes,controls,mechanisms:null,proof:[
      {type:'swap',ids:[a,b]},{type:'rotate',ids:[c],axis:'Z',sign:1}
    ]};
  }
  if(kind==='window'){
    const cubes=[make([0,0,0]),make([0,0,1]),make([0,0,-1])];
    const [,blocker]=cubes.map(cube=>cube.id);
    cubes[0].volume=makeVolume(8,'tunnel');
    cubes[0].constraints={fixed:true};
    cubes[1].constraints={orientationLocked:true,slots:[[0,0,1],[1,0,1]]};
    cubes[2].constraints={fixed:true};
    return {cubes,controls,mechanisms:null,proof:[{type:'step',ids:[blocker],axis:'X',sign:1}]};
  }
  if(kind==='double'){
    const cubes=[make([0,0,0]),make([2,0,0]),make([2,2,0]),make([4,2,0]),make([4,3,0])];
    const [a,b,c,d,e]=cubes.map(cube=>cube.id);
    cubes[0].constraints={fixed:true};
    cubes[1].constraints={positionLocked:true};
    cubes[2].constraints={positionLocked:true};
    cubes[3].constraints={fixed:true};
    return {cubes,controls,mechanisms:{version:1,flags:['relais'],gates:[{cube:e,flag:'relais'}],optics:[
      {kind:'emitter',cube:a,face:0},{kind:'mirror',cube:b,face:2,exit:0},{kind:'mirror',cube:c,face:2,exit:1},
      {kind:'receiver',cube:d,face:1}
    ],rules:[{event:'beam',cube:d,set:'relais'}]},
    proof:[{type:'rotate',ids:[b],axis:'Z',sign:1},{type:'rotate',ids:[c],axis:'Z',sign:-1},
      {type:'rotate',ids:[c],axis:'Z',sign:-1},{type:'step',ids:[e],axis:'X',sign:1}]};
  }
  if(kind==='switched'){
    const cubes=[make([0,1,0]),make([0,0,0]),make([2,0,0]),make([3,1,0])];
    const [a,b,c,d]=cubes.map(cube=>cube.id);
    cubes[1].constraints={fixed:true};
    cubes[2].constraints={fixed:true};
    return {cubes,controls,mechanisms:{version:1,flags:['source','capteur'],gates:[{cube:d,flag:'capteur'}],optics:[
      {kind:'emitter',cube:b,face:0,enabledBy:'source'},{kind:'receiver',cube:c,face:1}
    ],rules:[{event:'turn',cube:a,set:'source'},{event:'beam',cube:c,set:'capteur'}]},
    proof:[{type:'rotate',ids:[a],axis:'Z',sign:1},{type:'rotate',ids:[a],axis:'Z',sign:-1},{type:'step',ids:[d],axis:'X',sign:1}]};
  }
  const cubes=[make([0,0,0]),make([2,0,0]),make([2,2,0]),make([3,2,0])];
  const [a,b,c,d]=cubes.map(cube=>cube.id);
  cubes[0].constraints={fixed:true};
  cubes[1].constraints={positionLocked:true};
  cubes[2].constraints={fixed:true};
  return {cubes,controls,mechanisms:{version:1,flags:['actif'],gates:[{cube:d,flag:'actif'}],optics:[
    {kind:'emitter',cube:a,face:0},{kind:'mirror',cube:b,face:2,exit:0},{kind:'receiver',cube:c,face:3}
  ],rules:[{event:'beam',cube:c,set:'actif'}]},
  proof:[{type:'rotate',ids:[b],axis:'Z',sign:1},{type:'step',ids:[d],axis:'X',sign:1}]};
}
