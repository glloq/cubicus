import {gatedCubes,mechanismStep,traceBeams,visualEffects} from './mechanisms.js';
import {History} from './history.js';
import {AXES, controlRules, lightingState} from './control-rules.js';
import {actionState, applyChanges, capabilities, groupSwapAction, layerSwapAction, previewAction, selection} from './control-actions.js';

const markup = `<h3>Manipulation</h3><div class="toolstrip"><button data-mode="rotate" class="active">Tourner</button><button data-mode="move">Déplacer</button><button data-mode="select">Observer</button><button data-mode="spacing">Écarter</button><button data-mode="light">Lumière</button></div><p class="help">Clic : sélectionner · Glisser à droite : orbiter · Molette : zoom</p><div class="selectiontools"><label>Sélection <select id="scope"><option value="cube">Cube</option><option value="line">Ligne</option><option value="layer">Couche</option><option value="definedGroups">Groupe défini</option><option value="multiple">Sélection multiple</option><option value="all">Tout</option></select></label><label id="axisLabel">Axe <select id="axis"><option>X</option><option>Y</option><option>Z</option></select></label><output id="selectionCount" class="selectionCount"></output><button id="swap" title="Alternative au glisser-déposer">Permuter par clics</button><label><input type="checkbox" id="rigid"> Rotation collective</label><details class="movementtools"><summary>Déplacements précis</summary><label>Action <select id="moveType"><option value="step">Case libre</option><option value="translate">Translation de groupe</option><option value="cycle">Décalage cyclique</option><option value="swapLayers">Permutation de couches</option><option value="swapGroups">Permutation de groupes par glissement</option></select></label><div id="moves"></div></details></div><p id="hint" role="status"></p><details class="rotationtools"><summary>Rotation précise</summary><div id="rotations"></div></details><div class="spacingtools"><label>Écartement <input id="gap" type="range" min="0" max="200" value="12"></label><details><summary>Axes séparés</summary><div id="gaps"></div></details></div><details class="lighttools"><summary>Lumière et ombres</summary>
<label>Source <select id="lightType"><option value="directional">Directionnelle</option><option value="point">Ponctuelle</option><option value="spot">Spot</option></select></label>
<label>Geste lumière <select id="lightGesture"><option value="direction">Orientation</option><option value="position">Position</option></select></label>
<fieldset id="lightPosition"><legend>Position de la lumière</legend>
<label>X <input id="lightX" type="number" min="-1000" max="1000" value="5"></label>
<label>Y <input id="lightY" type="number" min="-1000" max="1000" value="7"></label>
<label>Z <input id="lightZ" type="number" min="-1000" max="1000" value="5"></label>
</fieldset>
<label>Intensité <input id="lightIntensity" type="range" min="0" max="10" step=".1" value="2"></label>
<label>Ouverture <input id="lightAngle" type="range" min="5" max="90" value="45"></label><label><input type="checkbox" id="shadows"> Ombres au sol</label><label>Azimut <input id="az" type="range" min="0" max="360" value="45"></label><label>Élévation <input id="el" type="range" min="-90" max="90" value="45"></label></details><button id="undo">Annuler</button><button id="redo">Rétablir</button><button id="fit">Recentrer</button>`;

