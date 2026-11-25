export const tutorialTopics = {
  states: ['États et verrous', 'Une manipulation peut activer un état et rendre une pièce manipulable. Repérez les fragments qui se déverrouillent.'],
  contacts: ['Contacts de faces', 'Deux faces compatibles doivent se toucher et se faire face.'],
  connectors: ['Connecteurs', 'Deux pièces reliées se déplacent ensemble. Utilisez la sélection de groupe si elle est disponible.'],
  rails: ['Rails', 'Certaines pièces ne peuvent occuper que les cases de leur rail. Si le mode Déplacer est disponible, les contours montrent les destinations permises.'],
  hinge: ['Charnière', 'Sélectionnez le groupe articulé et utilisez la rotation collective autour de son pivot. Un obstacle sur l’arc peut bloquer la rotation.'],
  beam: ['Circuit lumineux', 'Un émetteur envoie un faisceau suivant la grille. Les miroirs peuvent le dévier et les capteurs réagissent quand le faisceau atteint leur face sensible.'],
  fresco: ['Fresque', 'Repérez les contours qui se prolongent d’une face à l’autre et redressez les fragments lorsque la rotation est autorisée.'],
  anamorphosis: ['Anamorphose', 'Changez de point de vue pour aligner visuellement des motifs répartis sur plusieurs fragments.'],
  overlay: ['Superposition', 'Observez comment les fragments transparents se superposent selon la direction du regard.'],
  shadow: ['Ombres', 'Regardez la silhouette projetée sur le plan de réception. La disposition des fragments et la direction de la lumière modifient cette silhouette.'],
  window: ['Ouvertures et espaces négatifs', 'Observez les passages à travers les volumes et les espaces entre les fragments.'],
  reflection: ['Reflets', 'Observez les surfaces réfléchissantes depuis plusieurs angles. Une inscription peut être visible dans le reflet.']
};

export function publicTutorial(value) {
  if (!Array.isArray(value)) return [];
  return Object.keys(tutorialTopics).filter(id => value.includes(id));
}

export function topicsFor(cubes, mechanisms, authored) {
  const topics = new Set(publicTutorial(authored));
  if (mechanisms?.gates.length || mechanisms?.rules.length) topics.add('states');
  if (mechanisms?.rules.some(rule => rule.event === 'contact')) topics.add('contacts');
  if (mechanisms?.joins.length) topics.add('connectors');
  if (mechanisms?.optics.length) topics.add('beam');
  if (cubes.some(cube => cube.constraints?.slots?.length > 1)) topics.add('rails');
  if (cubes.some(cube => cube.constraints?.pivot)) topics.add('hinge');
  if (cubes.some(cube => cube.materials?.some(material => material.mode === 'mirror'))) topics.add('reflection');
  return publicTutorial([...topics]);
}
