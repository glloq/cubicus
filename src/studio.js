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
let workspaceUI;
let refsAvailable=false;
let auditRevision=0;
const q=id=>document.getElementById(id),canvas=q('paint'),ctx=canvas.getContext('2d');let rules=controlRules(),library=[],ctl,reference=null,referenceView=null,publicView=null,clipboard=null,paintVersion=0,faceReady=true,layerIndex=0,layerJob=0;const view=new SceneView(q('view'),(id,face)=>{q('face').value=face;layerIndex=0;ctl.select(id)});ctl=new Controller(view,q('controls'),grid(2,2,1),()=>{loadFace();refreshControlsEditor();scheduleDraft()});function selected(){return ctl.cubes.find(c=>c.id===ctl.selected)}function status(s){q('status').textContent=s}function loadFace(){volumeEditor.refresh();refreshCubePicker();refreshLayers();refreshMaterial();faceWorkspace.reset();faceReady=false;refreshNet();const version=++paintVersion;ctx.clearRect(0,0,512,512);if(!layerStack().length&&!alphaFaces(selected()?.alphaFaces)[+q('face').value]&&!faceMaterials(selected()?.materials)[+q('face').value].blend){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}const f=activeLayer()?.image||(!layerStack().length?selected()?.faces[+q('face').value]:null);if(f){const im=new Image();im.onload=()=>{if(version===paintVersion){ctx.drawImage(im,0,0,512,512);faceReady=true}};im.onerror=()=>{if(version===paintVersion){faceReady=true;status('Texture illisible')}};im.src=f}else faceReady=true}function commit(){const c=selected();if(!c)return;const f=+q('face').value,l=activeLayer();if(l){l.image=canvas.toDataURL('image/png');recompose(c,f)}else{c.faces[f]=canvas.toDataURL('image/png');ctl.draw();refreshNet();scheduleDraft()}}q('face').onchange=()=>{layerIndex=0;loadFace()};const faceWorkspace = bindFaceWorkspace(canvas, {
  checkpoint: () => ctl.checkpoint(),
  commit,
  canDraw: () => Boolean(selected()) && faceReady && !activeLayer()?.locked,
  stamp: stampAt,
  alpha: () => q('alphaFace').checked || q('blendFace').checked || Boolean(activeLayer())
});
bindImageImport({
  canApply: () => selected() && !activeLayer()?.locked && {cube: selected(), face: q('face').value, layer: activeLayer()},
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
q('clear').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked)return;ctl.checkpoint();ctx.clearRect(0,0,512,512);if(!activeLayer()&&!q('alphaFace').checked&&!q('blendFace').checked){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}commit()};q('turn').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked)return;ctl.checkpoint();const tmp=document.createElement('canvas');tmp.width=tmp.height=512;tmp.getContext('2d').drawImage(canvas,0,0);ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,256);ctx.rotate(Math.PI/2);ctx.drawImage(tmp,-256,-256);ctx.restore();commit()};q('copy').onclick=()=>{if(!faceReady||!selected())return;clipboard=canvas.toDataURL()};q('paste').onclick=()=>{if(!selected()||!clipboard||activeLayer()?.locked)return;ctl.checkpoint();const l=activeLayer();if(l){l.image=clipboard;recompose(selected(),+q('face').value);loadFace()}else{selected().faces[+q('face').value]=clipboard;ctl.changed()}};q('generate').onclick=()=>{const dims=['nx','ny','nz'].map(id=>Math.max(1,Math.min(8,Math.floor(+q(id).value)||1)));ctl.checkpoint();ctl.replace(grid(...dims));ctl.selected=ctl.cubes[0].id;ctl.changed();view.fit(ctl.cubes)};function add(duplicate){if(ctl.cubes.length>=512)return;const p=[Math.max(-1,...ctl.cubes.map(c=>c.p[0]))+1,0,0];if(p[0]>100){status('Limite de grille');return}const c=duplicate&&selected()?{...structuredClone(selected()),id:crypto.randomUUID(),p}:cube(p);ctl.checkpoint();ctl.cubes.push(c);ctl.selected=c.id;ctl.changed();view.fit(ctl.cubes)}q('add').onclick=()=>add(false);q('duplicate').onclick=()=>add(true);q('remove').onclick=()=>{if(!selected()||ctl.cubes.length===1)return;ctl.checkpoint();ctl.replace(ctl.cubes.filter(c=>c.id!==ctl.selected))};q('shuffle').onclick = () => {
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
  if (pendingLayers.size || hasFailedComposition()) {
    throw new Error('La composition des calques doit être terminée');
  }
  const report=controlDiagnostics(actionState(ctl.cubes,rules,publicView?.lighting?.type),publicView);
  if(report.errors.length)throw new Error(report.errors.join(' '));
  return preparePublicPuzzle(ctl.cubes, rules, publicView);
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
async function reloadPlaytest() {
  q('reloadPlaytest').disabled = true;
  try {
    playtestFrame.src = await testUrl();
    if (!playtest.open) playtest.showModal();
  } catch (error) {
    if (playtest.open) playtest.close();
    status(error.message);
  } finally {
    q('reloadPlaytest').disabled = false;
  }
}
q('testInline').onclick = q('reloadPlaytest').onclick = reloadPlaytest;
q('closePlaytest').onclick = () => playtest.close();
playtest.onclose = () => { playtestFrame.src = 'about:blank'; };
const net=q('net');for(const [i,col,row] of [[2,2,1],[1,1,2],[4,2,2],[0,3,2],[5,4,2],[3,2,3]]){const b=document.createElement('button');b.style.gridColumn=col;b.style.gridRow=row;b.dataset.face=i;b.title=q('face').options[i].text;b.onclick=()=>{q('face').value=i;layerIndex=0;loadFace()};net.append(b)}
function refreshNet(){for(const b of q('net').children){const i=+b.dataset.face,f=selected()?.faces[i];b.style.backgroundImage=f?'url("'+f+'")':'none';b.textContent=q('face').options[i].text;b.classList.toggle('active',i===+q('face').value)}}
function refreshLibrary(){q('library').replaceChildren(...library.map((c,i)=>new Option('Modèle '+(i+1),i)))}
q('librarySave').onclick=()=>{if(!selected())return;library.push(structuredClone(selected()));refreshLibrary();scheduleDraft()};
q('libraryAdd').onclick=()=>{const c=library[+q('library').value];if(!c||ctl.cubes.length>=512)return;const p=[Math.max(-1,...ctl.cubes.map(c=>c.p[0]))+1,0,0];if(p[0]>100)return;ctl.checkpoint();const n={...structuredClone(c),id:crypto.randomUUID(),p};ctl.cubes.push(n);ctl.selected=n.id;ctl.changed();view.fit(ctl.cubes)};
q('textAdd').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked||!q('text').value)return;ctl.checkpoint();ctx.fillStyle=q('color').value;ctx.font='bold 100px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q('text').value,256,256,470);commit()};
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
  workspaceUI?.refresh();
  controlEditor.diagnostic();
  constraintsEditor.refresh();
  groupEditor.refresh();
}
function renderRules(){controlEditor.render();}
q('mixSeed').oninput=scheduleDraft;
ctl.onSelectionChange=()=>constraintsEditor.refresh();
refreshControlsEditor();

