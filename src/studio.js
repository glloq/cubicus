import {publicTutorial,tutorialTopics} from './tutorial-topics.js';
import {normalizeVector,vectorImage} from './vector-layer.js';
import {bindMechanismEditor,emptyMechanisms} from './mechanism-editor.js';
import {mechanismConfig} from './mechanisms.js';
import {mechanismTemplate,templateInstructions} from './mechanism-templates.js';
import {replayProof} from './mechanism-proof.js';
import {bindEmbedExport} from './embed-export.js';
import {bindWorkspace} from './workspace-ui.js';
import {actionState,controlDiagnostics} from './control-actions.js';
import {controlRules} from './control-rules.js';
import {bindConstraints,bindControlEditor,bindGroupEditor} from './control-editor.js';
import {offsetGroup} from './assembly.js';
import {bindResources} from './studio-resources.js';
import { applySceneState, captureSceneState, initialView } from './scene-state.js';
import { bindSilhouette } from './studio-silhouette.js';
import { faceMaterials, validateMirrors } from './materials.js';
import { bindImageImport } from './image-import.js';
import { bindReferences } from './references.js';
import { mixPuzzle, seededRandom } from './mix.js';
import { preparePublicPuzzle } from './public-authoring.js';
import { bindVolumeEditor } from './studio-volumes.js';
import { bindFaceWorkspace } from './face-workspace.js';
import { bindProjects } from './studio-projects.js';
import {drawStamp} from './stamps.js';import {privateLayers,composeLayers} from './layers.js';import {SceneView} from './scene.js';import {Controller} from './controller.js';import {cube,grid,faceOpacity,alphaFaces} from './model.js';import {demo} from './demo.js';import {overlayLayers} from './overlay.js';import {bakeProjection} from './anamorph.js';import {muralTiles} from './mural.js';import {download,putPuzzle} from './storage.js';
let workspaceUI, mechanismEditor;
let mechanisms=emptyMechanisms(), proof=[], recording=false, proofStart;
let refsAvailable=false;
let auditRevision=0;
const q=id=>document.getElementById(id),canvas=q('paint'),ctx=canvas.getContext('2d');let rules=controlRules(),library=[],ctl,reference=null,referenceView=null,publicView=null,clipboard=null,paintVersion=0,faceReady=true,layerIndex=0,layerJob=0;const view=new SceneView(q('view'),(id,face)=>{q('face').value=face;layerIndex=0;ctl.select(id)});ctl=new Controller(view,q('controls'),grid(2,2,1),()=>{loadFace();refreshControlsEditor();scheduleDraft()});function selected(){return ctl.cubes.find(c=>c.id===ctl.selected)}function status(s){q('status').textContent=s}function loadFace(){volumeEditor.refresh();refreshCubePicker();refreshLayers();refreshMaterial();faceWorkspace.reset();faceReady=false;refreshNet();const version=++paintVersion;ctx.clearRect(0,0,512,512);if(!layerStack().length&&!alphaFaces(selected()?.alphaFaces)[+q('face').value]&&!faceMaterials(selected()?.materials)[+q('face').value].blend){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}const f=activeLayer()?.image||(!layerStack().length?selected()?.faces[+q('face').value]:null);if(f){const im=new Image();im.onload=()=>{if(version===paintVersion){ctx.drawImage(im,0,0,512,512);faceReady=true}};im.onerror=()=>{if(version===paintVersion){faceReady=true;status('Texture illisible')}};im.src=f}else faceReady=true}function commit(){const c=selected();if(!c)return;const f=+q('face').value,l=activeLayer();if(l){l.image=canvas.toDataURL('image/png');recompose(c,f)}else{c.faces[f]=canvas.toDataURL('image/png');ctl.draw();refreshNet();scheduleDraft()}}q('face').onchange=()=>{layerIndex=0;loadFace()};const faceWorkspace = bindFaceWorkspace(canvas, {
  checkpoint: () => ctl.checkpoint(),
  commit,
  canDraw: () => Boolean(selected()) && faceReady && !activeLayer()?.locked&&!activeLayer()?.vector,
  stamp: stampAt,
  alpha: () => q('alphaFace').checked || q('blendFace').checked || Boolean(activeLayer())
});
bindImageImport({
  canApply: () => selected() && !activeLayer()?.locked&&!activeLayer()?.vector && {cube: selected(), face: q('face').value, layer: activeLayer()},
  apply(preview, target) {
    if (target.cube !== selected() || target.face !== q('face').value || target.layer !== activeLayer()) {
      status('La face ou le calque actif a changé.');
      return;
    }
    ctl.checkpoint();
    ctx.clearRect(0, 0, 512, 512);
    ctx.drawImage(preview, 0, 0);
    if (!target.layer) {
      target.cube.materials = faceMaterials(target.cube.materials);
      target.cube.materials[Number(target.face)].blend = true;
      target.cube.alphaFaces = alphaFaces(target.cube.alphaFaces);
      target.cube.alphaFaces[Number(target.face)] = false;
      refreshMaterial();
    }
    commit();
  },
  status
});
q('clear').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked||activeLayer()?.vector)return;ctl.checkpoint();ctx.clearRect(0,0,512,512);if(!activeLayer()&&!q('alphaFace').checked&&!q('blendFace').checked){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}commit()};q('turn').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked||activeLayer()?.vector)return;ctl.checkpoint();const tmp=document.createElement('canvas');tmp.width=tmp.height=512;tmp.getContext('2d').drawImage(canvas,0,0);ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,256);ctx.rotate(Math.PI/2);ctx.drawImage(tmp,-256,-256);ctx.restore();commit()};q('copy').onclick=()=>{if(!faceReady||!selected())return;clipboard=canvas.toDataURL()};q('paste').onclick=()=>{if(!selected()||!clipboard||activeLayer()?.locked||activeLayer()?.vector)return;ctl.checkpoint();const l=activeLayer();if(l){l.image=clipboard;recompose(selected(),+q('face').value);loadFace()}else{selected().faces[+q('face').value]=clipboard;ctl.changed()}};q('generate').onclick=()=>{const dims=['nx','ny','nz'].map(id=>Math.max(1,Math.min(8,Math.floor(+q(id).value)||1)));ctl.checkpoint();ctl.replace(grid(...dims));ctl.selected=ctl.cubes[0].id;ctl.changed();view.fit(ctl.cubes)};function add(duplicate){if(ctl.cubes.length>=512)return;const p=[Math.max(-1,...ctl.cubes.map(c=>c.p[0]))+1,0,0];if(p[0]>100){status('Limite de grille');return}const c=duplicate&&selected()?{...structuredClone(selected()),id:crypto.randomUUID(),p}:cube(p);ctl.checkpoint();ctl.cubes.push(c);ctl.selected=c.id;ctl.changed();view.fit(ctl.cubes)}q('add').onclick=()=>add(false);q('duplicate').onclick=()=>add(true);q('remove').onclick=()=>{if(!selected()||ctl.cubes.length===1)return;ctl.checkpoint();ctl.replace(ctl.cubes.filter(c=>c.id!==ctl.selected))};q('shuffle').onclick = () => {
  if(mechanisms.gates.length||mechanisms.joins?.length){
    status('Placez le départ manuellement avec les verrous ou connecteurs, puis vérifiez le parcours privé.');
    return;
  }
  const snapshot = ctl.snapshot();
  const steps = mixPuzzle(ctl.cubes, rules, {
    positions: q('shufflePos').checked,
    rotations: q('shuffleRot').checked,
    steps: q('mixSteps').value,
    ids:q('mixSelected').checked?ctl.group().map(cube=>cube.id):undefined,
    random:q('mixSeed').value ? seededRandom(q('mixSeed').value) : Math.random,
    axes: [...q('mixAxes').querySelectorAll('input:checked')].map(input => input.value).join('')
  });
  if (!steps) {
    status('Aucune opération de mélange autorisée pour cette sélection.');
    return;
  }
  ctl.history.record(snapshot);
  ctl.changed();
  status(steps + ' opérations de mélange autorisées exécutées.');
};
function publicSnapshot() {
  if(recording)throw Error('Arrêtez l’enregistrement du parcours avant de tester ou exporter.');
  if (pendingLayers.size || hasFailedComposition()) {
    throw new Error('La composition des calques doit être terminée');
  }
  const report=controlDiagnostics(actionState(ctl.cubes,rules,publicView?.lighting?.type),publicView);
  if(report.errors.length)throw new Error(report.errors.join(' '));
  return preparePublicPuzzle(ctl.cubes, rules, publicView, mechanisms, q('publicInstructions').value,readTutorialTopics());
}

