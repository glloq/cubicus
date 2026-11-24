import {validate} from './model.js';
import {validateProjectCubes} from './layers.js';

export const RESOURCE_KINDS = {
  cube: 'Cube',
  face: 'Face et calques',
  materials: 'Matériaux',
  volume: 'Géométrie',
  assembly: 'Assemblage'
};

function parseResource(raw) {
  if (!Object.hasOwn(RESOURCE_KINDS, raw?.kind) || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error('Ressource invalide');
  }
  const cubes = validateProjectCubes(raw.cubes, validate({version: 1, cubes: raw.cubes}));
  if (raw.kind !== 'assembly' && cubes.length !== 1) throw new Error('Cette ressource doit contenir un seul cube.');
  return {id: crypto.randomUUID(), kind: raw.kind, name: raw.name.trim().slice(0, 80), cubes};
}

async function run(mode, action) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('cubicus-studio-resources', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('resources', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('resources', mode);
      const result = action(transaction.objectStore('resources'));
      transaction.oncomplete = () => resolve(result?.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Écriture des ressources interrompue'));
    });
  } finally { database.close(); }
}

export function readResources() { return run('readonly', store => store.getAll()); }
export function saveResource(raw) {
  const resource = parseResource(raw);
  return run('readwrite', store => store.put(resource));
}
export function deleteResource(id) { return run('readwrite', store => store.delete(id)); }
export function renameResource(resource, name) {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Entrez un nom de ressource.');
  return run('readwrite', store => store.put({...resource, name: trimmed}));
}
export function importResources(archive) {
  if (archive?.version !== 1 || !Array.isArray(archive.resources) || archive.resources.length > 256) {
    throw new Error('Archive de bibliothèque invalide');
  }
  const resources = archive.resources.map(parseResource);
  return run('readwrite', store => { for (const resource of resources) store.put(resource); });
}
