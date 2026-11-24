import {mechanismConfig} from './mechanisms.js';
import {controlRules} from './control-rules.js';
import {initialView} from './scene-state.js';
import { validateProjectCubes } from './layers.js';
import { publicInstructions, validate } from './model.js';

const HISTORY_LIMIT = 3;

export function readPrivateProject(raw) {
  const parseCubes = cubes => validateProjectCubes(cubes, validate({version: 1, cubes}));
  if (![1, 2].includes(raw?.version)) throw new Error('Version de projet inconnue');
  const oldReference = raw.reference ? parseCubes(raw.reference) : null;
  const references = Array.isArray(raw.references)
    ? raw.references.slice(0, 16).map(item => ({
        id: crypto.randomUUID(),
        name: normalizeName(item.name),
        notes: typeof item.notes === 'string' ? item.notes.slice(0, 1000) : '',
        cubes: parseCubes(item.cubes),
        view: item.view ?? null
      }))
    : oldReference ? [{
        id: crypto.randomUUID(), name: 'Conception', notes: '',
        cubes: oldReference, view: raw.referenceView ?? null
      }] : [];
  const cubes=parseCubes(raw.cubes);
  return {
    version: 2,
    name: normalizeName(raw.name),
    cubes,
    reference: oldReference,
    references,
    referenceView: raw.referenceView ?? null,
    view: raw.view ?? null,
    publicView: initialView(raw.publicView),
    library: Array.isArray(raw.library) ? raw.library.map(cube => parseCubes([cube])[0]) : [],
    controls: controlRules(raw.controls),
    mechanisms: mechanismConfig(raw.mechanisms,cubes),
    instructions: publicInstructions(raw.instructions),
    proof: Array.isArray(raw.proof) ? raw.proof.slice(0,500) : [],
    mixSeed: typeof raw.mixSeed==='string' ? raw.mixSeed.slice(0,80) : ''
  };
}

function normalizeName(name) {
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : 'Sans titre';
}

async function transact(mode, action) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('cubicus-studio-private', 2);
    request.onupgradeneeded = event => {
      if (event.oldVersion === 0 || !request.result.objectStoreNames.contains('projects')) {
        request.result.createObjectStore('projects');
      }
      request.result.createObjectStore('catalog', {keyPath: 'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Fermez les anciens onglets du Studio'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(['projects', 'catalog'], mode);
      let result;
      let error;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(error || transaction.error || new Error('Transaction interrompue'));
      action(transaction, value => { result = value; }, reason => {
        error = reason;
        transaction.abort();
      });
    });
  } finally {
    database.close();
  }
}

export function listProjects() {
  return transact('readonly', (transaction, done) => {
    const request = transaction.objectStore('catalog').getAll();
    request.onsuccess = () => done(request.result.sort((a, b) => b.modified - a.modified));
  });
}

export function loadProject(id) {
  return transact('readonly', (transaction, done) => {
    const request = transaction.objectStore('projects').get(id);
    request.onsuccess = () => done(request.result);
  });
}

export function writeProject(id, revision, project, {keepVersion = false} = {}) {
  return transact('readwrite', (transaction, done, abort) => {
    const store = transaction.objectStore('projects');
    const request = store.get(id);
    request.onsuccess = () => {
      const previous = request.result;
      if ((previous?.revision ?? 0) !== revision) {
        abort(new Error('Projet modifié dans un autre onglet. Ouvrez la dernière version.'));
        return;
      }
      const history = previous?.history ?? [];
      if (keepVersion && previous) history.unshift({modified: previous.modified, project: previous.project});
      const metadata = {id, revision: revision + 1, modified: Date.now(), name: normalizeName(project.name)};
      store.put({...metadata, project, history: history.slice(0, HISTORY_LIMIT)}, id);
      transaction.objectStore('catalog').put(metadata);
      done(metadata);
    };
  });
}

export function deleteProject(id, revision) {
  return transact('readwrite', (transaction, done, abort) => {
    const store = transaction.objectStore('projects');
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result?.revision !== revision) {
        abort(new Error('La version locale du projet a changé.'));
        return;
      }
      store.delete(id);
      transaction.objectStore('catalog').delete(id);
      done();
    };
  });
}
