import { preparePublicPuzzle } from './public-authoring.js';
import { bindVolumeEditor } from './studio-volumes.js';
import { bindFaceWorkspace } from './face-workspace.js';
import { bindProjects } from './studio-projects.js';
import {drawStamp} from './stamps.js';import {privateLayers,composeLayers} from './layers.js';import {SceneView} from './scene.js';import {Controller} from './controller.js';import {cube,grid,shuffle,publicControls,CONTROL_KEYS,faceOpacity,alphaFaces} from './model.js';import {demo} from './demo.js';import {overlayLayers} from './overlay.js';import {bakeProjection} from './anamorph.js';import {muralTiles} from './mural.js';import {download,putPuzzle} from './storage.js';
const q=id=>document.getElementById(id),canvas=q('paint'),ctx=canvas.getContext('2d');let rules=publicControls(),library=[],ctl,reference=null,referenceView=null,clipboard=null,paintVersion=0,faceReady=true,layerIndex=0,layerJob=0;const view=new SceneView(q('view'),(id,face)=>{q('face').value=face;layerIndex=0;ctl.select(id)});ctl=new Controller(view,q('controls'),grid(2,2,1),()=>{loadFace();scheduleDraft()});function selected(){return ctl.cubes.find(c=>c.id===ctl.selected)}function status(s){q('status').textContent=s}function loadFace(){volumeEditor.refresh();refreshCubePicker();refreshLayers();refreshMaterial();faceWorkspace.reset();faceReady=false;refreshNet();const version=++paintVersion;ctx.clearRect(0,0,512,512);if(!layerStack().length&&!alphaFaces(selected()?.alphaFaces)[+q('face').value]){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}const f=activeLayer()?.image||(!layerStack().length?selected()?.faces[+q('face').value]:null);if(f){const im=new Image();im.onload=()=>{if(version===paintVersion){ctx.drawImage(im,0,0,512,512);faceReady=true}};im.onerror=()=>{if(version===paintVersion){faceReady=true;status('Texture illisible')}};im.src=f}else faceReady=true}function commit(){const c=selected();if(!c)return;const f=+q('face').value,l=activeLayer();if(l){l.image=canvas.toDataURL('image/png');recompose(c,f)}else{c.faces[f]=canvas.toDataURL('image/png');ctl.draw();refreshNet();scheduleDraft()}}q('face').onchange=()=>{layerIndex=0;loadFace()};const faceWorkspace = bindFaceWorkspace(canvas, {
  checkpoint: () => ctl.checkpoint(),
  commit,
  canDraw: () => Boolean(selected()) && faceReady,
  stamp: stampAt,
  alpha: () => q('alphaFace').checked || Boolean(activeLayer())
});
q('image').onchange=async e=>{const file=e.target.files[0],id=ctl.selected,face=+q('face').value;if(!file||!id)return;try{const im=await createImageBitmap(file);if(ctl.selected!==id||+q('face').value!==face){im.close();return}ctl.checkpoint();ctx.clearRect(0,0,512,512);if(!activeLayer()&&!q('alphaFace').checked){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}const s=Math.min(512/im.width,512/im.height);ctx.drawImage(im,(512-im.width*s)/2,(512-im.height*s)/2,im.width*s,im.height*s);im.close();commit()}catch(e){status(e.message)}};q('clear').onclick=()=>{if(!selected()||!faceReady)return;ctl.checkpoint();ctx.clearRect(0,0,512,512);if(!activeLayer()&&!q('alphaFace').checked){ctx.fillStyle='#304050';ctx.fillRect(0,0,512,512)}commit()};q('turn').onclick=()=>{if(!selected()||!faceReady)return;ctl.checkpoint();const tmp=document.createElement('canvas');tmp.width=tmp.height=512;tmp.getContext('2d').drawImage(canvas,0,0);ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,256);ctx.rotate(Math.PI/2);ctx.drawImage(tmp,-256,-256);ctx.restore();commit()};q('copy').onclick=()=>{if(!faceReady||!selected())return;clipboard=canvas.toDataURL()};q('paste').onclick=()=>{if(!selected()||!clipboard)return;ctl.checkpoint();const l=activeLayer();if(l){l.image=clipboard;recompose(selected(),+q('face').value);loadFace()}else{selected().faces[+q('face').value]=clipboard;ctl.changed()}};q('generate').onclick=()=>{const dims=['nx','ny','nz'].map(id=>Math.max(1,Math.min(8,Math.floor(+q(id).value)||1)));ctl.checkpoint();ctl.replace(grid(...dims));ctl.selected=ctl.cubes[0].id;ctl.changed();view.fit(ctl.cubes)};function add(duplicate){if(ctl.cubes.length>=512)return;const p=[Math.max(-1,...ctl.cubes.map(c=>c.p[0]))+1,0,0];if(p[0]>100){status('Limite de grille');return}const c=duplicate&&selected()?{...structuredClone(selected()),id:crypto.randomUUID(),p}:cube(p);ctl.checkpoint();ctl.cubes.push(c);ctl.selected=c.id;ctl.changed();view.fit(ctl.cubes)}q('add').onclick=()=>add(false);q('duplicate').onclick=()=>add(true);q('remove').onclick=()=>{if(!selected()||ctl.cubes.length===1)return;ctl.checkpoint();ctl.replace(ctl.cubes.filter(c=>c.id!==ctl.selected))};q('shuffle').onclick=()=>{ctl.checkpoint();shuffle(ctl.cubes,{positions:q('shufflePos').checked,rotations:q('shuffleRot').checked});ctl.changed()};q('reference').onclick=()=>{reference=structuredClone(ctl.cubes);referenceView=captureView();status('Conception mémorisée');scheduleDraft()};q('restore').onclick=()=>{if(reference){ctl.checkpoint();ctl.replace(reference);restoreView(referenceView)}};function publicSnapshot() {
  if (pendingLayers.size || hasFailedComposition()) {
    throw new Error('La composition des calques doit être terminée');
  }
  return preparePublicPuzzle(ctl.cubes, rules);
}

