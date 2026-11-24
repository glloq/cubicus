import {applySceneState, initialView} from './scene-state.js';
import {demo} from './demo.js';
import {SceneView} from './scene.js';import {Controller} from './controller.js';import {validate,exportPuzzle,grid} from './model.js';import {getPuzzle} from './storage.js';
const q=id=>document.getElementById(id);let initial=grid(2,2,1),ctl,openingView;const view=new SceneView(q('view'),id=>ctl.select(id));ctl=new Controller(view,q('controls'),structuredClone(initial));function resetView() {
  if (view.camera.isOrthographicCamera) view.toggleProjection();
  view.camera.zoom=1;
  view.setCameraUp([0,1,0]);
  ctl.setSpacing([.12,.12,.12]);
  q('az').value=45;
  q('el').value=45;
  ctl.applyLighting({type:'directional'});
  q('shadows').checked=false;
  view.setLight(45,45);
  view.setShadows(false);
  ctl.draw();
  view.fit(initial);
  applySceneState(ctl,openingView);
}
function open(data){initial=validate(data);openingView=initialView(data.view);ctl.history.clear();ctl.replace(initial);ctl.configure(data.controls);q('reset').hidden=!ctl.rules.history.reset;resetView();q('status').textContent=''}q('load').onchange=async e=>{try{open(JSON.parse(await e.target.files[0].text()))}catch(e){q('status').textContent=e.message}};q('reset').onclick=()=>{if(!ctl.rules.history.reset)return;ctl.history.clear();ctl.replace(initial);ctl.setMode('select');resetView()};try{const id=new URLSearchParams(location.search).get('test');if(id){const p=await getPuzzle(id);if(!p)throw Error('Test introuvable');open(p)}else open(exportPuzzle(demo(4)))}catch(e){q('status').textContent=e.message}

q('demo').onchange=e=>open(exportPuzzle(demo(+e.target.value)));
