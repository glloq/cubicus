import {AXES, RULE_FIELDS, controlRules, cubeConstraints, validSlot} from './control-rules.js';
import {actionState, controlDiagnostics} from './control-actions.js';

const labels = {
  camera:'Caméra', rotation:'Rotation', movement:'Déplacement', selection:'Sélection',
  spacing:'Écartement', lighting:'Éclairage', history:'Historique', orbit:'Orbite',
  pan:'Translation de caméra', zoom:'Zoom', perspective:'Perspective', orthographic:'Orthographique',
  navigation:'Cube de navigation', roll:'Roulis caméra', near:'Distance minimale', far:'Distance maximale', zoomMin:'Zoom ortho minimal', zoomMax:'Zoom ortho maximal', reset:'Réinitialiser', individual:'Individuelle',
  simultaneous:'Simultanée', collective:'Collective', axes:'Axes', swap:'Permutation',
  emptySlots:'Cases libres', groupTranslation:'Translation de groupe', cyclicShift:'Décalage cyclique', layerSwap:'Permutation de couches', groupSwap:'Permutation de groupes',
  line:'Ligne', layer:'Couche', multiple:'Sélection multiple', definedGroups:'Groupes définis', all:'Ensemble',
  global:'Global', independentAxes:'Axes indépendants', min:'Minimum', max:'Maximum', step:'Pas',
  direction:'Direction de la lumière', position:'Position de la lumière', intensity:'Intensité', angle:'Ouverture du spot', shadows:'Ombres', undo:'Annuler', redo:'Rétablir',
  fixed:'Fixe', positionLocked:'Position verrouillée', orientationLocked:'Orientation verrouillée',
  noSwap:'Permutation interdite', noEmpty:'Case libre interdite', noGroup:'Sélections de groupe interdites',
  rotationAxes:'Axes de rotation', movementAxes:'Axes de déplacement', solid:'Groupe solidaire'
};

const profiles = {
  observation:['Observation uniquement',{}],
  cube:['Cube rotatif',{rotation:{individual:true}}],
  mural:['Fresque',{rotation:{individual:true},movement:{swap:true}}],
  interior:['Inscription intérieure',{spacing:{global:true,independentAxes:true}}],
  spatial:['Assemblage spatial',{rotation:{individual:true},movement:{swap:true,emptySlots:true},selection:{line:true,layer:true}}],
  anamorph:['Anamorphose',{camera:{pan:true,roll:true},spacing:{global:true,independentAxes:true}}],
  overlay:['Superposition optique',{rotation:{individual:true},spacing:{global:true}}],
  shadow:['Projection d’ombres',{lighting:{direction:true,shadows:true},rotation:{individual:true}}],
  complex:['Assemblage complexe',{rotation:{individual:true,simultaneous:true,collective:true},
    movement:{swap:true,emptySlots:true,groupTranslation:true,cyclicShift:true,layerSwap:true,groupSwap:true},
    selection:{line:true,layer:true,multiple:true,definedGroups:true,all:true},
    spacing:{global:true,independentAxes:true},lighting:{direction:true,shadows:true}}]
};

export function createControlProfile(id) {
  const baseline = controlRules();
  const patches = profiles[id]?.[1];
  if (!patches) return baseline;
  for (const group of ['rotation','movement','selection','spacing','lighting']) {
    for (const key of Object.keys(baseline[group])) {
      if (typeof baseline[group][key] === 'boolean') baseline[group][key] = group === 'selection' && key === 'individual';
    }
  }
  for (const [group, overrides] of Object.entries(patches)) Object.assign(baseline[group],overrides);
  return baseline;
}

function field(parent, label, value, change, kind = 'checkbox') {
  const row = document.createElement('label');
  const input = document.createElement('input');
  input.type = kind;
  if (kind === 'checkbox') input.checked = value;
  else Object.assign(input,{value,step:.01});
  input.onchange = () => change(kind === 'checkbox' ? input.checked : Number(input.value));
  row.append(input,' '+label);
  parent.append(row);
  return input;
}