q('export').onclick = async () => {
  try {
    download(await publicSnapshot(), 'level.puzzle');
  } catch (error) {
    status(error.message);
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
q('textAdd').onclick=()=>{if(!selected()||!faceReady||!q('text').value)return;ctl.checkpoint();ctx.fillStyle=q('color').value;ctx.font='bold 100px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q('text').value,256,256,470);commit()};
q('demo').onclick=()=>{ctl.checkpoint();ctl.replace(demo(4));ctl.selected=ctl.cubes[0].id;ctl.changed();view.fit(ctl.cubes)};
const volumeEditor = bindVolumeEditor({
  selected,
  checkpoint: () => ctl.checkpoint(),
  change: () => ctl.changed(),
  status
});
refreshNet();

ctl.selected=ctl.cubes[0].id;ctl.draw();loadFace();view.fit(ctl.cubes);

function renderRules(){const host=q('publicControls');host.replaceChildren();const names={rotate:'Rotation',move:'Déplacement',groups:'Lignes et couches',spacing:'Écartement',light:'Lumière',shadows:'Ombres'};for(const key of CONTROL_KEYS){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=rules[key];box.onchange=()=>{rules[key]=box.checked;scheduleDraft()};label.append(box,' '+names[key]);host.append(label)}}
renderRules();

q('muralCreate').onclick=async()=>{const file=q('mural').files[0];if(!file){status('Choisir une image complète');return}let image;try{image=await createImageBitmap(file);const c=muralTiles(image,+q('muralX').value,+q('muralY').value);ctl.checkpoint();ctl.replace(c);reference=structuredClone(c);referenceView=null;ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);status('Fresque créée. Mélanger pour préparer le test.')}catch(e){status(e.message)}finally{image?.close()}};

function captureView(){return {position:view.camera.position.toArray(),target:view.orbit.target.toArray(),orthographic:view.camera.isOrthographicCamera,zoom:view.camera.zoom,height:view.orthoHeight,spacing:[...ctl.spacing]}}
function restoreView(v){if(!v||!Array.isArray(v.position)||!Array.isArray(v.target)||!Array.isArray(v.spacing)||[...v.position,...v.target,...v.spacing,v.zoom].some(x=>!Number.isFinite(x))||v.position.length!==3||v.target.length!==3||v.spacing.length!==3||v.spacing.some(x=>x<0||x>2)||v.zoom<=0)return;if(Boolean(view.camera.isOrthographicCamera)!==Boolean(v.orthographic))view.toggleProjection();if(v.orthographic&&Number.isFinite(v.height)&&v.height>0)view.orthoHeight=v.height;view.camera.position.fromArray(v.position);view.orbit.target.fromArray(v.target);view.camera.zoom=v.zoom;ctl.setSpacing(v.spacing);ctl.draw();view.resize();view.orbit.update()}
q('projectionView').onclick=()=>restoreView(referenceView);
q('projectImage').onclick=async()=>{const file=q('projectionImage').files[0];if(!file){status('Choisir une image à projeter');return}let image;const button=q('projectImage');button.disabled=true;try{image=await createImageBitmap(file);const pose=captureView();const result=bakeProjection(image,view,ctl.cubes,{resolution:+q('projectionResolution').value,preserve:q('projectionKeep').checked});ctl.checkpoint();ctl.replace(result.cubes);reference=structuredClone(result.cubes);referenceView=pose;ctl.selected=result.cubes[0].id;ctl.changed();status(result.count+' faces texturées. Vue privée mémorisée.')}catch(e){status(e.message)}finally{image?.close();button.disabled=false}};

function refreshMaterial(){const c=selected(),f=+q('face').value;const v=faceOpacity(c?.opacity)[f];q('faceOpacity').value=Math.round(v*100);q('opacityValue').value=Math.round(v*100)+'%';q('alphaFace').checked=alphaFaces(c?.alphaFaces)[f];for(const input of q('openFaces').querySelectorAll('input'))input.checked=faceOpacity(c?.opacity)[+input.dataset.face]===0}
q('faceOpacity').oninput=e=>{q('opacityValue').value=e.target.value+'%'};
q('faceOpacity').onchange=e=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=faceOpacity(c.opacity);c.opacity[+q('face').value]=+e.target.value/100;ctl.changed()};
q('opacityAll').onclick=()=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=Array(6).fill(+q('faceOpacity').value/100);ctl.changed()};
q('alphaFace').onchange=e=>{const c=selected();if(!c)return;ctl.checkpoint();c.alphaFaces=alphaFaces(c.alphaFaces);c.alphaFaces[+q('face').value]=e.target.checked;ctl.changed()};
q('overlayCreate').onclick=async()=>{const file=q('overlayImage').files[0];if(!file){status('Choisir une image');return}let image;try{image=await createImageBitmap(file);const c=overlayLayers(image,+q('overlayCount').value);ctl.checkpoint();ctl.replace(c);ctl.selected=c[0].id;q('face').value=4;ctl.changed();view.fit(c);if(!view.camera.isOrthographicCamera)view.toggleProjection();const d=view.camera.position.distanceTo(view.orbit.target);view.camera.position.copy(view.orbit.target);view.camera.position.z+=d;view.orbit.update();view.render();reference=structuredClone(c);referenceView=captureView();scheduleDraft();status('Superposition créée. Mélanger les cubes pour tester.')}catch(e){status(e.message)}finally{image?.close()}};

