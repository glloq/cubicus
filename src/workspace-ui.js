const stages = {
  assembly: ['Assemblage', 'Construisez la grille et organisez les fragments.'],
  faces: ['Cubes et faces', 'Sélectionnez un cube dans la scène, puis ouvrez son dessin, sa matière ou son volume.'],
  optics: ['Optique', 'Créez une lecture par image, transparence, lumière ou géométrie.'],
  prepare: ['Préparer l’énigme', 'Définissez le départ du joueur, testez les règles et contrôlez l’export.']
};

const paths = [
  ['Cube illustré', 'faces', 'drawing', '#brush', 'Dessinez ou importez un motif sur les faces du cube.'],
  ['Fresque à reconstituer', 'optics', null, '#mural', 'Découpez l’image, puis mélangez les fragments dans Préparer.'],
  ['Anamorphose', 'optics', null, '#projectionImage', 'Cadrez la lecture dans la scène avant de projeter l’image.'],
  ['Superposition', 'optics', null, '#overlayImage', 'Répartissez une image entre plusieurs plans transparents.'],
  ['Ombre ou espace négatif', 'optics', null, '#silhouette', 'Utilisez un masque pour construire des volumes ou des évidements.'],
  ['Miroir ou inscription cachée', 'faces', 'material', '#materialMode', 'Choisissez un miroir ou une matière transparente, puis réglez la vue.']
];

export function bindWorkspace({resize, state}) {
  const workspace = document.querySelector('.studio-layout');
  const stageButtons = [...document.querySelectorAll('.studio-tabs button')];
  const inspectorButtons = [...document.querySelectorAll('[data-inspector]')];
  const panels = [...workspace.querySelectorAll('[data-panel]')];
  const inspectorPanels = [...workspace.querySelectorAll('[data-inspector-panel]')];
  const byId = id => document.getElementById(id);
  const narrow = matchMedia('(max-width: 980px)');
  function placeFaceSelection() {
    byId(narrow.matches ? 'faceSelectionMobile' : 'faceSelectionDesktop').append(byId('faceSelection'));
    resize();
  }
  narrow.addEventListener('change', placeFaceSelection);
  placeFaceSelection();


  function showStage(name) {
    workspace.dataset.stage = name;
    const [title, description] = stages[name];
    byId('stageTitle').textContent = title;
    byId('stageDescription').textContent = description;
    for (const button of stageButtons) {
      const active = button.dataset.stage === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const panel of panels) panel.hidden = panel.dataset.panel !== name;
    byId('creationPaths').hidden = name !== 'assembly';
    if (narrow.matches && name === 'faces') {
      document.querySelector('.face-panel').scrollIntoView({block:'nearest'});
    }
    resize();
  }

  function showInspector(name) {
    for (const button of inspectorButtons) button.setAttribute('aria-pressed', String(button.dataset.inspector === name));
    for (const panel of inspectorPanels) panel.hidden = panel.dataset.inspectorPanel !== name;
  }

  const inspect = byId('inspectSelection');
  inspect.onclick = () => {
    showStage('faces');
    showInspector('drawing');
    document.querySelector('[data-inspector="drawing"]').focus({preventScroll:true});
  };
  for (const button of stageButtons) button.onclick = () => showStage(button.dataset.stage);
  for (const button of inspectorButtons) button.onclick = () => showInspector(button.dataset.inspector);
  for (const [label, stage, inspector, selector, instruction] of paths) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = () => {
      showStage(stage);
      if (inspector) showInspector(inspector);
      byId('stageDescription').textContent = instruction;
      const target = document.querySelector(selector);
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      target.focus({preventScroll:true});
      target.scrollIntoView({block:'nearest'});
    };
    byId('creationPathList').append(button);
  }

  const projects = byId('localProjects');
  byId('recover').addEventListener('click', () => { projects.open = false; });
  document.addEventListener('pointerdown', event => {
    if (projects.open && !projects.contains(event.target)) projects.open = false;
  });
  projects.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    projects.open = false;
    projects.querySelector('summary').focus();
  });

  function refresh() {
    const {cubes, selected, face, publicView, hasReferences} = state();
    const index = cubes.findIndex(cube => cube.id === selected);
    const amount = cubes.length;
    inspect.disabled = index < 0;
    byId('projectDisplay').textContent = byId('projectName').value.trim() || 'Sans titre';
    byId('sceneSelection').textContent = index < 0 ? 'Aucune sélection' : 'Cube ' + (index+1) + ' · Face ' + face;
    byId('sceneStats').textContent = amount + (amount === 1 ? ' fragment' : ' fragments');
    byId('publishSummary').textContent = [
      publicView ? 'Vue de départ personnalisée' : 'Vue de départ automatique',
      hasReferences ? 'Références privées enregistrées' : 'Aucune référence privée'
    ].join(' · ');
  }
  byId('projectName').addEventListener('input', refresh);
  byId('face').addEventListener('change', refresh);
  showStage('assembly');
  return {refresh};
}

export function updatePlayerContext(controller, name) {
  const rules = controller.rules;
  const tools = controller.modes();
  const byId = id => document.getElementById(id);
  const count = controller.cubes.length;
  byId('puzzleName').textContent = name;
  byId('puzzleMeta').textContent = count + (count === 1 ? ' fragment' : ' fragments');
  const tips = [];
  if (rules.camera.orbit) tips.push('Glissez pour orbiter en mode Observer, ou utilisez le bouton droit dans la scène.');
  if (rules.camera.pan) tips.push('Déplacez le cadrage avec le bouton central ou à deux doigts.');
  if (rules.camera.zoom) tips.push('Agrandissez ou éloignez la scène avec la molette ou le pincement.');
  if (tools.rotate) tips.push('Dans Tourner, sélectionnez un fragment puis une poignée de rotation.');
  if (tools.move) tips.push('Dans Déplacer, les contours indiquent les destinations proposées.');
  if (tools.spacing) tips.push('Dans Écarter, ajustez la séparation des fragments.');
  if (tools.light || rules.lighting.shadows) tips.push('Dans Lumière, ajustez les réglages disponibles.');
  if (rules.camera.perspective && rules.camera.orthographic) tips.push('Ortho bascule vers une vue sans perspective.');
  if (rules.history.undo || rules.history.redo || rules.history.reset) {
    const history = [[rules.history.undo,'Annuler'],[rules.history.redo,'Rétablir'],[rules.history.reset,'Réinitialiser']]
      .filter(([allowed]) => allowed).map(([,label]) => label);
    tips.push('Historique disponible : ' + history.join(', ') + '.');
  }
  if (!tips.length) tips.push('Observez l’assemblage depuis sa vue de départ.');
  byId('playerTips').replaceChildren(...tips.map(tip => {
    const item = document.createElement('li');
    item.textContent = tip;
    return item;
  }));
}
