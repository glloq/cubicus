export function bindReferences({capture, restore, compare, changed, status}) {
  const q = id => document.getElementById(id);
  const list = q('referenceList');
  const name = q('referenceName');
  const notes = q('referenceNotes');
  let references = [];

  function active() { return references.find(item => item.id === list.value); }

  function refresh(id = list.value) {
    list.replaceChildren(...references.map(item => new Option(item.name, item.id)));
    if (references.some(item => item.id === id)) list.value = id;
    const item = active();
    name.value = item?.name ?? '';
    notes.value = item?.notes ?? '';
    for (const control of ['restore', 'renameReference', 'duplicateReference', 'deleteReference', 'compareReference']) {
      q(control).disabled = !item;
    }
    q('referenceComparison').textContent = '';
  }

  function add(label, snapshot, extraNotes = '') {
    if (references.length >= 16) {
      status('Le projet contient déjà 16 références privées.');
      return;
    }
    const item = {
      id: crypto.randomUUID(),
      name: label.trim().slice(0, 80) || 'Référence ' + (references.length + 1),
      notes: extraNotes.slice(0, 1000),
      ...structuredClone(snapshot)
    };
    references.push(item);
    refresh(item.id);
    changed();
  }

  list.onchange = () => refresh();
  q('reference').onclick = () => {
    const snapshot = capture();
    if (snapshot) {
      add(name.value && !active() ? name.value : '', snapshot, !active() ? notes.value : '');
      status('Conception mémorisée');
    }
  };
  q('restore').onclick = () => { if (active()) restore(active()); };
  q('renameReference').onclick = () => {
    const item = active();
    if (!item || !name.value.trim()) return;
    item.name = name.value.trim().slice(0, 80);
    item.notes = notes.value.slice(0, 1000);
    refresh();
    changed();
  };
  q('duplicateReference').onclick = () => {
    const item = active();
    if (item) add(item.name.slice(0, 73) + ' (copie)', {cubes: item.cubes, view: item.view}, item.notes);
  };
  q('deleteReference').onclick = () => {
    references = references.filter(item => item !== active());
    refresh();
    changed();
  };
  q('compareReference').onclick = () => {
    if (active()) q('referenceComparison').textContent = compare(active());
  };
  refresh();
  return {
    active,
    list: () => references,
    replace(items) { references = items; refresh(); },
    add
  };
}