const workspace=document.querySelector('.studio-layout');
function stage(name){workspace.dataset.stage=name;for(const b of document.querySelectorAll('[data-stage]'))if(b.tagName==='BUTTON'){b.classList.toggle('active',b.dataset.stage===name);b.setAttribute('aria-pressed',String(b.dataset.stage===name))}for(const p of workspace.querySelectorAll('[data-panel]'))p.hidden=p.dataset.panel!==name;view.resize()}
for(const b of document.querySelectorAll('.studio-tabs button'))b.onclick=()=>stage(b.dataset.stage);
stage('assembly');

function layerStack(){const c=selected();return c?.layers?.[+q('face').value]||[]}
function activeLayer(){return layerStack()[layerIndex]}
function refreshLayers(){const list=q('layerList'),stack=layerStack();layerIndex=Math.max(0,Math.min(layerIndex,stack.length-1));list.replaceChildren(...stack.map((l,i)=>new Option(l.name,i)));list.value=String(layerIndex);const l=activeLayer();q('layerVisible').checked=l?.visible!==false;q('layerOpacity').value=Math.round((l?.opacity??1)*100);for(const id of ['layerDelete','layerUp','layerDown','layerVisible','layerOpacity'])q(id).disabled=!l}
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
q('layerDelete').onclick=()=>{const c=selected(),f=+q('face').value;if(!activeLayer())return;ctl.checkpoint();layerStack().splice(layerIndex,1);layerIndex=Math.max(0,layerIndex-1);if(!layerStack().length){pendingLayers.delete(c.id+':'+f);failedLayers.delete(c.id+':'+f);c.faces[f]=null;ctl.changed()}else{loadFace();recompose(c,f)}};
function reorderLayer(delta){const c=selected(),f=+q('face').value,stack=layerStack(),to=layerIndex+delta;if(!activeLayer()||to<0||to>=stack.length)return;ctl.checkpoint();[stack[layerIndex],stack[to]]=[stack[to],stack[layerIndex]];layerIndex=to;loadFace();recompose(c,f)}
q('layerUp').onclick=()=>reorderLayer(1);q('layerDown').onclick=()=>reorderLayer(-1);
q('layerVisible').onchange=e=>{if(!activeLayer())return;ctl.checkpoint();activeLayer().visible=e.target.checked;recompose(selected(),+q('face').value)};
q('layerOpacity').onchange=e=>{if(!activeLayer())return;ctl.checkpoint();activeLayer().opacity=+e.target.value/100;recompose(selected(),+q('face').value)};