bindEmbedExport(publicSnapshot);

q('export').onclick = async () => {
  const button=q('export');
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  try {
    download(await publicSnapshot(), 'level.puzzle');
    status('Énigme exportée dans un fichier .puzzle.');
  } catch (error) {
    status(error.message);
  } finally {
    button.disabled=false;
    button.removeAttribute('aria-busy');
  }
};

async function testUrl() {
  const id = crypto.randomUUID();
  await putPuzzle(id, await publicSnapshot());
  return './play.html?test=' + id;
}

q('test').onclick = async () => {
  const popup = window.open('about:blank', '_blank');
  try {
    const url = await testUrl();
    if (popup) popup.location.href = url;
    else location.href = url;
  } catch (error) {
    popup?.close();
    status(error.message);
  }
};

const playtest = q('playtest');
const playtestFrame = q('playtestFrame');
let playtestRequest=0;
async function reloadPlaytest() {
  const request=++playtestRequest;
  q('playtestStatus').textContent='';
  q('reloadPlaytest').disabled = q('testInline').disabled = true;
  try {
    const url=await testUrl();
    if(request!==playtestRequest)return;
    playtestFrame.src=url;
    if (!playtest.open) playtest.showModal();
  } catch (error) {
    if(request!==playtestRequest)return;
    if(playtest.open)q('playtestStatus').textContent=error.message;
    else status(error.message);
  } finally {
    if(request===playtestRequest)q('reloadPlaytest').disabled = q('testInline').disabled = false;
  }
}
q('testInline').onclick = q('reloadPlaytest').onclick = reloadPlaytest;
q('closePlaytest').onclick = () => playtest.close();
playtest.onclose = () => {
  playtestRequest++;
  q('reloadPlaytest').disabled = q('testInline').disabled = false;
  q('playtestStatus').textContent='';
  playtestFrame.src='about:blank';
};
const net=q('net');for(const [i,col,row] of [[2,2,1],[1,1,2],[4,2,2],[0,3,2],[5,4,2],[3,2,3]]){const b=document.createElement('button');b.style.gridColumn=col;b.style.gridRow=row;b.dataset.face=i;b.title=q('face').options[i].text;b.onclick=()=>{q('face').value=i;layerIndex=0;loadFace()};net.append(b)}
function refreshNet(){for(const b of q('net').children){const i=+b.dataset.face,f=selected()?.faces[i];b.style.backgroundImage=f?'url("'+f+'")':'none';b.textContent=q('face').options[i].text;b.classList.toggle('active',i===+q('face').value)}}
function refreshLibrary(){q('library').replaceChildren(...library.map((c,i)=>new Option('Modèle '+(i+1),i)))}
q('librarySave').onclick=()=>{if(!selected())return;library.push(structuredClone(selected()));refreshLibrary();scheduleDraft()};
q('libraryAdd').onclick=()=>{const c=library[+q('library').value];if(!c||ctl.cubes.length>=512)return;const p=[Math.max(-1,...ctl.cubes.map(c=>c.p[0]))+1,0,0];if(p[0]>100)return;ctl.checkpoint();const n={...structuredClone(c),id:crypto.randomUUID(),p};ctl.cubes.push(n);ctl.selected=n.id;ctl.changed();view.fit(ctl.cubes)};
q('textAdd').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked||activeLayer()?.vector||!q('text').value)return;ctl.checkpoint();ctx.fillStyle=q('color').value;ctx.font='bold 100px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q('text').value,256,256,470);commit()};
q('demo').onclick=()=>{ctl.checkpoint();ctl.replace(demo(4));ctl.selected=ctl.cubes[0].id;ctl.changed();view.fit(ctl.cubes)};
const volumeEditor = bindVolumeEditor({
  selected,
  checkpoint: () => ctl.checkpoint(),
  change: () => ctl.changed(),
  status
});
refreshNet();

