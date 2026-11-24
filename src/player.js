import {mechanismConfig} from './mechanisms.js';
import {applySceneState, initialView} from './scene-state.js';
import {demo} from './demo.js';
import {SceneView} from './scene.js';
import {Controller} from './controller.js';
import {validate, exportPuzzle, publicInstructions} from './model.js';
import {getPuzzle} from './storage.js';
import {updatePlayerContext} from './workspace-ui.js';

const q = id => document.getElementById(id);
const embedded = q('embeddedPuzzle');
let initial = [];
let openingView;
const view = new SceneView(q('view'), id => ctl.select(id));
const ctl = new Controller(view, q('controls'), structuredClone(initial));

function resetView() {
  if (view.camera.isOrthographicCamera) view.toggleProjection();
  view.camera.zoom = 1;
  view.setCameraUp([0,1,0]);
  ctl.setSpacing([.12,.12,.12]);
  q('az').value = 45;
  q('el').value = 45;
  ctl.applyLighting({type:'directional'});
  q('shadows').checked = false;
  view.setLight(45,45);
  view.setShadows(false);
  ctl.draw();
  view.fit(initial);
  applySceneState(ctl,openingView);
}

function open(data,name) {
  const next = validate(data);
  const mechanisms=mechanismConfig(data.mechanisms,next);
  initial = next;
  openingView = initialView(data.view);
  ctl.history.clear();
  ctl.configureMechanisms(null);
  ctl.replace(initial);
  ctl.configureMechanisms(mechanisms);
  ctl.configure(data.controls);
  q('reset').hidden = !ctl.rules.history.reset;
  resetView();
  updatePlayerContext(ctl,name);
  const instructions=publicInstructions(data.instructions);
  q('puzzleObjective').textContent=instructions;
  q('puzzleObjective').hidden=!instructions;
  q('playerHelp').querySelector('summary').textContent=instructions?'Consigne et commandes':'Aide de jeu';
  q('status').textContent = '';
}

function openDemo() {
  open(exportPuzzle(demo(+q('demo').value)), 'Démonstration');
}

q('load').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    open(JSON.parse(await file.text()), file.name.replace(/\.[^.]+$/,'') || 'Énigme importée');
  } catch (error) {
    q('status').textContent = 'Impossible d’ouvrir cette énigme. ' + error.message;
  }
};

q('reset').onclick = () => {
  if (!ctl.rules.history.reset) return;
  ctl.history.clear();
  ctl.replace(initial);
  ctl.setMode('select');
  resetView();
};
q('demo').onchange = openDemo;

try {
  if (embedded) {
    q('demo').closest('label').hidden = true;
    q('load').closest('label').hidden = true;
    document.querySelector('.brand').removeAttribute('href');
    document.querySelector('.brand').removeAttribute('aria-label');
    open(JSON.parse(embedded.textContent), 'Énigme');
  } else {
    const id = new URLSearchParams(location.search).get('test');
    if (id) {
      const puzzle = await getPuzzle(id);
      if (!puzzle) throw new Error('Test introuvable');
      open(puzzle,'Test depuis le Studio');
    } else openDemo();
  }
} catch (error) {
  q('status').textContent = error.message;
}
