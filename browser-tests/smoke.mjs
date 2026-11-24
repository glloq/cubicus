import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();const errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'http://127.0.0.1:8080';
 await page.goto(base+'/studio.html');await page.locator('#view canvas').waitFor();await page.locator('#net button').first().waitFor();assert.equal(await page.locator('#net button').count(),6);
 await page.locator('#text').fill('TEST');await page.locator('#textAdd').click();
 await page.locator('#reference').click();await page.locator('#shuffle').click();
 const popupPromise=page.waitForEvent('popup');await page.locator('#test').click();const player=await popupPromise;await player.waitForURL('**/play.html?test=*');await player.locator('#view canvas').waitFor();await player.locator('[data-mode=light]').waitFor();
 await player.locator('[data-mode=light]').click();await player.locator('.lighttools summary').click();await player.locator('#shadows').check();
 await player.getByRole('button',{name:'Ortho',exact:true}).click();await player.getByRole('button',{name:'Perspective',exact:true}).click();
 await player.locator('#demo').selectOption('18');await player.locator('[data-mode=rotate]').click();await player.locator('#scope').selectOption('all');await player.locator('.rotationtools summary').click();await player.locator('#rotations button').first().click();await player.locator('#undo').click();await player.locator('#reset').click();
 // Create a PNG locally; no network fixture or solution is needed.
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,128);x.fillStyle='#111';x.fillRect(20,20,100,80);return c.toDataURL().split(',')[1]});
 const fixture={name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await page.locator('#mural').setInputFiles(fixture);await page.locator('#muralCreate').click();await page.locator('#status').filter({hasText:'Fresque créée'}).waitFor();
 await page.locator('summary').filter({hasText:'Projection anamorphique'}).click();await page.locator('#projectionImage').setInputFiles(fixture);await page.locator('#projectImage').click();await page.locator('#status').filter({hasText:'faces texturées'}).waitFor();await page.locator('#projectionView').click();
 await page.waitForTimeout(1000);await page.reload();await page.locator('#recover').click();await page.locator('#status').filter({hasText:'Brouillon récupéré'}).waitFor();
 await page.locator('summary').filter({hasText:'Superposition optique'}).click();await page.locator('#overlayImage').setInputFiles(fixture);await page.locator('#overlayCreate').click();await page.locator('#status').filter({hasText:'Superposition créée'}).waitFor();assert.deepEqual(errors,[]);console.log('Studio → Player smoke OK');
}finally{await browser.close()}