ctl.selected=ctl.cubes[0].id;ctl.draw();loadFace();view.fit(ctl.cubes);

const controlEditor = bindControlEditor(q('publicControls'),{
  read:()=>rules, write:next=>{rules=next;scheduleDraft();}, cubes:()=>ctl.cubes, opening:()=>publicView,status
});
const constraintsEditor = bindConstraints(q('cubeConstraints'),{
  selected:()=>ctl.group(),checkpoint:()=>ctl.checkpoint(),changed:()=>ctl.changed(),status
});
const groupEditor=bindGroupEditor(q('groupEditor'),{
  cubes:()=>ctl.cubes,checkpoint:()=>ctl.checkpoint(),changed:()=>ctl.changed(),status,
  select(id){
    ctl.scope='definedGroups';
    ctl.select(id);
  },
  duplicate:()=>shiftSelection(true)
});
function refreshControlsEditor(){
  if(mechanismEditor){
    const ids=new Set(ctl.cubes.map(cube=>cube.id));
    if(recording&&(ids.size!==proofStart.length||proofStart.some(cube=>!ids.has(cube.id)))){
      recording=false;
      proofStart=undefined;
      proof=[];
      mechanismEditor.stop();
      status('Assemblage modifié pendant l’enregistrement. Parcours annulé.');
    }
    let removed=false;
    for(const key of ['rules','gates','optics','joins','visuals']){
      const entries=mechanisms[key]??[];
      const retained=entries.filter(entry=>(!entry.cube||ids.has(entry.cube))&&(!entry.other||ids.has(entry.other))&&
        (entry.when?.items??[]).every(condition=>(!['receiver','actor'].includes(condition.kind)||ids.has(condition.id))&&(!condition.cube||ids.has(condition.cube))));
      if(retained.length!==entries.length){
        mechanisms[key]=retained;
        removed=true;
      }
    }
    if(removed){
      mechanismEditor.resetDraft();
      ctl.configureMechanisms(mechanisms);
      ctl.draw();
    }
    mechanismEditor.refresh();
  }
  workspaceUI?.refresh();
  controlEditor.diagnostic();
  constraintsEditor.refresh();
  groupEditor.refresh();
}
function renderRules(){controlEditor.render();}
const tutorialChoices=q('tutorialTopics');
for(const [id,[name]] of Object.entries(tutorialTopics)){
  const label=document.createElement('label');
  const input=document.createElement('input');
  input.type='checkbox';
  input.value=id;
  input.onchange=scheduleDraft;
  label.append(input,' '+name);
  tutorialChoices.append(label);
}
function readTutorialTopics(){
  return publicTutorial([...tutorialChoices.querySelectorAll('input:checked')].map(input=>input.value));
}
function setTutorialTopics(ids){
  for(const input of tutorialChoices.querySelectorAll('input'))input.checked=ids?.includes(input.value)??false;
}
q('mixSeed').oninput=q('publicInstructions').oninput=scheduleDraft;
ctl.onSelectionChange=()=>constraintsEditor.refresh();
refreshControlsEditor();

q('muralCreate').onclick=async()=>{const file=q('mural').files[0];if(!file){status('Choisir une image complète');return}const assembly = ctl.cubes;let image;try{image=await createImageBitmap(file);if (ctl.cubes !== assembly) return;const c=muralTiles(image,+q('muralX').value,+q('muralY').value,{
  plane:q('muralPlane').value, angle:+q('muralAngle').value, fill:q('muralFill').checked,
  alpha:q('muralAlpha').checked, offset:[+q('muralOffsetX').value,+q('muralOffsetY').value]
});ctl.checkpoint();ctl.replace(c);reference=structuredClone(c);referenceView=null;ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);setTutorialTopics(['fresco']);scheduleDraft();status('Fresque créée. Mélanger pour préparer le test.')}catch(e){status(e.message)}finally{image?.close()}};

function captureView() { return captureSceneState(ctl); }
function restoreView(viewState) { applySceneState(ctl, viewState); }
q('capturePublicView').onclick = () => {
  publicView = initialView(captureView());
  controlEditor.diagnostic();
  workspaceUI.refresh();
  status(publicView ? 'Vue de démarrage publique mémorisée.' : 'Vue hors des limites de démarrage.');
  scheduleDraft();
};
q('clearPublicView').onclick = () => {
  publicView = null;
  controlEditor.diagnostic();
  workspaceUI.refresh();
  status('Le Player utilisera sa vue par défaut.');
  scheduleDraft();
};
q('projectionView').onclick=()=>restoreView(referenceView);
q('projectImage').onclick=async()=>{const file=q('projectionImage').files[0];if(!file){status('Choisir une image à projeter');return}const assembly = ctl.cubes;let image;const button=q('projectImage');button.disabled=true;try{image=await createImageBitmap(file);if (ctl.cubes !== assembly) return;const pose=captureView();const result=bakeProjection(image,view,ctl.cubes,{resolution:+q('projectionResolution').value,preserve:q('projectionKeep').checked,
ids:q('projectionSelected').checked?ctl.group().map(c=>c.id):null,
face:q('projectionFace').checked?+q('face').value:null,
asLayer:q('projectionLayers').checked});ctl.checkpoint();ctl.replace(result.cubes);reference=structuredClone(result.cubes);referenceView=pose;ctl.selected=result.cubes[0].id;ctl.changed();setTutorialTopics([...readTutorialTopics(),'anamorphosis']);scheduleDraft();status(result.count+' faces texturées. Vue privée mémorisée.')}catch(e){status(e.message)}finally{image?.close();button.disabled=false}};

