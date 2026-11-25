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

  await page.locator('#creationPaths summary').tap();
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

  await page.locator('[data-inspector=drawing]').tap();
  await page.locator('#cubeName').fill('Molette');
  await page.locator('#cubeName').press('Tab');
  const rear=page.locator('#faceTiles [data-face="5"]');
  await rear.tap();
  assert.match(await page.locator('#sceneSelection').textContent(),/Molette · Arrière/);
  assert.equal(await rear.getAttribute('aria-pressed'),'true');

  const artwork={name:'motif.svg',mimeType:'image/svg+xml',buffer:Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#d04466"/></svg>'
  )};
  await page.locator('#image').setInputFiles(artwork);
  await page.locator('#imageImport[open]').waitFor();
  assert.match(await page.locator('#imageTarget').textContent(),/Molette · Arrière/);
  assert.equal(await page.locator('#imageMode').inputValue(),'layer');
  await page.locator('#applyImageImport').tap();
  await page.waitForFunction(()=>document.querySelector('#faceTiles [data-face="5"] small').textContent==='Décorée');
  const pixel=(rgba)=>page.waitForFunction(value=>Array.from(
    document.querySelector('#paint').getContext('2d').getImageData(256,256,1,1).data
  ).join()===value,rgba);
  await pixel('208,68,102,255');
  await page.locator('#faceTiles [data-face="4"]').tap();
  await pixel('48,64,80,255');
  await rear.tap();
  await pixel('208,68,102,255');
  await page.locator('#fullFace').tap();
  await page.waitForFunction(()=>document.fullscreenElement?.contains(document.querySelector('#faceTiles')));
  await page.locator('#faceUndo').tap();
  await pixel('48,64,80,255');
  await page.locator('#faceRedo').tap();
  await pixel('208,68,102,255');
  await page.locator('#fullFace').tap();

  await page.locator('#image').setInputFiles(artwork);
  await page.locator('#imageMode').selectOption('repeat');
  await page.locator('#imageFaces input[value="4"]').check();
  await page.locator('#applyImageImport').tap();
  await page.locator('#faceTiles [data-face="4"]').tap();
  await pixel('208,68,102,255');
  await page.locator('#cubePicker').selectOption({index:1});
  await pixel('48,64,80,255');
  const panel=page.locator('#faceTiles');
  await page.locator('#image').setInputFiles({name:'bande.svg',mimeType:'image/svg+xml',buffer:Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">'+
    ['#d04466','#298020','#123456','#703090'].map((fill,i)=>'<rect x="'+(i*100)+'" width="100" height="100" fill="'+fill+'"/>').join('')+'</svg>'
  )});
  await page.locator('#imageMode').selectOption('strip');
  assert.match(await page.locator('#imageMultiPreview').textContent(),/Avant → Droite → Arrière → Gauche/);
  await page.locator('#applyImageImport').tap();
  for(const [face,rgba] of [[4,'208,68,102,255'],[0,'41,128,32,255'],[5,'18,52,86,255'],[1,'112,48,144,255']]){
    await panel.locator('[data-face="'+face+'"]').tap();
    await pixel(rgba);
  }
  await panel.locator('[data-face="2"]').tap();
  await pixel('48,64,80,255');

  await page.goto(base + '/play.html');
  await page.locator('#view > canvas').waitFor();
  await page.locator('#playerTutorial[open]').waitFor();
  await page.locator('#startPuzzle').tap();
  await page.locator('#playerHelp').tap();
  await page.locator('#playerTutorial[open]').waitFor();
  assert.match(await page.locator('#playerTips').textContent(),/molette ou le pincement/);
  await page.locator('#startPuzzle').tap();
  await page.locator('#load').setInputFiles({name:'incorrecte.puzzle',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.getByRole('status').filter({hasText:'Impossible d’ouvrir cette énigme'}).waitFor();
  assert.equal(await page.locator('#puzzleName').textContent(),'Démonstration');
  await page.locator('#demo').selectOption('1');
  assert.equal(await page.locator('#puzzleMeta').textContent(),'1 fragment');
  await page.locator('#playerTutorial[open]').waitFor();
  assert.doesNotMatch(await page.locator('#playerTips').textContent(),/séparation des fragments/);
  assert.equal(await page.locator('#status').textContent(),'');
  await page.locator('#startPuzzle').tap();
  await page.evaluate(()=>{
    const original=File.prototype.text;
    File.prototype.text=function(){
      if(this.name!=='retardee.puzzle')return original.call(this);
      return new Promise(resolve=>{window.releaseDelayed=()=>resolve('{}');});
    };
  });
  await page.locator('#load').setInputFiles({name:'retardee.puzzle',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.waitForFunction(()=>typeof window.releaseDelayed==='function');
  await page.locator('#demo').selectOption('4');
  await page.evaluate(()=>window.releaseDelayed());
  await page.locator('#playerTutorial[open]').waitFor();
  assert.equal(await page.locator('#puzzleMeta').textContent(),'4 fragments');
  assert.equal(await page.locator('#status').textContent(),'');
  assert.deepEqual(errors,[]);
  console.log('Atelier et Player : parcours guidés, inspecteur, volume et mise en page mobile OK');
} catch(error) {
  await captureFailure(browser,'workspace').catch(console.error);
  throw error;
} finally {
  await browser.close();
}
