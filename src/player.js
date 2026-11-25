import {topicsFor,tutorialTopics} from './tutorial-topics.js';
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
const tutorial = q('playerTutorial');
const help = q('playerHelp');
q('startPuzzle').onclick = () => tutorial.close();
help.onclick = () => {
  updatePlayerContext(ctl,q('puzzleName').textContent);
  if (!tutorial.open) tutorial.showModal();
};
tutorial.addEventListener('close', () => help.focus({preventScroll:true}));
let initial = [];
let openingView;
let loadVersion=0;
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
  const items = topicsFor(next, mechanisms, data.tutorial);
  const list = q('tutorialTopics');
  list.replaceChildren();
  for (const id of items) {
    const [title, description] = tutorialTopics[id];
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = title;
    detail.textContent = description;
    list.append(term,detail);
  }
  q('tutorialMechanisms').hidden = !items.length;
  if (!tutorial.open) tutorial.showModal();
  q('status').textContent = '';
}

function openDemo() {
  loadVersion++;
  open(exportPuzzle(demo(+q('demo').value)), 'Démonstration');
}

q('load').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const version=++loadVersion;
  try {
    const source=await file.text();
    if(version!==loadVersion)return;
    open(JSON.parse(source), file.name.replace(/\.[^.]+$/,'') || 'Énigme importée');
  } catch (error) {
    if(version!==loadVersion)return;
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
      const version=++loadVersion;
      const puzzle = await getPuzzle(id);
      if(version===loadVersion){
      if (!puzzle) throw new Error('Test introuvable');
      open(puzzle,'Test depuis le Studio');
      }
    } else openDemo();
  }
} catch (error) {
  q('status').textContent = error.message;
}