function refreshMaterial(){const c=selected(),f=+q('face').value;const v=faceOpacity(c?.opacity)[f];q('faceOpacity').value=Math.round(v*100);q('opacityValue').value=Math.round(v*100)+'%';q('alphaFace').checked=alphaFaces(c?.alphaFaces)[f];const material=faceMaterials(c?.materials)[f];
q('blendFace').checked=material.blend;
q('materialMode').value=material.mode;
q('materialColor').value=material.color??(c?.faces[f]?'#ffffff':'#61798c');for(const input of q('openFaces').querySelectorAll('input'))input.checked=faceOpacity(c?.opacity)[+input.dataset.face]===0}
q('faceOpacity').oninput=e=>{q('opacityValue').value=e.target.value+'%'};
q('faceOpacity').onchange=e=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=faceOpacity(c.opacity);c.opacity[+q('face').value]=+e.target.value/100;ctl.changed()};
q('opacityAll').onclick=()=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=Array(6).fill(+q('faceOpacity').value/100);ctl.changed()};
q('alphaFace').onchange=e=>{const c=selected();if(!c)return;ctl.checkpoint();c.alphaFaces=alphaFaces(c.alphaFaces);c.alphaFaces[+q('face').value]=e.target.checked;ctl.changed()};
function updateMaterial(patch) {
  const cube = selected();
  if (!cube) return;
  const materials = faceMaterials(cube.materials);
  Object.assign(materials[+q('face').value], patch);
  try {
    validateMirrors(ctl.cubes.map(item => item === cube ? {...cube, materials} : item));
  } catch (error) {
    status(error.message);
    refreshMaterial();
    return;
  }
  ctl.checkpoint();
  cube.materials = materials;
  ctl.changed();
}
q('blendFace').onchange = event => updateMaterial({blend: event.target.checked});
q('materialMode').onchange = event => updateMaterial({mode: event.target.value});
q('materialColor').onchange = event => updateMaterial({color: event.target.value});
q('materialReset').onclick = () => updateMaterial({color: null});
q('neutralMaterials').onchange = event => { view.neutralMaterials = event.target.checked; ctl.draw(); };
q('overlayCreate').onclick=async()=>{const file=q('overlayImage').files[0];if(!file){status('Choisir une image');return}const assembly = ctl.cubes;let image;try{image=await createImageBitmap(file);if (ctl.cubes !== assembly) return;const c=overlayLayers(image,+q('overlayCount').value,{mode:q('overlayMode').value,depth:+q('overlayDepth').value});ctl.checkpoint();ctl.replace(c);ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);if(!view.camera.isOrthographicCamera)view.toggleProjection();const d=view.camera.position.distanceTo(view.orbit.target);view.camera.position.copy(view.orbit.target);view.camera.position.z+=d;view.orbit.update();view.render();reference=structuredClone(c);referenceView=captureView();scheduleDraft();setTutorialTopics(['overlay']);scheduleDraft();status('Superposition créée. Mélanger les cubes pour tester.')}catch(e){status(e.message)}finally{image?.close()}};

workspaceUI=bindWorkspace({
  resize:()=>view.resize(),
  state:()=>({cubes:ctl.cubes,selected:ctl.selected,face:q('face').selectedOptions[0]?.text??'',
    publicView,hasReferences:Boolean(reference)||refsAvailable})
});
workspaceUI.refresh();

