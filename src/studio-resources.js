import {deleteResource, importResources, readResources, renameResource, RESOURCE_KINDS, saveResource} from './resources.js';
import {download} from './storage.js';

export function bindResources({capture, apply, status}) {
  const q = id => document.getElementById(id);
  const list = q('resourceList');
  const filter = q('resourceSearch');
  const name = q('resourceName');
  let resources = [];

  function active() { return resources.find(resource => resource.id === list.value); }
  function updateSelection() {
    const resource = active();
    name.value = resource?.name ?? '';
    for (const id of ['resourceUse','resourceRename','resourceCopy','resourceDelete']) q(id).disabled = !resource;
    const image = resource?.cubes.flatMap(cube => cube.faces).find(Boolean);
    const preview = q('resourcePreview');
    preview.hidden = !image;
    if (image) preview.src = image;
    else preview.removeAttribute('src');
  }
  function render(preferred = list.value) {
    const term = filter.value.trim().toLocaleLowerCase('fr');
    const matches = resources.filter(resource =>
      (resource.name + ' ' + RESOURCE_KINDS[resource.kind]).toLocaleLowerCase('fr').includes(term));
    list.replaceChildren(...matches.map(resource => new Option(resource.name + ' · ' + RESOURCE_KINDS[resource.kind], resource.id)));
    if (matches.some(resource => resource.id === preferred)) list.value = preferred;
    updateSelection();
  }

  async function refresh(preferred) {
    resources = await readResources();
    render(preferred);
  }
  function safely(action) {
    return async event => {
      try { await action(event); }
      catch (error) { status(error.message); }
    };
  }

  list.onchange = updateSelection;
  filter.oninput = () => render();
  q('resourceSave').onclick = safely(async () => {
    const kind = q('resourceKind').value;
    const cubes = capture(kind);
    if (!cubes) return;
    const id = await saveResource({cubes, kind, name: name.value || RESOURCE_KINDS[kind]});
    filter.value = '';
    await refresh(id);
    status('Ressource sauvegardée');
  });
  q('resourceUse').onclick = safely(() => { if (active()) apply(structuredClone(active())); });
  q('resourceRename').onclick = safely(async () => {
    if (!active()) return;
    await renameResource(active(), name.value);
    await refresh();
  });
  q('resourceCopy').onclick = safely(async () => {
    const resource = active();
    if (!resource) return;
    const id = await saveResource({...resource, name: resource.name.slice(0, 73) + ' (copie)'});
    filter.value = '';
    await refresh(id);
  });
  q('resourceDelete').onclick = safely(async () => {
    if (!active() || !confirm('Supprimer cette ressource de la bibliothèque locale ?')) return;
    await deleteResource(active().id);
    await refresh();
  });
  q('resourceExport').onclick = safely(async () => {
    download({version: 1, resources: await readResources()}, 'bibliotheque.cubicus');
  });
  q('resourceImport').onchange = safely(async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    await importResources(JSON.parse(await file.text()));
    await refresh();
    status('Bibliothèque importée');
  });
  safely(() => refresh())();
}
