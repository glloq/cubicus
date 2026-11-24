import { History } from './history.js';
import {mul,quarter,moveTo,rotateGroup,publicControls} from './model.js';
export class Controller{
 constructor(view,host,cubes,onChange=()=>{}){this.host=host;this.rules=publicControls();this.view=view;this.cubes=cubes;this.onChange=onChange;this.selected=null;this.scope='cube';this.axis='X';this.spacing=[.12,.12,.12];this.history=new History();this.swap=false;host.innerHTML='<h3>Manipulation</h3><div class="toolstrip"><button data-mode="rotate" class="active">Tourner</button><button data-mode="move">Déplacer</button><button data-mode="select">Observer</button><button data-mode="spacing">Écarter</button><button data-mode="light">Lumière</button></div><p class="help">Clic : sélectionner · Glisser à droite : orbiter · Molette : zoom</p><div class="selectiontools"><label>Sélection <select id="scope"><option value="cube">Cube</option><option value="line">Ligne</option><option value="layer">Couche</option><option value="all">Tout</option></select></label><label id="axisLabel">Axe <select id="axis"><option>X</option><option>Y</option><option>Z</option></select></label><output id="selectionCount" class="selectionCount"></output><button id="swap" title="Alternative au glisser-déposer">Permuter par clics</button><label><input type="checkbox" id="rigid"> Rotation collective</label><details><summary>Déplacer vers case vide</summary><div id="moves"></div></details></div><p id="hint" role="status"></p><details class="rotationtools"><summary>Rotation précise</summary><div id="rotations"></div></details><div class="spacingtools"><label>Écartement <input id="gap" type="range" min="0" max="200" value="12"></label><details><summary>Axes séparés</summary><div id="gaps"></div></details></div><details class="lighttools"><summary>Lumière et ombres</summary><label><input type="checkbox" id="shadows"> Ombres au sol</label><label>Azimut <input id="az" type="range" min="0" max="360" value="45"></label><label>Élévation <input id="el" type="range" min="-90" max="90" value="45"></label></details><button id="undo">Annuler</button><button id="redo">Rétablir</button><button id="fit">Recentrer</button>';const q=id=>host.querySelector('#'+id);q('scope').onchange=e=>{this.scope=this.rules.groups&&this.cubes.length>1?e.target.value:'cube';this.draw()};q('axis').onchange=e=>{this.axis=e.target.value;this.draw()};q('swap').onclick=()=>{if(!this.rules.move||this.cubes.length<2)return;this.swap=!this.swap;q('swap').textContent=this.swap?'Choisir destination':'Permuter'};for(const a of ['X','Y','Z'])for(const s of [-1,1]){const b=document.createElement('button');b.textContent=a+' '+(s<0?'−':'+')+'90°';b.onclick=()=>this.rotate(a,s);q('rotations').append(b)}this.gapInputs=[];for(const [i,a] of ['X','Y','Z'].entries()){const l=document.createElement('label');l.textContent=a;const input=document.createElement('input');Object.assign(input,{type:'range',min:0,max:200,value:12});input.oninput=()=>{this.spacing[i]=+input.value/100;this.draw()};l.append(input);q('gaps').append(l);this.gapInputs.push(input)}q('gap').oninput=e=>{this.spacing.fill(+e.target.value/100);this.gapInputs.forEach(i=>i.value=e.target.value);this.draw()};q('az').oninput=q('el').oninput=()=>{if(this.rules.light)view.setLight(+q('az').value,+q('el').value)};view.onLightDrag=(da,de)=>{if(!this.rules.light)return;q('az').value=(+q('az').value+da+360)%360;q('el').value=Math.max(-89,Math.min(89,+q('el').value+de));view.setLight(+q('az').value,+q('el').value)};q('shadows').onchange=e=>{if(this.rules.shadows)view.setShadows(e.target.checked)};q('undo').onclick=()=>this.restore(this.history.back(()=>this.snapshot()));q('redo').onclick=()=>this.restore(this.history.forward(()=>this.snapshot()));q('fit').onclick=()=>{if(this.rules.zoom&&this.rules.observe)view.fit(this.cubes)};for (const input of [q('gap'), ...this.gapInputs]) {
  let before;
  const changeSpacing = input.oninput;
  input.oninput = event => {
   if (!this.rules.spacing) return;
   before ??= this.snapshot();
   changeSpacing(event);
  };
  input.onchange = () => {
   if (!before) return;
   if (before.spacing.some((value, i) => value !== this.spacing[i])) this.history.record(before);
   before = undefined;
   this.onChange();
  };
 }
 this.swapButton=q('swap');this.mode='rotate';view.onHandle=({axis,sign,kind})=>{if(!kind)this.rotate(axis,sign)};let beforeGapDrag;
 view.onGapStart = () => { if (this.rules.spacing) beforeGapDrag = this.snapshot(); };
 view.onGapEnd = () => {
  if (!beforeGapDrag) return;
  if (beforeGapDrag.spacing.some((value, i) => value !== this.spacing[i])) this.history.record(beforeGapDrag);
  beforeGapDrag = undefined;
  this.onChange();
 };
 view.onGapDrag=(i,v)=>{if(!this.rules.spacing)return;this.spacing[i]=v;this.gapInputs[i].value=Math.round(v*100);q('gap').value=Math.round(this.spacing.reduce((a,b)=>a+b,0)/3*100);this.draw()};view.onMoveSlot=(id,p)=>{if(!this.rules.move)return;const old=this.snapshot();if(moveTo(this.cubes,id,p)){this.history.record(old);this.selected=id;this.changed(true)}};view.onDrop=(a,b)=>{if(!this.rules.move)return;const c=this.cubes.find(c=>c.id===a),d=this.cubes.find(c=>c.id===b);if(!c||!d)return;this.checkpoint();[c.p,d.p]=[d.p,c.p];this.selected=a;this.changed(true)};for(const button of host.querySelectorAll('[data-mode]'))button.onclick=()=>{if(this.rules[button.dataset.mode]===false)return;this.mode=button.dataset.mode;this.swap=false;this.swapButton.textContent='Permuter';for(const b of host.querySelectorAll('[data-mode]'))b.classList.toggle('active',b===button);view.setMode(this.mode);host.dataset.mode=this.mode;this.draw()};host.dataset.mode=this.mode;this.rigid=q('rigid');this.hint=q('hint');for(const [i,a] of ['X','Y','Z'].entries())for(const s of [-1,1]){const b=document.createElement('button');b.textContent=a+(s<0?' −1':' +1');b.onclick=()=>{if(!this.rules.move)return;const c=this.cubes.find(c=>c.id===this.selected);if(!c)return;const p=[...c.p];p[i]+=s;const old=this.snapshot();if(moveTo(this.cubes,c.id,p)){this.history.record(old);this.changed();this.hint.textContent=''}else this.hint.textContent='Case occupée ou hors limites'};q('moves').append(b)}this.draw()}
 configure(input){this.rules=publicControls(input);this.view.applyCameraRules(this.rules);const h=this.host;for(const key of ['rotate','move','spacing','light']){h.querySelector('[data-mode='+key+']').hidden=!this.rules[key]}h.querySelector('.spacingtools').hidden=!this.rules.spacing;h.querySelector('.rotationtools').hidden=!this.rules.rotate;h.hidden=!['rotate','move','spacing','light','shadows'].some(key=>this.rules[key]);
h.toggleAttribute('data-shadow-only',!this.rules.light&&this.rules.shadows);
h.querySelector('.lighttools').hidden=!this.rules.light&&!this.rules.shadows;
for(const id of ['az','el']) h.querySelector('#'+id).closest('label').hidden=!this.rules.light;
h.querySelector('#fit').hidden=!this.rules.zoom||!this.rules.observe;h.querySelector('#shadows').closest('label').hidden=!this.rules.shadows;h.querySelector('#scope').closest('label').hidden=!this.rules.groups;h.querySelector('#axis').closest('label').hidden=!this.rules.groups;h.querySelector('#rigid').closest('label').hidden=!this.rules.groups;if(!this.rules.groups){this.scope='cube';h.querySelector('#scope').value='cube';this.rigid.checked=false}h.querySelector('[data-mode=select]').click();if(!this.rules.shadows){h.querySelector('#shadows').checked=false;this.view.setShadows(false)}}
 group(){if(!this.rules.groups||this.cubes.length===1)return this.cubes.filter(c=>c.id===this.selected);if(this.scope==='all')return this.cubes;const c=this.cubes.find(x=>x.id===this.selected);if(!c)return [];const a='XYZ'.indexOf(this.axis);return this.cubes.filter(x=>this.scope==='all'||this.scope==='cube'&&x===c||this.scope==='layer'&&x.p[a]===c.p[a]||this.scope==='line'&&x.p.every((v,i)=>i===a||v===c.p[i]))}
 draw(animate=false){const group=this.group();
 const groups=this.rules.groups&&this.cubes.length>1;
 this.host.querySelector('#scope').closest('label').hidden=!groups;
 this.host.querySelector('#rigid').closest('label').hidden=!groups;
 this.swapButton.hidden=!this.rules.move||this.cubes.length<2;this.host.querySelector('#selectionCount').textContent=group.length?group.length+' / '+this.cubes.length+' cubes':'';this.host.querySelector('#axisLabel').hidden=!groups||!['line','layer'].includes(this.scope);this.view.update(this.cubes,group.map(c=>c.id),this.spacing,animate)}
 snapshot() {
  return {cubes: structuredClone(this.cubes), spacing: [...this.spacing], selected: this.selected};
 }
 checkpoint() { this.history.record(this.snapshot()); }
 setSpacing(spacing) {
  this.spacing = [...spacing];
  this.gapInputs.forEach((input, i) => input.value = Math.round(this.spacing[i] * 100));
  this.host.querySelector('#gap').value = Math.round(this.spacing.reduce((a, b) => a + b, 0) / 3 * 100);
 }
 changed(animate=false){this.draw(animate);this.onChange()}
 replace(cubes){this.cubes=structuredClone(cubes);this.selected=null;this.swap=false;this.swapButton.textContent='Permuter par clics';this.changed()}
 restore(state) {
  if (!state) return;
  this.cubes = state.cubes;
  this.selected = state.selected;
  this.setSpacing(state.spacing);
  this.swap = false;
  this.swapButton.textContent = 'Permuter par clics';
  this.onRestore?.();
  this.changed();
 }
 select(id){if(this.rules.move&&this.swap&&this.selected&&this.selected!==id){const a=this.cubes.find(c=>c.id===this.selected),b=this.cubes.find(c=>c.id===id);if(a&&b){this.checkpoint();[a.p,b.p]=[b.p,a.p]};this.swap=false;this.swapButton.textContent='Permuter'}this.selected=id;this.changed()}
 rotate(axis,sign){if(!this.rules.rotate)return;const g=this.group();if(!g.length)return;if(this.rigid.checked&&this.rules.groups&&g.length>1){const old=this.snapshot();if(!rotateGroup(this.cubes,g.map(c=>c.id),axis,sign)){this.hint.textContent='Rotation impossible sur la grille';return}this.history.record(old)}else{this.checkpoint();const r=quarter(axis,sign);for(const c of g)c.r=mul(r,c.r)}this.hint.textContent='';this.changed(true)}
}