function layerStack(){const c=selected();return c?.layers?.[+q('face').value]||[]}
function activeLayer(){return layerStack()[layerIndex]}
function refreshLayers(){const list=q('layerList'),stack=layerStack();layerIndex=Math.max(0,Math.min(layerIndex,stack.length-1));list.replaceChildren(...stack.map((l,i)=>new Option(l.name,i)));list.value=String(layerIndex);const l=activeLayer();q('layerVisible').checked=l?.visible!==false;q('layerName').value=l?.name??'';q('layerLocked').checked=Boolean(l?.locked);
q('layerName').disabled=!l;q('layerLocked').disabled=!l;
q('layerDuplicate').disabled=!l||stack.length>=16;
q('layerFlatten').disabled=stack.length<2||stack.some(layer=>layer.locked||!layer.visible);q('layerOpacity').value=Math.round((l?.opacity??1)*100);refreshVector();for(const id of ['layerDelete','layerUp','layerDown','layerVisible','layerOpacity'])q(id).disabled=!l||(id==='layerDelete'&&l.locked)}
function refreshVector(){
  const layer=activeLayer();
  q('vectorUpdate').disabled=!layer?.vector||layer.locked;
  if(!layer?.vector)return;
  for(const [field,value] of Object.entries(layer.vector)){
    const input=q('vector'+field[0].toUpperCase()+field.slice(1));
    if(field==='fill')input.checked=value;
    else input.value=value;
  }
}
function vectorForm(){
  return normalizeVector({shape:q('vectorShape').value,color:q('vectorColor').value,fill:q('vectorFill').checked,
    ...Object.fromEntries(['x','y','width','height','stroke'].map(field=>[field,Number(q('vector'+field[0].toUpperCase()+field.slice(1)).value)]))});
}
q('vectorAdd').onclick=()=>{
  const cube=selected();
  const face=Number(q('face').value);
  if(!cube)return;
  const current=layerStack();
  if(current.length>=16)return status('Limite de 16 calques.');
  const vector=vectorForm();
  ctl.checkpoint();
  cube.layers??=Array.from({length:6},()=>[]);
  const stack=cube.layers[face];
  if(!stack.length&&cube.faces[face])stack.push({name:'Fond',image:cube.faces[face],visible:true,opacity:1});
  stack.push({name:'Forme vectorielle',vector,image:vectorImage(vector),visible:true,opacity:1});
  layerIndex=stack.length-1;
  loadFace();
  recompose(cube,face);
};
q('vectorUpdate').onclick=()=>{
  const layer=activeLayer();
  if(!layer?.vector||layer.locked)return;
  ctl.checkpoint();
  layer.vector=vectorForm();
  layer.image=vectorImage(layer.vector);
  loadFace();
  recompose(selected(),Number(q('face').value));
};
q('layerName').onchange = event => {
  const layer = activeLayer();
  if (!layer || !event.target.value.trim()) return;
  ctl.checkpoint();
  layer.name = event.target.value.trim().slice(0, 80);
  refreshLayers();
  scheduleDraft();
};
q('layerLocked').onchange = event => {
  if (!activeLayer()) return;
  ctl.checkpoint();
  activeLayer().locked = event.target.checked;
  refreshLayers();
  scheduleDraft();
};
q('layerDuplicate').onclick = () => {
  const stack = layerStack();
  if (!activeLayer() || stack.length >= 16) return;
  ctl.checkpoint();
  const copy = {...activeLayer(), name: activeLayer().name.slice(0, 73) + ' (copie)', locked: false};
  stack.splice(++layerIndex, 0, copy);
  loadFace();
  recompose(selected(), Number(q('face').value));
};
q('layerFlatten').onclick = async () => {
  const cube = selected();
  const face = Number(q('face').value);
  const stack = layerStack();
  if (!cube || stack.length < 2 || stack.some(layer => layer.locked || !layer.visible)) return;
  const before = JSON.stringify(stack);
  try {
    const image = await composeLayers(stack);
    if (!ctl.cubes.includes(cube) || before !== JSON.stringify(cube.layers[face])) return;
    ctl.checkpoint();
    cube.layers[face] = [{name: 'Fusion', image, visible: true, opacity: 1}];
    loadFace();
    recompose(cube, face);
  } catch (error) {
    status(error.message);
  }
};
const pendingLayers=new Map();
const failedLayers=new Map();
async function recompose(c, f) {
  const key = c.id + ':' + f;
  const job = ++layerJob;
  pendingLayers.set(key, job);
  try {
    const texture = await composeLayers(c.layers[f]);
    if (pendingLayers.get(key) !== job || !ctl.cubes.includes(c)) return;
    failedLayers.delete(key);
    c.faces[f] = texture;
    ctl.draw();
    refreshNet();
  } catch (error) {
    if (pendingLayers.get(key) === job && ctl.cubes.includes(c)) {
      failedLayers.set(key, c);
      status(error.message);
    }
  } finally {
    if (pendingLayers.get(key) === job) pendingLayers.delete(key);
    scheduleDraft();
  }
}
function blankLayer(){const c=document.createElement('canvas');c.width=c.height=512;return c.toDataURL('image/png')}
q('layerAdd').onclick=()=>{const c=selected(),f=+q('face').value;if(!c||layerStack().length>=16)return;ctl.checkpoint();c.layers=privateLayers(c);const stack=c.layers[f];if(!stack.length&&c.faces[f])stack.push({name:'Fond',image:c.faces[f],visible:true,opacity:1});stack.push({name:'Calque '+(stack.length+1),image:blankLayer(),visible:true,opacity:1});layerIndex=stack.length-1;loadFace();recompose(c,f)};
q('layerList').onchange=e=>{layerIndex=+e.target.value;loadFace()};
q('layerDelete').onclick=()=>{const c=selected(),f=+q('face').value;if(!activeLayer()||activeLayer().locked)return;ctl.checkpoint();layerStack().splice(layerIndex,1);layerIndex=Math.max(0,layerIndex-1);if(!layerStack().length){pendingLayers.delete(c.id+':'+f);failedLayers.delete(c.id+':'+f);c.faces[f]=null;ctl.changed()}else{loadFace();recompose(c,f)}};
function reorderLayer(delta){const c=selected(),f=+q('face').value,stack=layerStack(),to=layerIndex+delta;if(!activeLayer()||to<0||to>=stack.length)return;ctl.checkpoint();[stack[layerIndex],stack[to]]=[stack[to],stack[layerIndex]];layerIndex=to;loadFace();recompose(c,f)}
q('layerUp').onclick=()=>reorderLayer(1);q('layerDown').onclick=()=>reorderLayer(-1);
q('layerVisible').onchange=e=>{if(!activeLayer())return;ctl.checkpoint();activeLayer().visible=e.target.checked;refreshLayers();recompose(selected(),+q('face').value)};
q('layerOpacity').onchange=e=>{if(!activeLayer())return;ctl.checkpoint();activeLayer().opacity=+e.target.value/100;recompose(selected(),+q('face').value)};

function stampAt(x,y){drawStamp(ctx,{symbol:q('stampSymbol').value,x,y,size:+q('stampSize').value,angle:+q('stampAngle').value,color:q('color').value,width:+q('width').value,fill:q('stampFill').checked})}
q('stampMode').onclick=()=>{q('brush').value='stamp';status('Cliquer sur la face pour placer le symbole')};
q('stampCenter').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked||activeLayer()?.vector)return;ctl.checkpoint();stampAt(256,256);commit()};
q('auditProject').onclick = async () => {
  const revision=auditRevision;
  const button=q('auditProject');
  button.disabled=true;
  const lines = [];
  try {
    const comparison = references.active()?.cubes ?? reference;
    const puzzle = await publicSnapshot();
    const scene = view.renderer.info;
    const uniqueMaterials = new Set(view.meshes.flatMap(mesh => mesh.material));
    const poses = new Map(ctl.cubes.map(cube => [cube.id, cube]));
    lines.push('Format public : valide');
    lines.push('Cubes : ' + puzzle.cubes.length);
    lines.push('Faces décorées : ' + puzzle.cubes.reduce((count, cube) => count + cube.faces.filter(Boolean).length, 0));
    lines.push('Export : ' + (new Blob([JSON.stringify(puzzle)]).size / 1024).toFixed(1) + ' Kio');
    lines.push('Dernier rendu : ' + scene.render.triangles + ' triangles, ' + scene.render.calls + ' appels de dessin');
    lines.push('Scène : ' + view.meshes.length + ' maillages de cubes, ' + uniqueMaterials.size + ' matériaux, ' + scene.memory.textures + ' textures GPU');
    if (!rules.rotation.individual && !rules.rotation.collective && !rules.rotation.simultaneous && !rules.movement.swap && !rules.movement.emptySlots && !rules.spacing.global && !rules.spacing.independentAxes && !rules.lighting.direction) lines.push('Observation seule');
    if (!comparison) lines.push('Attention : aucune configuration de référence');
    if (comparison && comparison.length !== poses.size) lines.push('Attention : nombre de cubes différent de la référence');
    if (comparison?.length === poses.size && comparison.every(cube => {
      const other = poses.get(cube.id);
      return other && cube.p.join() === other.p.join() && cube.r.join() === other.r.join();
    })) lines.push('Attention : poses identiques à la référence');
    lines.push('Lisibilité et résistance à la reconstruction : contrôle manuel.');
  } catch (error) {
    lines.push('Erreur : ' + error.message);
  }
  if (revision===auditRevision) q('auditResult').textContent = lines.join('\n');
  else q('auditResult').textContent = 'Le projet a changé. Relancez le contrôle.';
  button.disabled=false;
};