function stampAt(x,y){drawStamp(ctx,{symbol:q('stampSymbol').value,x,y,size:+q('stampSize').value,angle:+q('stampAngle').value,color:q('color').value,width:+q('width').value,fill:q('stampFill').checked})}
q('stampMode').onclick=()=>{q('brush').value='stamp';status('Cliquer sur la face pour placer le symbole')};
q('stampCenter').onclick=()=>{if(!selected()||!faceReady)return;ctl.checkpoint();stampAt(256,256);commit()};
q('auditProject').onclick=async()=>{const lines=[];try{const p=await publicSnapshot();lines.push('Format public : valide');lines.push('Cubes : '+p.cubes.length);lines.push('Faces décorées : '+p.cubes.reduce((n,c)=>n+c.faces.filter(Boolean).length,0));lines.push('Export : '+(new Blob([JSON.stringify(p)]).size/1024).toFixed(1)+' Kio');if(!rules.rotate&&!rules.move&&!rules.spacing&&!rules.light)lines.push('Observation seule');if(!reference)lines.push('Attention : aucune configuration de référence');if(reference&&reference.length!==ctl.cubes.length)lines.push('Attention : nombre de cubes différent de la référence');if(reference&&reference.length===ctl.cubes.length&&reference.every(c=>{const other=ctl.cubes.find(x=>x.id===c.id);return other&&c.p.join()===other.p.join()&&c.r.join()===other.r.join()}))lines.push('Attention : poses identiques à la référence');if(pendingLayers.size)lines.push('Attention : composition en cours');lines.push('Lisibilité et résistance algorithmique : contrôle manuel nécessaire')}catch(e){lines.push('Erreur : '+e.message)}q('auditResult').textContent=lines.join('\n')};

for(const [i,name] of ['Droite','Gauche','Haut','Bas','Avant','Arrière'].entries()){const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.face=i;input.onchange=()=>{const c=selected();if(!c)return;ctl.checkpoint();c.opacity=faceOpacity(c.opacity);c.opacity[i]=input.checked?0:1;ctl.changed()};l.append(input,' '+name+' ouverte');q('openFaces').append(l)}
function setOpen(open){const c=selected();if(!c)return;ctl.checkpoint();c.opacity=Array(6).fill(open?0:1);ctl.changed()}
q('openAll').onclick=()=>setOpen(true);q('closeAll').onclick=()=>setOpen(false);
refreshMaterial();

function refreshCubePicker(){const picker=q('cubePicker');picker.replaceChildren(...ctl.cubes.map((c,i)=>new Option('Cube '+(i+1)+' · '+c.p.join(', '),c.id)));picker.value=ctl.selected||''}
q('cubePicker').onchange=e=>{if(!e.target.value)return;layerIndex=0;ctl.select(e.target.value)};

let projects;
function scheduleDraft() { projects?.schedule(); }

projects = bindProjects({
  read: () => ({
    version: 2,
    name: q('projectName').value,
    cubes: ctl.cubes,
    reference,
    referenceView,
    library,
    controls: rules,
    view: captureView()
  }),
  apply(project) {
    reference = project.reference;
    referenceView = project.referenceView;
    library = project.library;
    rules = project.controls;
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
q('studioHeader').append(q('undo'), q('redo'));
