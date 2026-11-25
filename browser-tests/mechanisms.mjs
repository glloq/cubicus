import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {captureFailure} from './diagnostics.mjs';

const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];
  let unwanted=0;
  await page.route('https://example.invalid/**',route=>{unwanted++;return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/src/player.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nglobalThis.fixture={ctl,view};'});
  });
  await page.goto(base+'/studio.html');
  await page.locator('#view > canvas').waitFor();
  await page.locator('.studio-tabs [data-stage=mechanisms]').click();
  await page.locator('#mechanismTemplate').selectOption('sequence');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#loadMechanismTemplate').click();
  await page.locator('summary').filter({hasText:'Parcours privé'}).click();
  await page.locator('#verifyProof').click();
  assert.match(await page.locator('#proofReport').textContent(),/3 actions autorisées/);

  const downloading=page.waitForEvent('download');
  await page.locator('#export').click();
  const data=JSON.parse(await readFile(await (await downloading).path(),'utf8'));
  assert.equal(data.mechanisms.rules.length,2);
  assert.equal('proof' in data,false);
  await page.locator('#embed').click();
  await page.getByRole('status').filter({hasText:'Fichier HTML prêt'}).waitFor();
  const standaloneDownload=page.waitForEvent('download');
  await page.locator('#downloadStandalone').click();
  const html=await readFile(await (await standaloneDownload).path(),'utf8');
  const payload=JSON.parse(html.match(/<script type="application\/json" id="embeddedPuzzle">(.+?)<\/script>/)[1]);
  assert.equal(payload.mechanisms.rules.length,2);
  assert.equal('proof' in payload,false);
  assert.match(payload.instructions,/cube rouge/);
  await page.locator('#closeEmbed').click();

  await page.locator('#testInline').click();
  const player=page.frameLocator('#playtestFrame');
  await player.locator('#view > canvas').waitFor();
  const frame=await (await page.locator('#playtestFrame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>Boolean(globalThis.fixture));
  await player.locator('#playerTutorial[open]').waitFor();
  assert.match(await player.locator('#tutorialTopics').textContent(),/États et verrous/);
  assert.match(await player.locator('#puzzleObjective').textContent(),/cube rouge/);
  assert.doesNotMatch(await player.locator('#tutorialTopics').textContent(),/premier|s0/);
  await player.locator('#startPuzzle').click();
  const turned=await frame.evaluate(()=>{
    const ctl=fixture.ctl;
    const ids=ctl.mechanisms.rules.map(rule=>rule.cube);
    const gate=ctl.mechanisms.gates[0].cube;
    const rotate=id=>ctl.run({type:'rotate',ids:[id],axis:'Z',sign:1});
    const locked=rotate(gate);
    const first=rotate(ids[0]);
    ctl.view.animating=false;
    const second=rotate(ids[1]);
    ctl.view.animating=false;
    const unlocked=rotate(gate);
    return {locked,first,second,unlocked,active:ctl.activeFlags.length};
  });
  assert.deepEqual(turned,{locked:false,first:true,second:true,unlocked:true,active:2});
  await player.locator('#reset').click();
  assert.equal(await frame.evaluate(()=>fixture.ctl.activeFlags.length),0);
  await page.locator('#closePlaytest').click();

  await page.locator('#inspectSelection').click();
  await page.locator('#image').setInputFiles({
    name:'figure.svg',mimeType:'image/svg+xml',buffer:Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><script>throw Error("active")</script><image href="https://example.invalid/a.png" width="40" height="40"/><rect width="40" height="40" fill="#123456"/></svg>')
  });
  await page.locator('#imageImport[open]').waitFor();
  const pixel=await page.locator('#imagePreview').evaluate(canvas=>[...canvas.getContext('2d').getImageData(256,256,1,1).data]);
  assert.deepEqual(pixel,[18,52,86,255]);
  await page.locator('#applyImageImport').click();
  assert.equal(unwanted,0);

  await page.locator('summary').filter({hasText:'Forme vectorielle'}).click();
  await page.locator('#vectorFill').check();
  await page.locator('#vectorAdd').click();
  await page.locator('#vectorUpdate:enabled').waitFor();
  await page.locator('#vectorColor').fill('#cc2233');
  await page.locator('#vectorUpdate').click();
  await page.waitForFunction(()=>{
    const {data}=document.querySelector('#paint').getContext('2d').getImageData(256,256,1,1);
    return data[0]===204&&data[1]===34&&data[2]===51;
  });
  await page.locator('.studio-tabs [data-stage=mechanisms]').click();
  for(const option of ['rails','mirrors','contact','connectors','hinge','fresco','window','double','switched']){
    await page.locator('#mechanismTemplate').selectOption(option);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#loadMechanismTemplate').click();
    await page.locator('#verifyProof').click();
    assert.match(await page.locator('#proofReport').textContent(),/actions autorisées/,option);
  }
  await page.locator('#mechanismTemplate').selectOption('logicDoor');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#loadMechanismTemplate').click();
  await page.locator('#verifyProof').click();
  assert.match(await page.locator('#proofReport').textContent(),/5 actions autorisées/);
  assert.match(await page.locator('#logicJournal').textContent(),/conditions non remplies/);
  const sameRule=page.locator('#mechanismList li').filter({hasText:'Rotation'}).first();
  await sameRule.getByText('Autres actions',{exact:true}).click();
  await sameRule.getByRole('button',{name:'Réutiliser',exact:true}).click();
  assert.equal(await page.locator('#conditionDraft li').count(),2);
  assert.equal(await page.locator('#ruleCounter').inputValue(),'tours');
  await page.locator('#resetRuleDraft').click();
  await page.locator('#testInline').click();
  const logicPlayer=page.frameLocator('#playtestFrame');
  await logicPlayer.locator('#startPuzzle').click();
  const logicFrame=await (await page.locator('#playtestFrame').elementHandle()).contentFrame();
  const logic=await logicFrame.evaluate(()=>{
    const ctl=fixture.ctl;
    const [a,b]=ctl.mechanisms.rules.filter(rule=>rule.event==='enter').map(rule=>rule.cube);
    const dial=ctl.mechanisms.rules.find(rule=>rule.counter?.op==='add').cube;
    const run=(type,id,axis,sign=1)=>{ctl.view.animating=false;return ctl.run({type,ids:[id],axis,sign});};
    run('step',a,'X');
    run('step',b,'X');
    run('rotate',dial,'Z');
    run('rotate',dial,'Z');
    const result={lamps:fixture.view.lampPositions.length,counter:Object.values(ctl.gameState.counters)[0],zones:fixture.view.zoneLines.visible};
    ctl.travel('undo');
    result.undone=Object.values(ctl.gameState.counters)[0];
    result.lampsAfterUndo=fixture.view.lampPositions.length;
    return result;
  });
  assert.deepEqual(logic,{lamps:3,counter:2,zones:true,undone:1,lampsAfterUndo:2});
  await page.locator('#closePlaytest').click();

  await sameRule.getByRole('checkbox').check();
  await page.getByText('Dupliquer un module de règles',{exact:true}).click();
  await page.locator('#modulePrefix').fill('copie');
  await page.locator('#prepareModule').click();
  await page.locator('#moduleBindings select').first().waitFor();
  await page.locator('#duplicateModule').click();
  assert.match(await page.locator('#mechanismList').textContent(),/Compteur copie_tours/);
  assert.deepEqual(errors,[]);
  console.log('Mécanismes : preuve privée, verrou dynamique, reset, SVG et calque vectoriel OK');
}catch(error){
  await captureFailure(browser,'mechanisms').catch(console.error);
  throw error;
}finally{await browser.close();}