for(const [i,name] of ['Droite','Gauche','Haut','Bas','Avant','Arrière'].entries()){const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.face=i;input.onchange=()=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=faceOpacity(c.opacity);c.opacity[i]=input.checked?0:1;ctl.changed()};l.append(input,' '+name+' ouverte');q('openFaces').append(l)}
function setOpen(open){const c=selected();if(!c)return;ctl.checkpoint();c.opacity=Array(6).fill(open?0:1);ctl.changed()}
q('openAll').onclick=()=>setOpen(true);q('closeAll').onclick=()=>setOpen(false);
refreshMaterial();

function refreshCubePicker(){const picker=q('cubePicker');picker.replaceChildren(...ctl.cubes.map((c,i)=>new Option('Cube '+(i+1)+' · '+c.p.join(', '),c.id)));picker.value=ctl.selected||''}
q('cubePicker').onchange=e=>{if(!e.target.value)return;layerIndex=0;ctl.select(e.target.value)};

const references = bindReferences({
  capture() {
    if (pendingLayers.size || hasFailedComposition()) {
      status('Attendez la composition des calques.');
      return;
    }
    return {cubes: ctl.cubes, view: captureView()};
  },
  restore(item) {
    ctl.checkpoint();
    ctl.replace(item.cubes);
    restoreView(item.view);
  },
  compare(item) {
    const current = new Map(ctl.cubes.map(cube => [cube.id, cube]));
    const same = item.cubes.filter(cube => {
      const other = current.get(cube.id);
      return other && cube.p.join() === other.p.join() && cube.r.join() === other.r.join();
    }).length;
    return same + ' poses concordantes sur ' + item.cubes.length + ' dans la référence. ' + current.size + ' fragments dans l’état actuel.';
  },
  changed(){
    refsAvailable=references.list().length>0;
    workspaceUI.refresh();
    scheduleDraft();
  },
  status
});

let projects;
function scheduleDraft() {
  auditRevision++;
  if (q('auditResult').textContent) q('auditResult').textContent='Le projet a changé. Relancez le contrôle.';
  workspaceUI?.refresh();
  projects?.schedule();
}

function storedCubes(){
  if(!recording)return ctl.cubes;
  const poses=new Map(proofStart.map(({id,p,r})=>[id,{p,r}]));
  return ctl.cubes.map(cube=>({...cube,...poses.get(cube.id)}));
}

projects = bindProjects({
  read: () => ({
    version: 2,
    name: q('projectName').value,
    cubes: storedCubes(),
    reference,
    referenceView,
    references: references.list(),
    publicView,
    library,
    controls: rules,
    mechanisms, proof, instructions:q('publicInstructions').value, tutorial:readTutorialTopics(),
    mixSeed: q('mixSeed').value,
    view: captureView()
  }),
  apply(project) {
    reference = project.reference;
    referenceView = project.referenceView;
    references.replace(project.references);
    refsAvailable=project.references.length>0;
    queueMicrotask(()=>workspaceUI.refresh());
    publicView = project.publicView;
    library = project.library;
    rules = project.controls;
    mechanisms=project.mechanisms??emptyMechanisms();
    proof=project.proof;
    q('publicInstructions').value=project.instructions;
    setTutorialTopics(project.tutorial);
    recording=false;
    proofStart=undefined;
    mechanismEditor.stop();
    mechanismEditor.resetDraft();
    ctl.configureMechanisms(mechanisms);
    q('mixSeed').value=project.mixSeed;
    controlEditor.resetProfile();
    pendingLayers.clear();
    failedLayers.clear();
    ctl.history.clear();
    q('face').value = '4';
    layerIndex = 0;
    renderRules();
    refreshLibrary();
    ctl.replace(project.cubes);
    ctl.selected = ctl.cubes[0].id;
    ctl.setSpacing([.12,.12,.12]);
    ctl.applyLighting({type:'directional'});
    view.setCameraUp([0,1,0]);
    q('az').value=45;q('el').value=45;q('shadows').checked=false;
    view.setLight(45,45);view.setShadows(false);
    view.fit(ctl.cubes);
    restoreView(project.view);
    ctl.changed();
  },
  create: () => ({version: 2, cubes: grid(2,2,1)}),
  isComposing: () => pendingLayers.size > 0,
  hasFailedComposition,
  status
});

function hasFailedComposition() { return [...failedLayers.values()].some(cube => ctl.cubes.includes(cube)); }