export class Controller {
  constructor(view, host, cubes, onChange = () => {}) {
    Object.assign(this, {view, host, cubes, onChange});
    this.rules = controlRules({version:2, selection:{multiple:true}, movement:{groupTranslation:true,cyclicShift:true,layerSwap:true,groupSwap:true}});
    this.rules.camera.roll = true;
    this.view.applyCameraRules(this.rules.camera);
    this.rules.lighting.position = this.rules.lighting.intensity = this.rules.lighting.angle = true;
    this.selected = null;
    this.multiple = [];
    this.scope = 'cube';
    this.axis = 'X';
    this.mode = 'rotate';
    this.spacing = [.12,.12,.12];
    this.history = new History();
    this.swap = false;
    host.innerHTML = markup;
    const q = id => this.control(id);
    this.swapButton = q('swap');
    this.rigid = q('rigid');
    this.hint = q('hint');
    this.modeButtons = [...host.querySelectorAll('[data-mode]')];
    this.rotationButtons = this.directionButtons(q('rotations'), (axis, sign) => this.rotate(axis, sign), '90°');
    this.moveButtons = this.directionButtons(q('moves'), (axis, sign) => this.move(axis, sign), '1');
    for(const [buttons,prepare] of [[this.rotationButtons,(axis,sign)=>this.rotationAction(axis,sign)],
      [this.moveButtons,(axis,sign)=>this.moveAction(axis,sign)]]){
      for(const {button,axis,sign} of buttons){
        const preview=()=>this.preview(prepare(axis,sign));
        button.onpointerenter=button.onfocus=preview;
        button.onpointerleave=button.onblur=()=>this.preview(null);
      }
    }
    q('scope').onchange = event => {
      if (!this.available.scopes.includes(event.target.value)) return;
      this.scope = event.target.value;
      this.multiple = this.selected ? [this.selected] : [];
      this.draw();
      this.onSelectionChange?.();
    };
    q('axis').onchange = event => {
      if (!AXES.includes(event.target.value)) return;
      this.axis = event.target.value;
      this.draw();
      this.onSelectionChange?.();
    };
    q('moveType').onchange = this.rigid.onchange = () => this.draw();
    this.swapButton.onclick = () => {
      if (!this.rules.movement.swap || !this.canSwapFrom(this.selected)) return;
      this.swap = !this.swap;
      this.swapButton.textContent = this.swap ? 'Choisir destination' : 'Permuter par clics';
    };
    this.modeButtons.forEach(button => { button.onclick = () => this.setMode(button.dataset.mode); });
    host.dataset.mode = this.mode;
    q('undo').onclick = () => this.travel('undo');
    q('redo').onclick = () => this.travel('redo');
    q('fit').onclick = () => this.fit();
    this.gapInputs = AXES.map(axis => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'range';
      label.append(axis, input);
      q('gaps').append(label);
      return input;
    });
    [q('gap'), ...this.gapInputs].forEach((input, i) => {
      let before;
      input.oninput = () => {
        before ??= this.snapshot();
        if (!this.changeGap(i - 1, Number(input.value) / 100)) before = undefined;
      };
      input.onchange = () => { this.finishGesture(before); before = undefined; };
    });
    q('lightType').onchange = event => {
      if (this.player) return;
      const before = this.snapshot();
      before.lighting.type = this.view.lightType;
      this.history.record(before);
      this.applyLighting({...this.lightingEquipment(),type:event.target.value});
      this.changed();
    };
    for (const [id, rule] of [['lightX','position'],['lightY','position'],['lightZ','position'],
      ['lightIntensity','intensity'],['lightAngle','angle']]) {
      let before;
      q(id).onfocus = () => { before = this.snapshot(); };
      q(id).oninput = () => {
        if (this.rules.lighting[rule]) this.updateLight();
      };
      q(id).onchange = () => {
        if (before && this.rules.lighting[rule]) this.history.record(before);
        before = this.snapshot();
        this.updateHistory();
        this.onChange();
      };
    }
    q('az').oninput = q('el').oninput = () => {
      if (!this.rules.lighting.direction || view.lightType === 'point') return;
      this.lightBefore ??= this.snapshot();
      view.setLight(+q('az').value, +q('el').value);
    };
    q('az').onchange = q('el').onchange = () => this.finishLight();
    q('shadows').onchange = event => {
      if (!this.rules.lighting.shadows) return;
      const before = this.snapshot();
      before.light[2] = !event.target.checked;
      this.history.record(before);
      view.setShadows(event.target.checked);
      this.updateHistory();
      this.onChange();
    };
    view.onLightDrag = (azimuth, elevation, vertical) => {
      const position=this.view.lightType==='point'||q('lightGesture').value==='position';
      if(position ? !this.rules.lighting.position : !this.rules.lighting.direction) return;
      this.lightBefore ??= this.snapshot();
      if(position){
        const scale=Math.max(.02,(view.extent??2)*.004);
        const change=(id,delta)=>{
          const input=q(id);
          input.value=Math.max(-1000,Math.min(1000,Number(input.value)+delta*scale));
        };
        change('lightX',azimuth);
        change(vertical?'lightY':'lightZ',elevation);
        this.updateLight();
      }else{
        q('az').value = (+q('az').value + azimuth + 360) % 360;
        q('el').value = Math.max(-90, Math.min(90, +q('el').value + elevation));
        view.setLight(+q('az').value, +q('el').value);
      }
    };
    view.onLightEnd = () => this.finishLight();
    view.onAnimationEnd=()=>this.refreshControls();
    view.onHoverHandle=handle=>this.preview(handle?this.rotationAction(handle.axis,handle.sign):null);
    view.onHandle = ({axis,sign}) => this.rotate(axis,sign);
    view.globalGapValue = () => Number(this.control('gap').value)/100;
    view.onGapStart = () => { this.gapBefore = this.snapshot(); };
    view.onGapDrag = (index,value) => this.changeGap(index,value);
    view.onGapEnd = () => { this.finishGesture(this.gapBefore); this.gapBefore = undefined; };
    view.onMoveSlot = (id, p) => {
      const action = this.control('moveType').value === 'step' ? this.stepTo(id,p) : null;
      if (action) this.run(action,id);
    };
    view.onDrop = (a,b) => {
      const action=this.dropAction(a,b);
      if(action)this.run(action,a);
    };
    view.allowSwap = (a,b) => {
      const action=this.dropAction(a,b);
      return Boolean(action&&previewAction(this.transformIndex,action));
    };
    view.allowSlot = (id,p) => {
      const action = this.control('moveType').value === 'step' ? this.stepTo(id,p) : null;
      return Boolean(action && previewAction(this.transformIndex,action));
    };
    view.onHoverCube = id => view.highlightHover(id && this.mode !== 'select'
      ? this.group(id).map(cube => cube.id) : []);
    view.renderer.domElement.tabIndex = 0;
    view.renderer.domElement.addEventListener('keydown', event => this.keyboard(event));
    this.draw();
  }

  control(id) { return this.host.querySelector('#'+id); }

  directionButtons(host, handler, suffix) {
    return AXES.flatMap(axis => [-1,1].map(sign => {
      const button = document.createElement('button');
      button.textContent = axis+' '+(sign < 0 ? '−' : '+')+suffix;
      button.onclick = () => handler(axis,sign);
      host.append(button);
      return {button,axis,sign};
    }));
  }

  configure(input) {
    this.player = true;
    this.rules = controlRules(input);
    const {camera} = this.rules;
    this.view.applyCameraRules(camera);
    this.mode = 'select';
    this.index = null;
    this.draw();
    this.setMode('select');
  }

  configureMechanisms(config) {
    this.mechanisms=config;
    this.advanceMechanisms();
    this.index=null;
  }

  advanceMechanisms(action) {
    const next=mechanismStep(this.mechanisms,this.cubes,action?this.gameState:undefined,action);
    this.gameState={active:next.active,counters:next.counters,occupancy:next.occupancy};
    this.activeFlags=next.active;
    if(action)this.onMechanismStep?.(next.journal);
  }

  updateIndex() {
    this.index = actionState(this.cubes, this.rules, this.view.lightType);
    this.transformIndex = this.player ? actionState(gatedCubes(this.mechanisms,this.cubes,this.activeFlags??[]),this.rules,this.view.lightType) : actionState(
      this.cubes.map(({constraints,...cube}) => ({...cube, constraints: constraints?.group ? {group:constraints.group} : undefined})), this.rules, this.view.lightType
    );
    this.available = capabilities(this.transformIndex);
  }

  modes() {
    const {rotation,move,spacing,light} = this.available;
    return {select:true,rotate:rotation,move,spacing,light};
  }

  setMode(mode) {
    if (this.player && !this.modes()[mode]) return;
    this.mode = mode;
    this.swap = false;
    this.swapButton.textContent = 'Permuter par clics';
    this.host.dataset.mode = mode;
    this.modeButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    this.view.highlightHover([]);
    this.preview(null);
    this.view.setMode(mode);
    this.draw();
  }

  group(id = this.selected) {
    const multiple = id && id !== this.selected ? [...this.multiple,id] : this.multiple;
    return selection(this.transformIndex, {id, scope:this.scope, axis:this.axis, multiple});
  }

  rotationAction(axis,sign) {
    const group = this.group();
    return {type:group.length > 1 && this.rigid.checked ? 'collective' : 'rotate',
      ids:group.map(cube => cube.id), scope:this.scope, selectionAxis:this.axis, axis, sign};
  }

  stepTo(id, position) {
    const cube = this.index.byId.get(id);
    if (!cube) return null;
    const delta = position.map((value,i) => value-cube.p[i]);
    const index = delta.findIndex(Boolean);
    if (index < 0 || delta.filter(Boolean).length !== 1) return null;
    return {type:'step',ids:[id],axis:AXES[index],sign:delta[index]};
  }

  dropAction(a,b) {
    if(this.control('moveType').value==='swapGroups')return groupSwapAction(this.transformIndex,a,b);
    return {type:'swap',ids:[a,b]};
  }

  moveAction(axis,sign) {
    const type = this.control('moveType').value;
    if(type==='swapLayers')return layerSwapAction(this.index,this.selected,axis,sign);
    if(type==='swapGroups')return null;
    return {type, ids:type === 'step' ? [this.selected] : this.group().map(cube => cube.id), scope:type === 'step' ? undefined : this.scope, selectionAxis:this.axis, axis, sign};
  }

  rotate(axis,sign) { this.run(this.rotationAction(axis,sign)); }
  move(axis,sign) { this.run(this.moveAction(axis,sign)); }

  preview(action) {
    this.view.previewTransforms(action&&!this.view.animating?previewAction(this.transformIndex,action):null);
  }

  run(action,id) {
    this.preview(null);
    const changes = action && !this.view.animating && previewAction(this.transformIndex,action);
    if (!changes) {
      this.hint.textContent = 'Transformation indisponible pour cette sélection.';
      return false;
    }
    this.checkpoint();
    const pivot=action.type==='collective'&&this.transformIndex.byId.get(action.ids[0])?.constraints?.pivot;
    if(pivot)this.view.hingeTransition={
      pivot,axis:AXES.indexOf(action.axis),sign:action.sign,
      starts:new Map(action.ids.map(id=>[id,[...this.index.byId.get(id).p]]))
    };
    applyChanges(this.index,changes);
    if(this.player&&this.mechanisms)this.advanceMechanisms(action);
    if (id) this.selected = id;
    this.hint.textContent = '';
    this.onAction?.(action);
    this.changed(true);
    return true;
  }

  canSwapFrom(id) {
    return this.cubes.some(cube => cube.id !== id && previewAction(this.transformIndex,{type:'swap',ids:[id,cube.id]}));
  }

  select(id) {
    if (!this.index.byId.has(id)) return;
    if (this.swap && this.selected && this.selected !== id) {
      this.run({type:'swap',ids:[this.selected,id]},this.selected);
      this.swap = false;
      this.swapButton.textContent = 'Permuter par clics';
      return;
    }
    if (this.scope === 'multiple') {
      this.multiple = this.multiple.includes(id) ? this.multiple.filter(value => value !== id) : [...this.multiple,id];
    }
    this.selected = id;
    this.draw();
    this.onChange();
  }

  refreshControls() {
    const q = id => this.control(id);
    const {camera,spacing,lighting,rotation,movement} = this.rules;
    const {scopes,gapAxes} = this.available;
    const modes = this.modes();
    if (this.player && !modes[this.mode]) {
      this.mode = 'select';
      this.host.dataset.mode = 'select';
      this.view.setMode('select');
    }
    for (const button of this.modeButtons) {
      const mode = button.dataset.mode;
      button.hidden = this.player && !modes[mode];
      button.classList.toggle('active',mode === this.mode);
      button.setAttribute('aria-pressed',String(mode === this.mode));
    }
    this.host.hidden = this.player && !Object.entries(modes).some(([key,value]) => key !== 'select' && value) && !lighting.shadows;
    this.host.toggleAttribute('data-shadow-only',!this.available.light && lighting.shadows);
    this.host.querySelector('.lighttools').hidden = this.player && !this.available.light && !lighting.shadows;
    this.host.querySelector('.spacingtools').hidden = this.player && !this.available.spacing;
    for (const id of ['az','el']) q(id).closest('label').hidden = !lighting.direction || this.view.lightType === 'point';
    q('lightType').closest('label').hidden = this.player === true;
    q('lightGesture').closest('label').hidden=this.view.lightType!=='spot'||!lighting.direction||!lighting.position;
    if(this.view.lightType==='spot'&&!lighting.direction&&lighting.position)q('lightGesture').value='position';
    if(this.view.lightType!=='spot'||!lighting.position)q('lightGesture').value='direction';
    q('lightPosition').hidden = this.view.lightType === 'directional' || !lighting.position;
    q('lightAngle').closest('label').hidden = this.view.lightType !== 'spot' || !lighting.angle;
    q('lightIntensity').closest('label').hidden = !lighting.intensity;
    q('shadows').closest('label').hidden = !lighting.shadows;
    q('fit').hidden = !camera.reset;
    const scopeSelect = q('scope');
    for (const option of scopeSelect.options) option.hidden = !scopes.includes(option.value);
    if (!scopes.includes(this.scope)) this.scope = scopes[0] ?? 'cube';
    scopeSelect.value = this.scope;
    scopeSelect.closest('label').hidden = scopes.length <= 1;
    q('axisLabel').hidden = !['line','layer'].includes(this.scope);
    this.rigid.closest('label').hidden = !rotation.collective || scopes.every(scope => scope === 'cube');
    this.rigid.checked = rotation.collective && (!rotation.simultaneous || this.rigid.checked);
    const group = this.group();
    const solid=group.some(cube=>cube.constraints?.solid);
    if(this.player&&solid&&rotation.collective)this.rigid.checked=true;
    this.rigid.disabled=!rotation.simultaneous||this.player&&solid;
    this.view.handleAnchor=!this.rigid.checked&&group.length>1 ? this.selected : null;
    q('selectionCount').textContent = group.length ? group.length+' / '+this.cubes.length+' cubes' : '';
    this.swapButton.hidden = !movement.swap || this.cubes.length < 2;
    this.swapButton.disabled = !this.swap && !this.canSwapFrom(this.selected);
    const allowedMoves = {step:movement.emptySlots,translate:movement.groupTranslation,cycle:movement.cyclicShift,swapLayers:movement.layerSwap,swapGroups:movement.groupSwap};
    const moveType = q('moveType');
    for (const option of moveType.options) option.hidden = !allowedMoves[option.value];
    if (!allowedMoves[moveType.value]) moveType.value = Object.keys(allowedMoves).find(key => allowedMoves[key]) ?? '';
    moveType.closest('label').hidden = Object.values(allowedMoves).filter(Boolean).length < 2;
    this.host.querySelector('.movementtools').hidden = !Object.values(allowedMoves).some(Boolean);
    this.rotationHandles = [];
    for (const {axis,sign,button} of this.rotationButtons) {
      button.hidden = !rotation.axes.includes(axis);
      button.disabled = !previewAction(this.transformIndex,this.rotationAction(axis,sign));
      if (!button.disabled) this.rotationHandles.push({axis,sign});
    }
    for (const {axis,sign,button} of this.moveButtons) {
      const action=this.moveAction(axis,sign);
      button.hidden = !movement.axes.includes(axis) || moveType.value==='swapGroups';
      button.disabled = !action || !previewAction(this.transformIndex,action);
    }
    this.view.rotationHandles = this.rotationHandles;
    this.view.spacingAxes = spacing.independentAxes ? gapAxes : [];
    this.view.globalSpacing = spacing.global && !spacing.independentAxes && gapAxes.length > 0;
    q('gap').closest('label').hidden = !spacing.global;
    this.gapInputs.forEach((input,i) => { input.closest('label').hidden = !spacing.independentAxes || !gapAxes.includes(AXES[i]); });
    q('gaps').closest('details').hidden = !spacing.independentAxes || !gapAxes.length;
    this.syncSpacing();
    this.updateHistory();
    return group;
  }

  draw(animate = false) {
    this.preview(null);
    if (!this.index || this.index.cubes !== this.cubes) this.updateIndex();
    const group = this.refreshControls();
    this.view.beamSegments=traceBeams(this.mechanisms,this.cubes,this.player?this.activeFlags:this.mechanisms?.flags).segments;
    const effects=visualEffects(this.player?this.mechanisms:null,this.cubes,this.activeFlags??[]);
    this.renderCubes=effects.cubes;
    this.view.lampPositions=effects.lamps;
    this.view.visibleZones=(this.mechanisms?.zones??[]).filter(zone=>zone.color);
    this.view.beamColor=effects.beamColor;
    this.view.update(this.renderCubes,group.map(cube => cube.id),this.spacing,animate);
    if(this.view.animating){
      for(const {button} of [...this.rotationButtons,...this.moveButtons])button.disabled=true;
      this.swapButton.disabled=true;
    }
  }

  changed(animate = false) { this.index = null; this.draw(animate); this.onChange(); }

  syncSpacing() {
    const {min,max,step} = this.rules.spacing;
    const global = this.control('gap');
    const active = this.available?.gapAxes.map(axis => this.spacing[AXES.indexOf(axis)]) ?? [];
    [global,...this.gapInputs].forEach((input,i) => {
      input.min = min*100;
      input.max = max*100;
      input.step = step*100;
      input.value = 100*(i ? this.spacing[i-1] : active.length ? active.reduce((sum,value) => sum+value,0)/active.length : this.spacing[0]);
    });
  }

  setSpacing(values) {
    const {min,max} = this.rules.spacing;
    this.spacing = values.map(value => Math.max(min,Math.min(max,value)));
    this.syncSpacing();
  }

  changeGap(index,value) {
    const {spacing} = this.rules;
    if (!Number.isFinite(value) || (index < 0 ? !spacing.global : !spacing.independentAxes || !this.available.gapAxes.includes(AXES[index]))) return false;
    const snapped = Math.max(spacing.min,Math.min(spacing.max,spacing.min+Math.round((value-spacing.min)/spacing.step)*spacing.step));
    this.spacing = this.spacing.map((old,i) => (index < 0 ? this.available.gapAxes.includes(AXES[i]) : i === index) ? snapped : old);
    this.syncSpacing();
    this.view.update(this.renderCubes??this.cubes,this.group().map(cube => cube.id),this.spacing);
    return true;
  }

  finishGesture(before) {
    if (before && before.spacing.some((value,i) => value !== this.spacing[i])) {
      this.history.record(before);
      this.updateHistory();
      this.onChange();
    }
  }

  finishLight() {
    if (this.lightBefore) {
      const current = this.lightState();
      if (this.lightBefore.light.some((value,i) => value !== current[i]) ||
        JSON.stringify(this.lightBefore.lighting)!==JSON.stringify(this.lightingEquipment())) this.history.record(this.lightBefore);
      this.lightBefore = undefined;
      this.updateHistory();
      this.onChange();
    }
  }

  lightingEquipment() {
    return {type:this.view.lightType,
      position:['X','Y','Z'].map(axis=>Number(this.control('light'+axis).value)),
      intensity:Number(this.control('lightIntensity').value),angle:Number(this.control('lightAngle').value)};
  }

  applyLighting(raw) {
    const equipment=lightingState(raw);
    if (!equipment) return;
    this.view.setLightEquipment(equipment.type);
    this.control('lightType').value=equipment.type;
    ['X','Y','Z'].forEach((axis,i)=>{this.control('light'+axis).value=equipment.position[i];});
    this.control('lightIntensity').value=equipment.intensity;
    this.control('lightAngle').value=equipment.angle;
    this.index=null;
    this.updateLight();
  }

  updateLight() {
    const equipment=lightingState(this.lightingEquipment());
    if (!equipment) return;
    this.view.setLightSettings(equipment);
    this.view.setLight(...this.lightState());
  }

  lightState() { return [+this.control('az').value,+this.control('el').value,this.control('shadows').checked]; }
  snapshot() { return {cubes:structuredClone(this.cubes),spacing:[...this.spacing],selected:this.selected,multiple:[...this.multiple],light:this.lightState(),lighting:this.lightingEquipment(),gameState:structuredClone(this.gameState),extra:this.captureExtra?.()}; }
  checkpoint() { this.history.record(this.snapshot()); this.updateHistory(); }

  updateHistory() {
    for (const [id, available] of [['undo',this.history.canBack],['redo',this.history.canForward]]) {
      const button = this.host.ownerDocument.getElementById(id);
      if (!button) continue;
      button.hidden = !this.rules.history[id];
      button.disabled = !available;
    }
  }

  travel(direction) {
    if (!this.rules.history[direction]) return;
    this.restore(this.history[direction === 'undo' ? 'back' : 'forward'](() => this.snapshot()));
  }

  restore(state) {
    if (!state) return;
    this.cubes = state.cubes;
    this.gameState=state.gameState;
    this.activeFlags=this.gameState?.active??[];
    this.selected = state.selected;
    this.multiple = state.multiple;
    this.setSpacing(state.spacing);
    const [azimuth,elevation,shadows] = state.light;
    this.control('az').value = azimuth;
    this.control('el').value = elevation;
    this.control('shadows').checked = shadows;
    this.applyLighting(state.lighting);
    this.view.setShadows(shadows);
    this.swap = false;
    this.swapButton.textContent = 'Permuter par clics';
    this.onRestore?.(state.extra);
    this.changed();
  }

  replace(cubes) {
    this.cubes = structuredClone(cubes);
    if(this.player)this.advanceMechanisms();
    this.selected = null;
    this.multiple = [];
    this.swap = false;
    this.changed();
  }

  fit() { if (this.rules.camera.reset) this.view.fit(this.cubes); }

  keyboard(event) {
    if (event.key === 'Escape') {
      this.selected = null;
      this.multiple = [];
      this.swap = false;
      this.swapButton.textContent = 'Permuter par clics';
      this.draw();
      this.onSelectionChange?.();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.travel(event.shiftKey ? 'redo' : 'undo');
    } else if (!event.ctrlKey && !event.metaKey) {
      const mode = {o:'select',r:'rotate',d:'move',e:'spacing',l:'light'}[event.key];
      if (mode) this.setMode(mode);
      if (event.key === 'f') this.fit();
      if (this.mode === 'rotate' && AXES.includes(event.key.toUpperCase())) this.rotate(event.key.toUpperCase(),event.shiftKey ? -1 : 1);
    }
  }
}
