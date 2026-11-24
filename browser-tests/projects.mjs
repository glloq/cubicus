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

  const imageBuffer = await page.evaluate(() => {
    const image = document.createElement('canvas');
    image.width = image.height = 32;
    const ctx = image.getContext('2d');
    ctx.fillStyle = '#e03040';
    ctx.fillRect(0, 0, 16, 32);
    return image.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#image').setInputFiles({
    name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(imageBuffer, 'base64')
  });
  await page.locator('#imageImport[open]').waitFor();
  await page.locator('#importFlipX').check();
  await page.locator('#importOpacity').fill('50');
  await page.locator('#applyImageImport').click();
  const imported = await canvas.evaluate(node => {
    const ctx = node.getContext('2d');
    return [ctx.getImageData(100,256,1,1).data[3], ctx.getImageData(410,256,1,1).data[3]];
  });
  assert.deepEqual(imported, [0, 128]);
  assert.equal(await page.locator('#blendFace').isChecked(), true);

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

  await page.locator('.studio-tabs [data-stage=prepare]').click();
  await page.locator('#referenceName').fill('Référence Alpha');
  await page.locator('#reference').click();
  await page.locator('#duplicateReference').click();
  assert.equal(await page.locator('#referenceList option').count(), 2);
  await page.locator('#compareReference').click();
  assert.match(await page.locator('#referenceComparison').textContent(), /6 poses concordantes/);

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
  await page.locator('.studio-tabs [data-stage=assembly]').click();
  await page.locator('#resourceLibrary summary').click();
  await page.locator('#resourceName').fill('Cube réutilisable');
  await page.locator('#resourceSave').click();
  await page.getByRole('status').filter({hasText:'Ressource sauvegardée'}).waitFor();
  await page.locator('#newProject').click();
  await page.getByRole('status').filter({hasText:'Nouveau projet créé'}).waitFor();
  await page.locator('#resourceUse').click();
  assert.equal(await page.locator('#cubePicker option').count(), 5);

  const reflection = await page.evaluate(async () => {
    const [{SceneView}, {cube}] = await Promise.all([import('./src/scene.js'), import('./src/model.js')]);
    const host = document.createElement('section');
    Object.assign(host.style, {width:'320px', height:'240px', position:'fixed', top:'0'});
    document.body.append(host);
    const view = new SceneView(host, () => {});
    const reflected = cube([1,0,1]);
    reflected.materials = Array.from({length:6}, () => ({mode:'unlit', color:'#ff0000'}));
    const mirrorCube = cube();
    mirrorCube.materials = Array.from({length:6}, (_, i) => ({mode:i === 4 ? 'mirror' : 'lit'}));
    view.update([mirrorCube, reflected], [], [0,0,0]);
    view.camera.position.set(0,0,4);
    view.orbit.target.set(-.5,0,0);
    view.orbit.update();
    view.render();
    const mirror = view.meshes[0].children.find(child => child.isReflector);
    const rendered = mirror?.camera.position.z < mirrorCube.p[2];
    const textureWidth = mirror?.getRenderTarget().width;
    view.toggleProjection();
    const orthographicFallback = mirror?.visible === false;
    host.remove();
    return {rendered, textureWidth, orthographicFallback};
  });
  assert.deepEqual(reflection, {rendered:true, textureWidth:256, orthographicFallback:true});
  assert.deepEqual(errors, []);
  console.log('Projets locaux, duplication, versions, historique et concurrence OK');
} catch (error) {
  await captureFailure(browser, 'projects').catch(console.error);
  throw error;
} finally {
  await browser.close();
}