q('muralCreate').onclick=async()=>{const file=q('mural').files[0];if(!file){status('Choisir une image complète');return}const assembly = ctl.cubes;let image;try{image=await createImageBitmap(file);if (ctl.cubes !== assembly) return;const c=muralTiles(image,+q('muralX').value,+q('muralY').value,{
  plane:q('muralPlane').value, angle:+q('muralAngle').value, fill:q('muralFill').checked,
  alpha:q('muralAlpha').checked, offset:[+q('muralOffsetX').value,+q('muralOffsetY').value]
});ctl.checkpoint();ctl.replace(c);reference=structuredClone(c);referenceView=null;ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);status('Fresque créée. Mélanger pour préparer le test.')}catch(e){status(e.message)}finally{image?.close()}};

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
asLayer:q('projectionLayers').checked});ctl.checkpoint();ctl.replace(result.cubes);reference=structuredClone(result.cubes);referenceView=pose;ctl.selected=result.cubes[0].id;ctl.changed();status(result.count+' faces texturées. Vue privée mémorisée.')}catch(e){status(e.message)}finally{image?.close();button.disabled=false}};

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
q('overlayCreate').onclick=async()=>{const file=q('overlayImage').files[0];if(!file){status('Choisir une image');return}const assembly = ctl.cubes;let image;try{image=await createImageBitmap(file);if (ctl.cubes !== assembly) return;const c=overlayLayers(image,+q('overlayCount').value,{mode:q('overlayMode').value,depth:+q('overlayDepth').value});ctl.checkpoint();ctl.replace(c);ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);if(!view.camera.isOrthographicCamera)view.toggleProjection();const d=view.camera.position.distanceTo(view.orbit.target);view.camera.position.copy(view.orbit.target);view.camera.position.z+=d;view.orbit.update();view.render();reference=structuredClone(c);referenceView=captureView();scheduleDraft();status('Superposition créée. Mélanger les cubes pour tester.')}catch(e){status(e.message)}finally{image?.close()}};

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
q('layerFlatten').disabled=stack.length<2||stack.some(layer=>layer.locked||!layer.visible);q('layerOpacity').value=Math.round((l?.opacity??1)*100);for(const id of ['layerDelete','layerUp','layerDown','layerVisible','layerOpacity'])q(id).disabled=!l||(id==='layerDelete'&&l.locked)}
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
q('stampCenter').onclick=()=>{if(!selected()||!faceReady||activeLayer()?.locked)return;ctl.checkpoint();stampAt(256,256);commit()};
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

projects = bindProjects({
  read: () => ({
    version: 2,
    name: q('projectName').value,
    cubes: ctl.cubes,
    reference,
    referenceView,
    references: references.list(),
    publicView,
    library,
    controls: rules,
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
ctl.onRestore = () => {
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