// History snapshots can be taken while another face is still being composited.
ctl.captureExtra=()=>structuredClone({mechanisms,proof,rules,publicView,reference,referenceView,references:references.list(),instructions:q('publicInstructions').value,tutorial:readTutorialTopics()});
ctl.onRestore = extra => {
  if(extra){
    ({mechanisms,proof,rules,publicView,reference,referenceView}=extra);
    references.replace(extra.references);
    q('publicInstructions').value=extra.instructions;
    setTutorialTopics(extra.tutorial);
    refsAvailable=extra.references.length>0;
    ctl.configureMechanisms(mechanisms);
    renderRules();
  }
  pendingLayers.clear();
  failedLayers.clear();
  for (const cube of ctl.cubes) {
    cube.layers?.forEach((stack, face) => {
      if (stack.length) recompose(cube, face);
    });
  }
};
q('studioHeader').querySelector('.header-actions').append(q('undo'), q('redo'));

bindSilhouette({
  apply(cubes, mode) {
    ctl.checkpoint();
    ctl.replace(cubes);
    ctl.selected = ctl.cubes[0].id;
    ctl.setSpacing([0, 0, 0]);
    ctl.changed();
    view.fit(cubes);
    setTutorialTopics([mode==='shadow'?'shadow':'window']);
    scheduleDraft();
    if (mode === 'shadow') {
      ctl.applyLighting({type:'directional'});
      q('az').value = 0;
      q('el').value = 90;
      q('shadows').checked = true;
      view.setLight(0, 90);
      view.setShadows(true);
    } else {
      if (!view.camera.isOrthographicCamera) view.toggleProjection();
      const distance = view.camera.position.distanceTo(view.orbit.target);
      view.camera.position.copy(view.orbit.target);
      view.camera.position.z += distance;
      view.orbit.update();
    }
    status(cubes.length + ' fragments générés depuis le masque.');
  },
  status
});

bindResources({
  capture(kind) {
    if (pendingLayers.size || hasFailedComposition()) throw new Error('Attendez la composition des calques.');
    if (kind === 'assembly') return structuredClone(ctl.cubes);
    const source = selected();
    if (!source) throw new Error('Sélectionnez un cube.');
    if (kind === 'cube') return [structuredClone(source)];
    const fragment = cube();
    const face = +q('face').value;
    if (kind === 'face') {
      fragment.faces[0] = source.faces[face];
      fragment.layers = [structuredClone(source.layers?.[face] ?? [])];
    } else if (kind === 'materials') {
      fragment.materials = faceMaterials(source.materials);
      fragment.alphaFaces = alphaFaces(source.alphaFaces);
      fragment.opacity = faceOpacity(source.opacity);
    } else if (kind === 'volume' && source.volume) fragment.volume = structuredClone(source.volume);
    return [fragment];
  },
  apply({kind, cubes}) {
    const target = selected();
    const source = cubes[0];
    if (kind === 'assembly') {
      ctl.checkpoint();
      ctl.replace(cubes.map(fragment => ({...fragment, id: crypto.randomUUID()})));
      ctl.selected = ctl.cubes[0].id;
      ctl.changed();
      view.fit(ctl.cubes);
      return;
    }
    if (kind === 'cube') {
      if (ctl.cubes.length >= 512) throw new Error('Limite de 512 cubes.');
      const p = [Math.max(-1, ...ctl.cubes.map(fragment => fragment.p[0])) + 1, 0, 0];
      if (p[0] > 100) throw new Error('Limite de grille.');
      ctl.checkpoint();
      ctl.cubes.push({...source, p, id: crypto.randomUUID()});
      ctl.selected = ctl.cubes.at(-1).id;
      ctl.changed();
      view.fit(ctl.cubes);
      return;
    }
    if (!target) throw new Error('Sélectionnez un cube.');
    const face = +q('face').value;
    if (kind === 'face' && (activeLayer()?.locked || pendingLayers.has(target.id + ':' + face))) {
      throw new Error('La face active est verrouillée ou en cours de composition.');
    }
    const updates = kind === 'materials' ? {
      materials: source.materials, opacity: source.opacity, alphaFaces: source.alphaFaces
    } : kind === 'volume' ? {volume: source.volume} : {};
    validateMirrors(ctl.cubes.map(item => item === target ? {...target, ...updates} : item));
    ctl.checkpoint();
    if (kind === 'face') {
      target.faces[face] = source.faces[0];
      target.layers = privateLayers(target);
      target.layers[face] = source.layers[0];
      failedLayers.delete(target.id + ':' + face);
    } else Object.assign(target, updates);
    ctl.changed();
  },
  status
});

function shiftSelection(duplicate) {
  const original = ctl.snapshot();
  const offset = ['X','Y','Z'].map(axis => Number(q('groupOffset' + axis).value));
  const moved = offsetGroup(ctl.cubes, ctl.group().map(cube => cube.id), offset, {duplicate});
  if (!moved) {
    status('Déplacement impossible. Vérifiez la sélection, les limites et les cases occupées.');
    return;
  }
  if (duplicate) {
    const used=new Set(ctl.cubes.map(cube=>cube.constraints?.group).filter(Boolean));
    const names=new Map();
    for(const cube of moved){
      if(!cube.constraints)continue;
      const {group,slots}=cube.constraints;
      if(group&&!names.has(group)){
        let index=1;
        let label;
        do { label=group.slice(0,63)+' (copie '+index+')'; index++; } while(used.has(label));
        names.set(group,label);
        used.add(label);
      }
      if(group)cube.constraints.group=names.get(group);
      if(slots){
        cube.constraints.slots=slots.map(p=>p.map((value,axis)=>value+offset[axis]))
          .filter(p=>p.every(value=>Math.abs(value)<=100));
      }
    }
    ctl.cubes.push(...moved);
    ctl.selected = moved[0].id;
  }
  ctl.history.record(original);
  ctl.changed(!duplicate);
}
q('translateGroup').onclick = () => shiftSelection(false);
q('duplicateGroup').onclick = () => shiftSelection(true);