export function bindControlEditor(host,{read,write,cubes,opening,status}) {
  const profile = document.createElement('select');
  profile.id = 'controlProfile';
  profile.setAttribute('aria-label','Profil des commandes');
  profile.append(new Option('Personnalisé',''),...Object.entries(profiles).map(([id,[name]])=>new Option(name,id)));
  const reset = document.createElement('button');
  reset.textContent = 'Rétablir le profil';
  const suggest = document.createElement('button');
  suggest.textContent = 'Suggérer un profil';
  const apply = document.createElement('button');
  apply.textContent = 'Appliquer la suggestion';
  apply.hidden = true;
  const report = document.createElement('output');
  report.id = 'controlDiagnostic';
  const categories = document.createElement('div');
  host.append(profile,reset,suggest,apply,categories,report);
  let recommendation;
  let lastProfile;

  function render() {
    const expanded = new Set([...categories.querySelectorAll('details[open]')].map(item=>item.dataset.category));
    categories.replaceChildren();
    const rules = read();
    for (const [category,fields] of Object.entries(RULE_FIELDS)) {
      const details = document.createElement('details');
      details.dataset.category = category;
      details.open = expanded.has(category);
      const summary = document.createElement('summary');
      summary.textContent = labels[category];
      details.append(summary);
      for (const [key,base] of Object.entries(fields)) {
        const update = value => {
          const next = structuredClone(read());
          next[category][key] = value;
          profile.value='';
          write(controlRules(next));
          render();
        };
        if (Array.isArray(base)) for (const axis of AXES) field(details,labels[key]+' '+axis,rules[category][key].includes(axis), enabled => {
          const axes = read()[category][key].filter(item=>item!==axis);
          update(enabled?[...axes,axis]:axes);
        });
        else {
          const input=field(details,labels[key],rules[category][key],update,typeof base === 'number' ? 'number' : 'checkbox');
          if(typeof base==='number') {
            input.min=category==='camera'?.05:0;
            input.max=category==='camera'?(['near','far'].includes(key)?1000:50):2;
          }
        }
      }
      categories.append(details);
    }
    diagnostic();
  }
  function diagnostic() {
    const view=opening();
    const state=actionState(cubes(),read(),view?.lighting?.type);
    const {fixed,rotatable,movable,tools,available,errors,warnings}=controlDiagnostics(state,view);
    report.textContent = [
      fixed+' fixes · '+rotatable+' rotatifs · '+movable+' déplaçables · '+state.groups.size+' groupes · '+tools+' outils',
      'Sélections : '+available.scopes.join(', ')+' · Axes d’écartement : '+(available.gapAxes.join(', ')||'aucun'),
      ...errors.map(message=>'Erreur : '+message),
      ...warnings.map(message=>'Avertissement : '+message)
    ].join('\n');
  }
  function setProfile(id) {
    if (!profiles[id]) return;
    profile.value = id;
    lastProfile = id;
    write(createControlProfile(id));
    render();
  }
  profile.onchange = () => setProfile(profile.value);
  reset.onclick = () => {if(lastProfile)setProfile(lastProfile);};
  suggest.onclick = () => {
    const list=cubes();
    if(opening()?.shadows) recommendation='shadow';
    else if(list.length===1) recommendation=list[0].constraints?.fixed?'observation':'cube';
    else if(list.some(cube=>cube.materials?.some(material=>material.blend)||cube.opacity?.some(value=>value<1))) recommendation='overlay';
    else if(list.length>27) recommendation='complex';
    else if(list.some(cube=>cube.faces.some(Boolean))&&[0,1,2].some(axis=>list.every(cube=>cube.p[axis]===list[0].p[axis]))) recommendation='mural';
    else recommendation='spatial';
    apply.hidden = false;
    status('Suggestion : '+profiles[recommendation][0]);
  };
  apply.onclick = () => { setProfile(recommendation); apply.hidden = true; };
  render();
  return {render,diagnostic, resetProfile(){profile.value='';lastProfile=undefined;apply.hidden=true;}};
}

