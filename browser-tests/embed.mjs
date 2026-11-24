import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {captureFailure} from './diagnostics.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const directory = await mkdtemp(join(tmpdir(), 'cubicus-embed-'));
const browser = await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try {
  const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
  const studio = await context.newPage();
  await studio.goto(base+'/studio.html');
  await studio.locator('#nx').fill('1');
  await studio.locator('#ny').fill('1');
  await studio.locator('#generate').click();
  await studio.locator('#inspectSelection').click();
  await studio.locator('#text').fill('TEST');
  await studio.locator('#textAdd').click();
  await studio.locator('.studio-tabs [data-stage=prepare]').click();
  await studio.getByText('Thèmes du tutoriel',{exact:true}).click();
  await studio.locator('#tutorialTopics input[value=anamorphosis]').check();
  await studio.locator('#embed').click();
  await studio.getByRole('status').filter({hasText:'Fichier HTML prêt'}).waitFor();
  const downloadPromise = studio.waitForEvent('download');
  await studio.locator('#downloadStandalone').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'cubicus-enigme.html');
  const path = join(directory,download.suggestedFilename());
  await download.saveAs(path);
  const html = await readFile(path,'utf8');
  const payload = JSON.parse(html.match(/<script type="application\/json" id="embeddedPuzzle">(.+?)<\/script>/)[1]);
  assert.equal(payload.cubes.length,1);
  assert.ok(payload.cubes[0].faces.some(face => face?.startsWith('data:image/png;base64,')));
  assert.equal('references' in payload,false);
  assert.deepEqual(payload.tutorial,['anamorphosis']);

  const hosted = await studio.locator('#embedCode').inputValue();
  assert.equal(hosted.split('\n').length,1);
  assert.match(hosted,/src="\.\/cubicus-enigme\.html"/);
  await studio.locator('#copyInline').click();
  await studio.getByRole('status').filter({hasText:'Code HTML copié'}).waitFor();
  const inline = await studio.evaluate(() => navigator.clipboard.readText());
  assert.equal(inline.split('\n').length,1);
  assert.match(inline, /^<iframe srcdoc="/);

  async function verifyPlayer(surface) {
    await surface.getByText('1 fragment',{exact:true}).waitFor();
    await surface.locator('#view > canvas').waitFor();
    await surface.locator('#playerTutorial[open]').waitFor();
    assert.match(await surface.locator('#tutorialTopics').textContent(),/Anamorphose/);
    await surface.locator('#startPuzzle').click();
    assert.equal(await surface.locator('#demo').isVisible(),false);
    assert.equal(await surface.locator('#load').isVisible(),false);
    assert.equal(await surface.locator('#status').textContent(),'');
    await surface.locator('button[data-mode="rotate"]').click();
    await surface.locator('#view > canvas').click();
    await surface.locator('.rotationtools summary').click();
    await surface.locator('#rotations button:enabled').first().click();
    await surface.locator('#undo:enabled').waitFor();
    await surface.locator('#reset').click();
    assert.equal(await surface.locator('#undo').isDisabled(),true);
  }

  const offline = await browser.newContext({offline:true});
  let local = await offline.newPage();
  try {
    await local.goto(pathToFileURL(path).href);
  } catch (error) {
    if (!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    console.log('Les URL file: sont bloquées par Chromium local. Vérification du même fichier sans réseau.');
    await local.close();
    local = await offline.newPage();
    await local.setContent(html);
  }
  await verifyPlayer(local);

  const inlineHost = await offline.newPage();
  await inlineHost.setContent('<main style="width:400px"><div>'+inline+'</div></main>');
  await verifyPlayer(inlineHost.frameLocator('iframe'));

  const hostedPage = await context.newPage();
  await hostedPage.route(base+'/integration-test.html', route => route.fulfill({
    contentType:'text/html',body:'<div style="width:500px">'+hosted+'</div>'
  }));
  await hostedPage.route(base+'/cubicus-enigme.html', route => route.fulfill({contentType:'text/html',body:html}));
  await hostedPage.goto(base+'/integration-test.html');
  await verifyPlayer(hostedPage.frameLocator('iframe'));
  console.log('Export autonome : fichier hors ligne et intégrations iframe validés');
} catch (error) {
  await captureFailure(browser,'embed').catch(console.error);
  throw error;
} finally {
  await browser.close();
  await rm(directory,{recursive:true,force:true});
}