mechanismEditor=bindMechanismEditor({
  read:()=>mechanisms, cubes:()=>ctl.cubes, selected:()=>ctl.selected, status, proofLength:()=>proof.length,
  write(next){
    ctl.checkpoint();
    mechanisms=next;
    ctl.configureMechanisms(next);
    ctl.draw();
    scheduleDraft();
  },
  template(kind){
    const sample=mechanismTemplate(kind);
    ctl.checkpoint();
    mechanisms=mechanismConfig(sample.mechanisms,sample.cubes)??emptyMechanisms();
    decorateTemplate(sample.cubes,kind);
    q('publicInstructions').value=templateInstructions[kind];
    setTutorialTopics(kind==='fresco'?['fresco']:kind==='window'?['window']:[]);
    proof=sample.proof;
    rules=sample.controls;
    publicView=null;
    reference=null;
    referenceView=null;
    references.replace([]);
    refsAvailable=false;
    recording=false;
    proofStart=undefined;
    mechanismEditor.stop();
    mechanismEditor.resetDraft();
    ctl.configureMechanisms(mechanisms);
    ctl.replace(sample.cubes);
    ctl.selected=ctl.cubes[0].id;
    ctl.changed();
    renderRules();
    view.fit(ctl.cubes);
    if(['fresco','window'].includes(kind)){
      if(!view.camera.isOrthographicCamera)view.toggleProjection();
      const distance=view.camera.position.distanceTo(view.orbit.target);
      view.setCameraUp([0,1,0]);
      view.camera.position.copy(view.orbit.target);
      view.camera.position.z+=distance;
      view.orbit.update();
      view.render();
      publicView=captureView();
      scheduleDraft();
    }
    q('proofReport').textContent='';
    q('logicJournal').textContent='';
    status('Modèle chargé. Ouvrez Tester ici pour jouer.');
  },
  record(){
    recording=!recording;
    if(recording){
      ctl.checkpoint();
      proofStart=structuredClone(ctl.cubes);
      proof=[];
      status('Enregistrement actif. Manipulez les cubes puis arrêtez l’enregistrement.');
    }else{
      // Restore only the recorded poses. Editing textures while recording remains possible.
      const original=new Map(proofStart.map(cube=>[cube.id,cube]));
      proofStart=undefined;
      if(ctl.cubes.length!==original.size||ctl.cubes.some(cube=>!original.has(cube.id))){
        proof=[];
        status('Assemblage modifié pendant l’enregistrement. Parcours annulé.');
        mechanismEditor.refresh();
        scheduleDraft();
        return false;
      }
      ctl.checkpoint();
      for(const cube of ctl.cubes){
        const {p,r}=original.get(cube.id);
        cube.p=p;cube.r=r;
      }
      ctl.changed();
      status('Parcours enregistré. Le départ est rétabli.');
    }
    mechanismEditor.refresh();
    scheduleDraft();
    return recording;
  },
  verify(){
    try{
      const result=replayProof(ctl.cubes,rules,mechanismConfig(mechanisms,ctl.cubes),proof);
      q('logicJournal').textContent=result.journal.flatMap(({step,entries})=>entries.map(entry=>
        (step?'Action '+step:'Départ')+' · règle '+entry.rule+' · '+(entry.matched?'appliquée':'conditions non remplies')+
        (entry.conditions.length?' ('+entry.conditions.map(value=>value?'oui':'non').join(', ')+')':''))).join('\n');
      q('proofReport').textContent=result.failed ? 'Action '+result.failed+' interdite.'
        : result.completed ? result.completed+' actions autorisées depuis le départ.'+(result.active.length?' États atteints : '+result.active.join(', ')+'.':'') : 'Aucune action à vérifier.';
    }catch(error){q('logicJournal').textContent='';q('proofReport').textContent=error.message;}
  },
  clearProof(){proof=[];q('logicJournal').textContent='';q('proofReport').textContent='';scheduleDraft();}
});
ctl.onAction=action=>{
  if(recording&&proof.length<500)proof.push(structuredClone(action));
};
mechanismEditor.refresh();

function decorateTemplate(cubes,kind){
  const labels={
    logicDoor:['PLAQUE A','PLAQUE B','CADRAN','PORTE'],
    sequence:['A','B','VERROU'], rails:['NAVETTE','AIGUILLE','BARRAGE'], mirrors:['SOURCE','MIROIR','CAPTEUR','VERROU'],
    contact:['CONTACT','BORNE','VERROU'], connectors:['PRISE','CONNECTEUR'], hinge:['PIVOT','BRAS','BARRAGE'],
    fresco:['TUILE','TUILE','TUILE','TUILE'], window:['FENÊTRE','VOLET','TRACE'],
    double:['SOURCE','MIROIR','RELAIS','CAPTEUR','VERROU'], switched:['COMMANDE','SOURCE','CAPTEUR','VERROU']
  };
  const colors=['#6249a0','#225e93','#34705b','#824843','#633138'];
  const tile=document.createElement('canvas');
  tile.width=tile.height=256;
  const ctx=tile.getContext('2d');
  cubes.forEach((cube,i)=>{
    ctx.fillStyle=colors[i];
    ctx.fillRect(0,0,256,256);
    ctx.strokeStyle='#d9edec';
    ctx.lineWidth=6;
    ctx.strokeRect(14,14,228,228);
    ctx.fillStyle='#ffffff';
    ctx.font='bold 29px sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(labels[kind][i],128,128);
    cube.faces.fill(tile.toDataURL('image/png'));
  });
  if(kind!=='fresco')return;
  const artwork=document.createElement('canvas');
  artwork.width=artwork.height=512;
  const paint=artwork.getContext('2d');
  paint.fillStyle='#18243a';
  paint.fillRect(0,0,512,512);
  paint.strokeStyle='#e3ff9c';
  paint.lineWidth=24;
  paint.beginPath();
  paint.ellipse(256,256,215,122,Math.PI/5,0,Math.PI*2);
  paint.stroke();
  paint.fillStyle='#67dbed';
  paint.beginPath();
  paint.arc(256,256,82,0,Math.PI*2);
  paint.fill();
  for(const [i,cube] of cubes.entries()){
    ctx.clearRect(0,0,256,256);
    ctx.drawImage(artwork,(i%2)*256,i<2?256:0,256,256,0,0,256,256);
    cube.faces[4]=tile.toDataURL('image/png');
  }
}