export function bindConstraints(host,{selected,checkpoint,changed,status}) {
  const editor = document.createElement('div');
  host.append(editor);
  let apply;
  function refresh() {
    editor.replaceChildren();
    const active = selected();
    const raw = active[0]?.constraints;
    const limits = cubeConstraints(raw);
    for (const key of ['fixed','positionLocked','orientationLocked','noSwap','noEmpty','noGroup','solid']) {
      field(editor,labels[key],limits[key]===true,value=>{limits[key]=value;});
    }
    for (const key of ['rotationAxes','movementAxes']) for (const axis of AXES) {
      field(editor,labels[key]+' '+axis,(limits[key]??AXES).includes(axis),value=>{
        const remaining=(limits[key]??AXES).filter(item=>item!==axis);
        limits[key]=value?[...remaining,axis]:remaining;
      });
    }
    const group = document.createElement('input');
    group.maxLength=80;
    group.value=limits.group??'';
    group.setAttribute('aria-label','Nom privé du groupe');
    const pivot=document.createElement('input');
    pivot.value=limits.pivot?.join(',')??'';
    pivot.placeholder='Pivot partagé X,Y,Z';
    pivot.setAttribute('aria-label','Pivot partagé de rotation');
    const slots = document.createElement('textarea');
    slots.value=limits.slots?.map(slot=>slot.join(',')).join('\n')??'';
    slots.placeholder='Une case X,Y,Z par ligne';
    slots.setAttribute('aria-label','Cases autorisées');
    apply=document.createElement('button');
    apply.textContent='Appliquer à la sélection';
    apply.disabled=!active.length;
    apply.onclick=()=>{
      const restricted=slots.value.trim();
      const positions=restricted?restricted.split(/\n+/).map(line=>line.split(',').map(value=>value.trim()?Number(value):NaN)):null;
      if (positions?.some(position=>!validSlot(position))) {
        status('Cases invalides. Entrez des coordonnées entières X,Y,Z.');
        return;
      }
      if (positions&&active.some(cube=>!positions.some(position=>position.join()===cube.p.join()))) {
        status('Incluez la case actuelle de chaque cube sélectionné.');
        return;
      }
      const hinge=pivot.value.trim()?pivot.value.split(',').map(value=>value.trim()?Number(value):NaN):null;
      if(hinge&&(hinge.length!==3||hinge.some(value=>!Number.isInteger(value*2)||Math.abs(value)>100))){
        status('Entrez trois coordonnées entières ou demi-entières pour le pivot.');
        return;
      }
      const next=cubeConstraints({...limits,group:group.value.trim()||undefined,slots:positions,pivot:hinge});
      checkpoint();
      for(const cube of active) cube.constraints=structuredClone(next);
      changed();
    };
    editor.append(group,pivot,slots,apply);
  }
  return {refresh};
}

export function bindGroupEditor(host,{cubes,checkpoint,changed,select,duplicate,status}) {
  const list=document.createElement('select');
  list.setAttribute('aria-label','Groupes définis');
  const name=document.createElement('input');
  name.maxLength=80;
  name.setAttribute('aria-label','Nouveau nom privé du groupe');
  const action=(label,callback)=>{
    const button=document.createElement('button');
    button.textContent=label;
    button.onclick=()=>{if(list.value)callback();};
    return button;
  };
  const members=()=>cubes().filter(cube=>cube.constraints?.group===list.value);
  const activate=action('Sélectionner',()=>{
    const group=members();
    if(group.length)select(group[0].id);
  });
  const rename=action('Renommer',()=>{
    const next=name.value.trim();
    if(!next||next===list.value)return;
    if(cubes().some(cube=>cube.constraints?.group===next)){
      status('Ce nom est déjà utilisé par un autre groupe.');
      return;
    }
    const group=members();
    checkpoint();
    for(const cube of group)cube.constraints={...cube.constraints,group:next};
    changed();
    refresh(next);
  });
  const copy=action('Copier les cubes du groupe',()=>{
    select(members()[0].id);
    duplicate();
  });
  const remove=action('Dissoudre',()=>{
    checkpoint();
    for(const cube of members()){
      const {group,solid,...constraints}=cube.constraints;
      cube.constraints=constraints;
    }
    changed();
  });
  host.append(list,name,activate,rename,copy,remove);
  const selectName=()=>{name.value=list.value;};
  list.onchange=selectName;
  function refresh(preferred=list.value){
    const groups=[...new Set(cubes().map(cube=>cube.constraints?.group).filter(Boolean))].sort();
    list.replaceChildren(...groups.map(group=>new Option(group,group)));
    if(groups.includes(preferred))list.value=preferred;
    for(const control of [name,activate,rename,copy,remove])control.disabled=!list.value;
    selectName();
  }
  return {refresh};
}
