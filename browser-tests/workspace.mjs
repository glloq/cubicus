import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {captureFailure} from './diagnostics.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/studio.html');
  await page.locator('#view > canvas').waitFor();
  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.scene-heading').getBoundingClientRect();
    const view = document.querySelector('#view').getBoundingClientRect();
    const dock = document.querySelector('.scene-footer').getBoundingClientRect();
    return {width:document.documentElement.scrollWidth, viewport:innerWidth,
      header:header.bottom, viewTop:view.top, viewBottom:view.bottom, dock:dock.top};
  });
  assert.equal(geometry.width,geometry.viewport);
  assert.ok(geometry.header <= geometry.viewTop && geometry.viewBottom <= geometry.dock);

  await page.getByRole('button',{name:'Anamorphose',exact:true}).tap();
  assert.equal(await page.locator('.studio-layout').getAttribute('data-stage'),'optics');
  assert.equal(await page.locator('#projectionImage').isVisible(),true);
  assert.equal(await page.locator('#sceneStats').textContent(),'4 fragments');

  await page.locator('#inspectSelection').tap();
  assert.equal(await page.locator('[data-inspector=drawing]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#paint').isVisible(),true);
  await page.locator('[data-inspector=material]').tap();
  assert.equal(await page.locator('#materialMode').isVisible(),true);
  assert.equal(await page.locator('#paint').isVisible(),false);
  await page.locator('[data-inspector=geometry]').tap();
  await page.locator('#volumeEditor summary').tap();
  await page.locator('#volumePreset').selectOption('tunnel');
  await page.locator('#volumeApply').tap();
  assert.ok(await page.locator('#volumeCells button[aria-pressed=false]').count() > 0);

  await page.goto(base + '/play.html');
  await page.locator('#view > canvas').waitFor();
  await page.locator('#playerHelp summary').tap();
  assert.match(await page.locator('#playerTips').textContent(),/molette ou le pincement/);
  await page.locator('#load').setInputFiles({name:'incorrecte.puzzle',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.getByRole('status').filter({hasText:'Impossible d’ouvrir cette énigme'}).waitFor();
  assert.equal(await page.locator('#puzzleName').textContent(),'Démonstration');
  await page.locator('#demo').selectOption('1');
  assert.equal(await page.locator('#puzzleMeta').textContent(),'1 fragment');
  assert.equal(await page.locator('#status').textContent(),'');
  assert.deepEqual(errors,[]);
  console.log('Atelier et Player : parcours guidés, inspecteur, volume et mise en page mobile OK');
} catch(error) {
  await captureFailure(browser,'workspace').catch(console.error);
  throw error;
} finally {
  await browser.close();
}
