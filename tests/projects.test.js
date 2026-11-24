import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cube} from '../src/model.js';
import {readPrivateProject} from '../src/projects.js';
import {History} from '../src/history.js';

test('migration keeps private raster layers and legacy references', () => {
  const fragment = cube();
  fragment.layers = [[{image: 'data:image/png;base64,AA==', name: 'Motif'}]];
  const migrated = readPrivateProject({version: 1, cubes: [fragment], reference: [fragment]});
  assert.equal(migrated.version, 2);
  assert.equal(migrated.name, 'Sans titre');
  assert.equal(migrated.cubes[0].layers[0][0].name, 'Motif');
  assert.deepEqual(migrated.reference, migrated.cubes);
  assert.notEqual(migrated.reference[0], migrated.cubes[0]);
  assert.throws(() => readPrivateProject({version: 3, cubes: [fragment]}), /Version/);
});

test('history keeps the latest entries and discards redo on a new edit', () => {
  const history = new History(2);
  history.record(0);
  history.record(1);
  history.record(2);
  assert.equal(history.back(() => 3), 2);
  assert.equal(history.back(() => 2), 1);
  assert.equal(history.back(() => assert.fail('No state to capture')), undefined);
  assert.equal(history.forward(() => 1), 2);
  history.record(2);
  assert.equal(history.forward(() => assert.fail('Redo branch should be gone')), undefined);
});
