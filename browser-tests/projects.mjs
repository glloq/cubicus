import {readFile} from 'node:fs/promises';
import {captureFailure} from './diagnostics.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({viewport: {width: 1150, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8080') + '/studio.html');
  await page.locator('#view > canvas').waitFor();
  await page.locator('#localProjects summary').click();
  await page.locator('#projectName').fill('Atelier A');
  await page.locator('#add').click();
  await page.locator('#saveLocal').click();
  await page.getByRole('status').filter({hasText: 'Projet enregistré'}).waitFor();
  const original = await page.locator('#projectList').inputValue();
  await page.locator('#duplicateLocal').click();
  await page.getByRole('status').filter({hasText: 'Projet dupliqué'}).waitFor();
  assert.equal(await page.locator('#projectName').inputValue(), 'Atelier A (copie)');
  await page.locator('#add').click();
  await page.locator('#saveLocal').click();
  await page.getByRole('status').filter({hasText: 'Projet enregistré'}).waitFor();
  await page.locator('#restoreLocal').click();
  await page.getByRole('status').filter({hasText: 'Version restaurée'}).waitFor();
  assert.equal(await page.locator('#cubePicker option').count(), 5);
  await page.locator('#projectList').selectOption(original);
  await page.locator('#openLocal').click();
  await page.getByRole('status').filter({hasText: 'Projet ouvert'}).waitFor();
  assert.equal(await page.locator('#cubePicker option').count(), 5);
  assert.equal(await page.locator('#projectName').inputValue(), 'Atelier A');
  await page.locator('#add').click();
  await page.locator('#undo').click();
  assert.equal(await page.locator('#cubePicker option').count(), 5);
  await page.locator('#redo').click();
  assert.equal(await page.locator('#cubePicker option').count(), 6);

  await page.locator('.studio-tabs [data-stage=faces]').click();
  const canvas = page.locator('#paint');
  await canvas.scrollIntoViewIfNeeded();
  await page.locator('#brush').selectOption('line');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up();
  const painted = await canvas.evaluate(node => [...node.getContext('2d').getImageData(192,192,1,1).data]);
  assert.deepEqual(painted, [255,255,255,255]);
  await page.locator('#faceZoom').fill('200');
  assert.equal(await page.locator('#faceZoomValue').textContent(), '200%');
  await page.locator('#fitFace').click();

  await page.locator('#volumeEditor summary').click();
  await page.locator('#volumePreset').selectOption('tunnel');
  await page.locator('#volumeApply').click();
  assert.equal(await page.locator('#volumeCells button[aria-pressed=false]').count(), 16);
  const cell = page.locator('#volumeCells button[aria-pressed=false]').first();
  await cell.click();
  assert.equal(await page.locator('#volumeCells button[aria-pressed=false]').count(), 15);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const exported = await downloadPromise;
  const puzzle = JSON.parse(await readFile(await exported.path(), 'utf8'));
  assert.equal(puzzle.cubes.filter(fragment => fragment.volume).length, 1);
  assert.equal(puzzle.cubes.find(fragment => fragment.volume).volume.cells.length, 512);
  assert.equal(puzzle.cubes.some(fragment => 'layers' in fragment), false);

  await page.locator('#testInline').click();
  await page.locator('#playtest[open]').waitFor();
  const player = page.frameLocator('#playtestFrame');
  await player.locator('#view > canvas').waitFor();
  await player.locator('#reset').click();
  await page.locator('#closePlaytest').click();
  assert.equal(await page.locator('#playtest').isVisible(), false);

  const conflict = await page.evaluate(async () => {
    const {writeProject, loadProject} = await import('./src/projects.js');
    const id = crypto.randomUUID();
    const project = {name: 'Écriture concurrente'};
    const results = await Promise.allSettled([writeProject(id, 0, project), writeProject(id, 0, project)]);
    return [results.map(result => result.status).sort(), (await loadProject(id)).revision];
  });
  assert.deepEqual(conflict, [['fulfilled', 'rejected'], 1]);
  assert.deepEqual(errors, []);
  console.log('Projets locaux, duplication, versions, historique et concurrence OK');
} catch (error) {
  await captureFailure(browser, 'projects').catch(console.error);
  throw error;
} finally {
  await browser.close();
}
