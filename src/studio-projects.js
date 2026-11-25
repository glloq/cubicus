import { deleteProject, listProjects, loadProject, readPrivateProject, writeProject } from './projects.js';
import { download } from './storage.js';

export function bindProjects({read, apply, create, isComposing, hasFailedComposition, status}) {
  const q = id => document.getElementById(id);
  const catalog = q('projectList');
  const versions = q('projectHistory');
  const workspace = document.querySelector('.studio-layout');
  let active;
  let dirty = false;
  let timer;
  let queue = Promise.resolve();
  let switching = false;

  function enqueue(action) {
    queue = queue.then(action).catch(error => {
      const message = error.name === 'QuotaExceededError'
        ? 'Stockage local plein. Téléchargez le projet ou libérez de l’espace.'
        : error.message;
      if(dirty)q('draftState').textContent='Enregistrement impossible';
      status(message);
    });
    return queue;
  }

  async function refresh(preferred = catalog.value) {
    const entries = await listProjects();
    catalog.replaceChildren(...entries.map(({id, name, modified}) =>
      new Option(name + ' · ' + new Date(modified).toLocaleString('fr-FR'), id)));
    if (entries.some(entry => entry.id === preferred)) catalog.value = preferred;
    for (const id of ['openLocal', 'duplicateLocal', 'deleteLocal']) q(id).disabled = !catalog.value;
    const current = active && await loadProject(active.id);
    versions.replaceChildren(...(current?.history ?? []).map(({modified}, index) =>
      new Option(new Date(modified).toLocaleString('fr-FR'), index)));
    q('restoreLocal').disabled = !versions.options.length;
  }

  async function flush(keepVersion = false) {
    if (!dirty && !keepVersion) return;
    if (isComposing() || hasFailedComposition()) throw new Error('La composition des calques doit être terminée');
    const project = structuredClone(read());
    const id = active?.id ?? crypto.randomUUID();
    dirty = false;
    q('draftState').textContent='Enregistrement…';
    try {
      active = await writeProject(id, active?.revision ?? 0, project, {keepVersion});
      if(!dirty)q('draftState').textContent='Brouillon enregistré sur cet appareil';
    } catch (error) {
      dirty = true;
      throw error;
    }
  }

  function schedule() {
    if (switching) return;
    dirty = true;
    q('draftState').textContent='Modifications en cours';
    clearTimeout(timer);
    timer = setTimeout(() => {
      enqueue(async () => {
        if (!dirty || isComposing() || hasFailedComposition()) return;
        await flush();
        await refresh(active.id);
      });
    }, 350);
  }

  function switchProject(action) {
    if (switching) return;
    switching = true;
    workspace.inert = true;
    q('projectName').disabled = true;
    clearTimeout(timer);
    enqueue(async () => {
      try {
        await action();
      } finally {
        switching = false;
        workspace.inert = false;
        q('projectName').disabled = false;
      }
    });
  }

  async function show(raw, metadata) {
    const project = readPrivateProject(raw);
    apply(project);
    q('projectName').value = project.name;
    active = metadata;
    dirty = !metadata;
    // Imported and newly created work is saved immediately.
    await flush();
    await refresh(active?.id);
    if(active)q('draftState').textContent='Brouillon enregistré sur cet appareil';
  }

  q('projectName').oninput = schedule;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dirty && !switching && !isComposing() && !hasFailedComposition()) {
      clearTimeout(timer);
      enqueue(() => flush());
    }
  });
  q('saveLocal').onclick = () => enqueue(async () => {
    await flush(true);
    await refresh(active.id);
    status('Projet enregistré');
  });
  q('save').onclick = () => {
    if (isComposing() || hasFailedComposition()) {
      status('La composition des calques doit être terminée');
      return;
    }
    download(read(), 'project.cubicus');
  };
  q('newProject').onclick = () => switchProject(async () => {
    await flush();
    await show(create());
    status('Nouveau projet créé');
  });
  q('load').onchange = event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) switchProject(async () => {
      const project = readPrivateProject(JSON.parse(await file.text()));
      await flush();
      await show(project);
      status('Projet importé');
    });
  };
  q('openLocal').onclick = () => {
    const id = catalog.value;
    switchProject(async () => {
      await flush();
      const entry = await loadProject(id);
      if (!entry) throw new Error('Projet introuvable');
      await show(entry.project, entry);
      status('Projet ouvert');
    });
  };
  q('duplicateLocal').onclick = () => {
    const id = catalog.value;
    switchProject(async () => {
      await flush();
      const entry = await loadProject(id);
      if (!entry) throw new Error('Projet introuvable');
      await show({...entry.project, name: entry.name.slice(0, 73) + ' (copie)'});
      status('Projet dupliqué');
    });
  };
  q('deleteLocal').onclick = () => {
    const id = catalog.value;
    if (!id || !confirm('Supprimer ce projet et ses versions locales ?')) return;
    switchProject(async () => {
      const entry = await loadProject(id);
      if (!entry) throw new Error('Projet introuvable');
      if (id === active?.id && entry.revision !== active.revision) {
        throw new Error('Le projet actif a été modifié dans un autre onglet.');
      }
      await deleteProject(id, entry.revision);
      if (id === active?.id) {
        dirty = false;
        active = undefined;
        apply(readPrivateProject(create()));
        q('projectName').value = 'Sans titre';
      }
      await refresh();
      status('Projet supprimé');
    });
  };
  q('restoreLocal').onclick = () => {
    const index = Number(versions.value);
    switchProject(async () => {
      const entry = active && await loadProject(active.id);
      const previous = entry?.history[index];
      if (!previous || entry.revision !== active.revision) throw new Error('Version introuvable ou modifiée');
      const restored = readPrivateProject(previous.project);
      const current = structuredClone(read());
      if (isComposing() || hasFailedComposition()) throw new Error('La composition des calques doit être terminée');
      const backup = await writeProject(entry.id, entry.revision, current);
      const metadata = await writeProject(entry.id, backup.revision, restored, {keepVersion: true});
      await show(restored, metadata);
      status('Version restaurée');
    });
  };
  q('recover').onclick = () => switchProject(async () => {
    const [latest] = await listProjects();
    const entry = latest && await loadProject(latest.id);
    const legacy = !entry && await loadProject('current');
    if (!entry && !legacy) {
      status('Aucun brouillon');
      return;
    }
    await flush();
    // Flush can advance the revision of the entry just read.
    const recovered = entry && await loadProject(entry.id);
    await show(recovered?.project ?? legacy, recovered);
    status('Brouillon récupéré');
  });
  enqueue(refresh);
  function fork(name, populate){
    switchProject(async()=>{
      await flush();
      active=undefined;
      apply(readPrivateProject(create()));
      q('projectName').value=name;
      populate();
      dirty=true;
      await flush();
      await refresh(active.id);
    });
  }
  return {schedule,fork};
}
