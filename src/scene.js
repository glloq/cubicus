import {createLight} from './lighting.js';
import {SceneMirrors} from './mirrors.js';
import {faceMaterials} from './materials.js';
import {meshVolume} from './volume-mesh.js';
import * as T from 'three';
import {faceOpacity,alphaFaces} from './model.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const AXES=['X','Y','Z'], COLORS=[0xee6666,0x66dd88,0x6699ff];
function hitFace(hit) {
 const {x, y, z} = hit.face.normal;
 return x ? (x > 0 ? 0 : 1) : y ? (y > 0 ? 2 : 3) : (z > 0 ? 4 : 5);
}
export class SceneView {
 constructor(host,onSelect){
  this.mirrors=new SceneMirrors();this.host=host;this.onSelect=onSelect;this.mode='rotate';this.scene=new T.Scene();this.scene.background=new T.Color(0x151c25);
  this.group=new T.Group();this.gizmo=new T.Group();this.scene.add(this.group,this.gizmo);this.handles=[];this.slots=[];this.slotGroup=new T.Group();this.scene.add(this.slotGroup);this.meshes=[];this.cache=new Map();this.selectedIds=[];this.gapDrag=null;
  this.camera=new T.PerspectiveCamera(45,1,.05,1000);this.camera.position.set(5,4,7);
  this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.domElement.setAttribute('aria-label','Scène 3D');host.append(this.renderer.domElement);
  this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.add(new T.HemisphereLight(0xffffff,0x526070,1.1));
  this.lightType='directional';
  this.light=createLight(this.lightType);
  this.lightMarker=new T.Mesh(new T.SphereGeometry(.14,12,8),new T.MeshBasicMaterial({color:0xffdf9b,depthTest:false}));
  this.lightMarker.renderOrder=23;
  this.scene.add(this.lightMarker);
  this.scene.add(this.light,this.light.target);
  this.receiver=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x66717c,roughness:1}));this.receiver.rotation.x=-Math.PI/2;this.receiver.receiveShadow=true;this.receiver.visible=false;this.scene.add(this.receiver);
  this.geo=new T.BoxGeometry(1,1,1);this.edges=new T.EdgesGeometry(this.geo);this.volumeCache=new Map();this.plainMaterial=new T.MeshStandardMaterial({color:0x61798c,roughness:.85});this.loader=new T.TextureLoader();this.ray=new T.Raycaster();
  this.makeOrbit();this.initViewTools();this.initInput();
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 makeOrbit(target=new T.Vector3()){
  this.orbit?.dispose();this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.copy(target);
  this.orbit.mouseButtons={LEFT:this.mode==='select'?T.MOUSE.ROTATE:null,MIDDLE:T.MOUSE.PAN,RIGHT:T.MOUSE.ROTATE};this.orbit.touches={ONE:this.mode==='select'?T.TOUCH.ROTATE:null,TWO:T.TOUCH.DOLLY_PAN};this.orbit.addEventListener('change',()=>this.render());this.applyCameraRules();this.orbit.update();
 }
 applyCameraRules(rules = this.cameraRules) {
  this.cameraRules = rules;
  this.orbit.enableRotate = rules?.orbit !== false;
  this.orbit.enablePan = rules?.pan !== false;
  this.orbit.enableZoom = rules?.zoom !== false;
  this.orbit.minDistance = rules?.near ?? 0;
  this.orbit.maxDistance = rules?.far ?? Infinity;
  this.orbit.minZoom = rules?.zoomMin ?? 0;
  this.orbit.maxZoom = rules?.zoomMax ?? Infinity;
  const tools = this.host.querySelector('.viewtools');
  if (tools) for (const item of tools.children) {
   item.hidden = item === this.projectionButton ? !this.canChangeProjection()
    : item.dataset.roll ? !rules?.roll : item === this.navRenderer?.domElement ? rules?.navigation === false : rules?.orbit === false;
  }
 }
 setCameraUp(values){
  const target=this.orbit.target.clone();
  this.camera.up.fromArray(values).normalize();
  this.makeOrbit(target);
 }
 rollCamera(angle){
  const direction=this.camera.getWorldDirection(new T.Vector3());
  const up=this.camera.up.clone().applyAxisAngle(direction,angle);
  this.setCameraUp(up.toArray());
  this.render();
 }
 canChangeProjection(){return this.camera.isOrthographicCamera ? this.cameraRules?.perspective !== false : this.cameraRules?.orthographic !== false}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);if(this.camera.isPerspectiveCamera)this.camera.aspect=w/h;else{const half=this.orthoHeight/2;this.camera.left=-half*w/h;this.camera.right=half*w/h;this.camera.top=half;this.camera.bottom=-half}this.camera.updateProjectionMatrix();this.render()}
 initViewTools(){const bar=document.createElement('div');bar.className='viewtools';this.host.append(bar);for(const [name,x,y,z] of [['Face',0,0,1],['Dos',0,0,-1],['Droite',1,0,0],['Gauche',-1,0,0],['Haut',0,1,.00001],['Bas',0,-1,.00001],['3D',1,.8,1.4]]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{if(this.cameraRules?.orbit===false)return;const d=this.camera.position.distanceTo(this.orbit.target);this.camera.position.copy(this.orbit.target).add(new T.Vector3(x,y,z).normalize().multiplyScalar(d));this.orbit.update();this.render()};bar.append(b)}const b=document.createElement('button');b.textContent='Ortho';b.onclick=()=>{if(!this.canChangeProjection())return;this.toggleProjection();b.textContent=this.camera.isOrthographicCamera?'Perspective':'Ortho'};bar.append(b);this.projectionButton=b;for(const direction of [-1,1]){
  const roll=document.createElement('button');
  roll.dataset.roll=String(direction);
  roll.textContent=direction>0?'Roulis +':'Roulis −';
  roll.title='Tourner la caméra de 15°';
  roll.onclick=()=>{if(this.cameraRules?.roll)this.rollCamera(direction*Math.PI/12)};
  bar.append(roll);
 }this.initNavigation(bar);this.applyCameraRules()}
 toggleProjection(){const old=this.camera,target=this.orbit.target.clone();const d=old.position.distanceTo(target);if(old.isPerspectiveCamera){this.orthoHeight=2*d*Math.tan(T.MathUtils.degToRad(old.fov/2))/old.zoom;this.camera=new T.OrthographicCamera(-1,1,1,-1,.05,1000)}else{this.camera=new T.PerspectiveCamera(45,1,.05,1000)}this.camera.position.copy(old.position);this.camera.up.copy(old.up);this.camera.quaternion.copy(old.quaternion);this.makeOrbit(target);this.resize();if(this.projectionButton)this.projectionButton.textContent=this.camera.isOrthographicCamera?'Perspective':'Ortho'}
 pick(e){const r=this.renderer.domElement.getBoundingClientRect();this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera)}
 initInput(){const el=this.renderer.domElement;let drag=null,hover=null;const clear=()=>{if(hover){hover.material.color.setHex(0xffcb70);hover=null}this.dropPreview.visible=false;this.clearSlots();this.orbit.enabled=true;drag=null;this.render()};
  this.dropPreview=new T.LineSegments(this.edges,new T.LineBasicMaterial({color:0x80ffbd,depthTest:false}));this.dropPreview.visible=false;this.dropPreview.renderOrder=30;this.scene.add(this.dropPreview);
  el.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||this.animating)return;this.pick(e);const handle=this.ray.intersectObjects(this.handles,false)[0];const hit=this.ray.intersectObjects(this.meshes,false)[0];drag={pointerId:e.pointerId,x:e.clientX,y:e.clientY,id:hit?.object.userData.id,handle:handle?.object.userData};if(drag.handle?.kind==='spacing'){const axis=drag.handle.axis,i=AXES.indexOf(axis),direction=i<0?new T.Vector3(1,1,1).normalize():new T.Vector3().setComponent(i,1);const origin=handle.object.position.clone(),a=origin.clone().project(this.camera),b=origin.clone().add(direction).project(this.camera),r=el.getBoundingClientRect();const dx=(b.x-a.x)*r.width/2,dy=-(b.y-a.y)*r.height/2;drag.gap={i,dx,dy,value:i<0?this.globalGapValue?.()??0:this.spacing[i],last:this.spacing[i]};this.onGapStart?.()}if(this.mode==='light'||handle||(hit&&this.mode==='move')){el.setPointerCapture(e.pointerId);this.orbit.enabled=false;if(hit&&this.mode==='move')this.showSlots(hit.object.userData.id)}});
  el.addEventListener('pointermove',e=>{if(drag&&drag.pointerId!==e.pointerId)return;if(!drag){if(this.onHoverCube&&e.pointerType==='mouse'&&this.mode!=='select'&&!this.animating){this.pick(e);this.onHoverCube(this.ray.intersectObjects(this.meshes,false)[0]?.object.userData.id)}return}if(drag.gap){const g=drag.gap,den=g.dx*g.dx+g.dy*g.dy;if(den<=25){this.onGapDrag?.(g.i,g.value+(drag.y-e.clientY)/100);return}if(den>25){g.last=Math.max(0,Math.min(2,g.value+((e.clientX-drag.x)*g.dx+(e.clientY-drag.y)*g.dy)/den/Math.max(1,g.i<0?1:this.axisSpan(g.i))));this.onGapDrag?.(g.i,g.last)}return}if(this.mode==='light'){this.onLightDrag?.((e.clientX-drag.x)*.6,(drag.y-e.clientY)*.6,e.shiftKey);drag.x=e.clientX;drag.y=e.clientY;return}if(this.mode!=='move'||!drag.id)return;this.pick(e);const hit=this.ray.intersectObjects(this.meshes,false).find(h=>h.object.userData.id!==drag.id&&this.allowSwap?.(drag.id,h.object.userData.id)!==false);const slot=this.ray.intersectObjects(this.slots,false)[0];this.dropPreview.visible=!!(hit||slot);if(hit)this.dropPreview.position.copy(hit.object.position);else if(slot)this.dropPreview.position.copy(slot.object.position);this.render()});
  el.addEventListener('pointerup',e=>{if(!drag||e.button!==0||drag.pointerId!==e.pointerId)return;const a=drag,d=Math.hypot(e.clientX-a.x,e.clientY-a.y);this.pick(e);const hit=this.ray.intersectObjects(this.meshes,false)[0],slot=this.ray.intersectObjects(this.slots,false)[0];clear();if(a.gap){this.onGapEnd?.();return;}if(this.mode==='light'){this.onLightEnd?.();return}if(a.handle&&d<15){this.onHandle?.(a.handle);return}if(this.mode==='move'&&a.id&&hit&&hit.object.userData.id!==a.id&&d>5&&this.allowSwap?.(a.id,hit.object.userData.id)!==false){this.onDrop?.(a.id,hit.object.userData.id);return}if(this.mode==='move'&&a.id&&slot&&d>5){this.onMoveSlot?.(a.id,slot.object.userData.slot);return}if(d<5&&hit)this.onSelect(hit.object.userData.id,hitFace(hit))});
  const cancel=()=>{if(!drag)return;const spacing=Boolean(drag.gap);clear();if(spacing)this.onGapEnd?.();if(this.mode==='light')this.onLightEnd?.()};
  el.addEventListener('pointerleave',()=>this.onHoverCube?.(null));
  el.addEventListener('pointerdown',event=>{
   if(event.pointerType==='touch'&&!event.isPrimary&&drag)cancel();
  },true);
  const cancelPointer=event=>{if(drag?.pointerId===event.pointerId)cancel()};
  el.addEventListener('pointercancel',cancelPointer);
  el.addEventListener('lostpointercapture',cancelPointer);
 }
 highlightHover(ids){
  const next=new Set(ids);
  if (next.size===this.hoverIds?.size&&[...next].every(id=>this.hoverIds.has(id))) return;
  this.hoverIds=next;
  for(const mesh of this.meshes){
   const selected=this.selectedIds.includes(mesh.userData.id)&&this.mode!=='select';
   const hover=next.has(mesh.userData.id)&&!selected;
   mesh.children[0].visible=selected||hover;
   mesh.children[0].material.color.setHex(hover?0x80ffbd:0xffcb70);
  }
  this.render();
 }
 clearSlots(){for(const m of this.slots){this.slotGroup.remove(m);m.material.dispose();m.children[0].material.dispose()}this.slots=[]}
 showSlots(id){this.clearSlots();const c=this.cubes?.find(c=>c.id===id);if(!c)return;const used=new Set(this.cubes.map(c=>c.p.join(',')));for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const p=[...c.p];p[axis]+=sign;if(used.has(p.join(','))||p.some(v=>Math.abs(v)>100)||this.allowSlot?.(id,p)===false)continue;const m=new T.Mesh(this.geo,new T.MeshBasicMaterial({color:0x6cd9b9,transparent:true,opacity:.14,depthWrite:false}));m.position.set(...p.map((v,i)=>(v-this.center[i])*(1+this.spacing[i])));m.userData.slot=p;m.add(new T.LineSegments(this.edges,new T.LineBasicMaterial({color:0x6cd9b9})));this.slotGroup.add(m);this.slots.push(m)}this.render()}
 axisSpan(i){return Math.max(1,...(this.cubes||[]).map(c=>Math.abs(c.p[i]-(this.center?.[i]||0))))}
 setMode(mode){this.mode=mode;this.orbit.mouseButtons.LEFT=mode==='select'?T.MOUSE.ROTATE:null;this.orbit.touches.ONE=mode==='select'?T.TOUCH.ROTATE:null;this.renderer.domElement.style.cursor=mode==='move'?'grab':mode==='light'||mode==='spacing'?'crosshair':mode==='select'?'grab':'default';this.updateGizmo(this.selectedIds);this.render()}
 updateGizmo(selected){
 const active=this.mode==='spacing'?this.spacingAxes??AXES:this.rotationHandles??AXES;
 const meshKey=this.mode==='spacing'
  ? this.meshes.map(mesh=>mesh.position.toArray().join(',')).join(';')
  : this.meshes.filter(mesh=>selected.includes(mesh.userData.id)).map(mesh=>mesh.position.toArray().join(',')).join(';');
 const key=JSON.stringify([this.mode,selected,this.animating,active,this.handleAnchor,this.globalSpacing,meshKey]);
 this.selectedIds=selected;
 if(this.gizmoKey===key)return;
 this.gizmoKey=key;
 for(const h of this.handles){this.gizmo.remove(h);h.geometry.dispose();h.material.dispose()}this.handles=[];if(this.mode==='spacing'){this.makeSpacingHandles();return}if(this.mode!=='rotate'||!selected.length||this.animating)return;const meshes=this.meshes.filter(m=>this.handleAnchor?m.userData.id===this.handleAnchor:selected.includes(m.userData.id));if(!meshes.length)return;const b=new T.Box3();for(const m of meshes)b.expandByPoint(m.position);const center=b.getCenter(new T.Vector3()),radius=Math.max(.85,b.getSize(new T.Vector3()).length()/2+.85);for(const [i,axis] of AXES.entries())for(const sign of [-1,1]){if(this.rotationHandles&&!this.rotationHandles.some(handle=>handle.axis===axis&&handle.sign===sign))continue;const r=radius+i*.12,h=new T.Mesh(new T.TorusGeometry(r,.055,8,30,Math.PI*.68),new T.MeshBasicMaterial({color:COLORS[i],depthTest:false}));h.position.copy(center);if(axis==='X')h.rotation.y=Math.PI/2;if(axis==='Y')h.rotation.x=-Math.PI/2;h.rotateZ(sign<0?Math.PI:0);h.renderOrder=20;h.userData={axis,sign};this.gizmo.add(h);this.handles.push(h);const a=sign>0?Math.PI*.68:0,arrow=new T.Mesh(new T.ConeGeometry(.14,.3,10),new T.MeshBasicMaterial({color:COLORS[i],depthTest:false}));arrow.position.set(r*Math.cos(a),r*Math.sin(a),0).applyQuaternion(h.quaternion).add(center);arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-Math.sin(a)*sign,Math.cos(a)*sign,0).applyQuaternion(h.quaternion));arrow.userData={axis,sign};arrow.renderOrder=21;this.gizmo.add(arrow);this.handles.push(arrow)}}
 makeSpacingHandles(){if(!this.meshes.length||this.animating)return;const b=new T.Box3();for(const m of this.meshes)b.expandByPoint(m.position);for(let i=0;i<3;i++){if(this.spacingAxes&&!this.spacingAxes.includes(AXES[i]))continue;if(this.axisSpan(i)===1&&this.cubes.every(c=>c.p[i]===this.cubes[0].p[i]))continue;const dir=new T.Vector3().setComponent(i,1);const h=new T.Mesh(new T.ConeGeometry(.15,.36,16),new T.MeshBasicMaterial({color:COLORS[i],depthTest:false}));h.position.copy(dir).multiplyScalar(b.max.getComponent(i)+.95);h.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);h.userData={kind:'spacing',axis:AXES[i]};h.renderOrder=22;this.gizmo.add(h);this.handles.push(h)}
 if(this.globalSpacing){
  const direction=new T.Vector3(1,1,1).normalize();
  const h=new T.Mesh(new T.ConeGeometry(.17,.38,16),new T.MeshBasicMaterial({color:0xffcb70,depthTest:false}));
  h.position.copy(b.max).addScaledVector(direction,.95);
  h.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
  h.userData={kind:'spacing',axis:'global'};
  h.renderOrder=22;
  this.gizmo.add(h);
  this.handles.push(h);
 }}
 render(){
  if(this.lightMarker){
   this.lightMarker.visible=this.mode==='light';
   this.lightMarker.position.copy(this.light.position);
   if(this.lightType==='directional')this.lightMarker.position.setLength((this.extent??2)+.5);
  }
  this.mirrors.setProjection(this.camera);this.renderer.render(this.scene,this.camera);this.updateNavigation()}
 updateNavigation(){if(!this.navCube||this.cameraRules?.navigation===false||this.navOrientation?.equals(this.camera.quaternion))return;this.navOrientation ??= new T.Quaternion();this.navOrientation.copy(this.camera.quaternion);this.navCamera.quaternion.copy(this.camera.quaternion);this.navCamera.position.set(0,0,4).applyQuaternion(this.camera.quaternion);this.navCamera.updateMatrixWorld(true);this.navRenderer.render(this.navScene,this.navCamera)}
 initNavigation(bar){
  this.navScene=new T.Scene();this.navCamera=new T.OrthographicCamera(-1.35,1.35,1.35,-1.35,.1,20);this.navCamera.position.z=4;
  this.navRenderer=new T.WebGLRenderer({antialias:true,alpha:true});this.navRenderer.setPixelRatio(Math.min(devicePixelRatio,2));this.navRenderer.setSize(104,104);this.navRenderer.domElement.setAttribute('aria-label','Cube de navigation');
  const labels=['D','G','H','B','F','A'],colors=['#c97878','#b86666','#81bc91','#659e75','#82abd7','#628bb8'];
  const mats=labels.map((label,i)=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=colors[i];x.fillRect(0,0,128,128);x.strokeStyle='#26333e';x.lineWidth=5;x.strokeRect(2,2,124,124);x.fillStyle='#182431';x.font='bold 52px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(label,64,64);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:t})});
  this.navCube=new T.Mesh(new T.BoxGeometry(1.6,1.6,1.6),mats);this.navScene.add(this.navCube);bar.prepend(this.navRenderer.domElement);
  this.navRenderer.domElement.addEventListener('click',e=>{if(this.cameraRules?.navigation===false)return;const r=e.currentTarget.getBoundingClientRect(),ray=new T.Raycaster();this.navCamera.updateMatrixWorld(true);ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.navCamera);const hit=ray.intersectObject(this.navCube)[0];if(!hit)return;const dirs=[[1,0,0],[-1,0,0],[0,1,.00001],[0,-1,.00001],[0,0,1],[0,0,-1]];const d=this.camera.position.distanceTo(this.orbit.target);this.camera.position.copy(this.orbit.target).add(new T.Vector3(...dirs[hit.face.materialIndex]).normalize().multiplyScalar(d));this.orbit.update();this.render()});
  this.updateNavigation();
 }
 texture(src){if(!src)return null;if(!this.cache.has(src)){const t=this.loader.load(src,()=>this.render());t.colorSpace=T.SRGBColorSpace;this.cache.set(src,t)}return this.cache.get(src)}
 update(cubes,selected=[],spacing=[.12,.12,.12],animate=false){this.animationToken=(this.animationToken||0)+1;const token=this.animationToken;const old=new Map(this.meshes.map(m=>[m.userData.id,m]));const center=[0,1,2].map(i=>cubes.length?(Math.min(...cubes.map(c=>c.p[i]))+Math.max(...cubes.map(c=>c.p[i])))/2:0);this.cubes=cubes;this.center=center;this.spacing=spacing;const transitions=[];const activeVolumes=new Set();this.meshes=[];this.hoverIds=new Set();
  for(const c of cubes){let m=old.get(c.id);if(m){old.delete(c.id)}else{m=new T.Mesh(this.geo,[]);this.group.add(m);m.userData.id=c.id;m.castShadow=true;m.receiveShadow=true;const line=new T.LineSegments(this.edges,new T.LineBasicMaterial({color:0xffcb70}));m.add(line)}
   const volumeKey = c.volume ? c.volume.size + ':' + c.volume.cells : null;
   if (volumeKey) activeVolumes.add(volumeKey);
   if (m.userData.volumeKey !== volumeKey) {
    if (volumeKey && !this.volumeCache.has(volumeKey)) {
      const mesh = meshVolume(c.volume);
      this.volumeCache.set(volumeKey, {mesh, edges: new T.EdgesGeometry(mesh)});
    }
    const cached = this.volumeCache.get(volumeKey);
    m.geometry = cached?.mesh ?? this.geo;
    m.children[0].geometry = cached?.edges ?? this.edges;
    m.userData.volumeKey = volumeKey;
   }
   const opacity = faceOpacity(c.opacity);
   const alpha = alphaFaces(c.alphaFaces);
   const materials = faceMaterials(c.materials);
   const key = JSON.stringify([opacity, alpha, materials, this.neutralMaterials]);
   if (m.userData.faceKey !== key || c.faces.some((source, i) => source !== m.userData.sources?.[i])) {
    if (Array.isArray(m.material)) m.material.forEach(material => material.dispose());
    const plain = !this.neutralMaterials && !c.faces.some(Boolean) && opacity.every(value => value === 1)
      && !alpha.some(Boolean) && materials.every(({mode, color, blend}) => mode === 'lit' && !color && !blend);
    m.material = plain ? this.plainMaterial : c.faces.map((source, i) => {
     const {mode, color, blend} = materials[i];
     const tint = color ?? (source ? 0xffffff : 0x61798c);
     const transparent = blend || opacity[i] < 1;
     const options = {
      color: this.neutralMaterials ? (source ? 0xffffff : 0x61798c) : tint,
      map: this.texture(source),
      transparent,
      alphaTest: alpha[i] ? .5 : 0,
      opacity: opacity[i],
      depthWrite: !transparent,
      visible: opacity[i] > 0,
      side: alpha[i] ? T.DoubleSide : T.FrontSide
     };
     if (mode === 'unlit' || this.neutralMaterials) return new T.MeshBasicMaterial(options);
     if (mode === 'emissive') {
      options.emissive = tint;
      options.emissiveMap = options.map;
      options.emissiveIntensity = .8;
     }
     return new T.MeshStandardMaterial({...options, roughness: .85});
    });
    m.userData.faceKey = key;
    m.userData.sources = [...c.faces];
    m.castShadow = opacity.every(value => value === 1) && !materials.some(material => material.blend);
   }
   const p=new T.Vector3(...c.p.map((v,i)=>(v-center[i])*(1+spacing[i]))),r=c.r,q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1));if(animate&&m.userData.placed)transitions.push({m,p,q,from:m.position.clone(),rot:m.quaternion.clone()});else{m.position.copy(p);m.quaternion.copy(q)}m.userData.placed=true;m.children[0].visible=selected.includes(c.id)&&this.mode!=='select';m.children[0].material.color.setHex(0xffcb70);this.meshes.push(m)}
  for(const m of old.values()){this.group.remove(m);if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());m.children[0].material.dispose()}
  for (const [key, volume] of this.volumeCache) if (!activeVolumes.has(key)) {
   volume.mesh.dispose();
   volume.edges.dispose();
   this.volumeCache.delete(key);
  }
  this.mirrors.update(this.meshes, cubes, this.neutralMaterials);
  const used=new Set(cubes.flatMap(c=>c.faces).filter(Boolean));for(const [k,t] of this.cache)if(!used.has(k)){t.dispose();this.cache.delete(k)}
  this.extent=Math.max(2,...this.meshes.map(m=>m.position.length()+1),...transitions.map(a=>a.p.length()+1));this.receiver.position.y=Math.min(0,...this.meshes.map(m=>m.position.y))-.65;const sc=this.light.shadow.camera;sc.left=sc.bottom=-this.extent*1.5;sc.right=sc.top=this.extent*1.5;sc.far=1000;sc.updateProjectionMatrix();
  this.animating=transitions.length>0;this.updateGizmo(selected);if(this.animating){const start=performance.now();const frame=now=>{if(token!==this.animationToken)return;const t=Math.min(1,(now-start)/180),ease=t*t*(3-2*t);for(const a of transitions){a.m.position.lerpVectors(a.from,a.p,ease);a.m.quaternion.slerpQuaternions(a.rot,a.q,ease)}if(t<1)requestAnimationFrame(frame);else{this.animating=false;this.updateGizmo(this.selectedIds);this.onAnimationEnd?.()}this.render()};requestAnimationFrame(frame)}this.render()
 }
 fit(){const n=Math.max(2,this.extent||2);this.camera.position.set(n*1.3,n,n*1.8);this.orbit.target.set(0,0,0);if(this.camera.isOrthographicCamera){this.orthoHeight=n*2.5;this.camera.zoom=1;this.resize()}this.orbit.update();this.render()}
 setLightEquipment(type){
  if(this.lightType===type)return;
  this.light.removeFromParent();
  this.light.target?.removeFromParent();
  this.light.shadow.dispose();
  this.lightType=type;
  this.light=createLight(type);
  this.scene.add(this.light);
  if(this.light.target)this.scene.add(this.light.target);
  this.light.castShadow=this.renderer.shadowMap.enabled;
 }
 setLight(a,e){
  const r=Math.PI/180,d=Math.max(10,(this.extent||2)*3);
  const vector=new T.Vector3(Math.cos(e*r)*Math.cos(a*r),Math.sin(e*r),Math.cos(e*r)*Math.sin(a*r)).multiplyScalar(d);
  if(this.lightType==='directional')this.light.position.copy(vector);
  if(this.lightType==='spot')this.light.target.position.copy(this.light.position).sub(vector);
  this.render();
 }
 setLightSettings({position,intensity,angle}){
  if(this.lightType!=='directional')this.light.position.fromArray(position);
  this.light.intensity=intensity;
  if(this.lightType==='spot')this.light.angle=angle*Math.PI/180;
  this.render();
 }
 setShadows(v){this.renderer.shadowMap.enabled=v;this.receiver.visible=v;this.light.castShadow=v;this.render()}
}
