import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {captureFailure} from './diagnostics.mjs';

const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/src/player.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nglobalThis.testController=ctl;'});
  });
  await page.goto(base+'/studio.html');
  await page.getByRole('button',{name:'Commencer avec une serrure'}).tap();
  assert.equal(await page.locator('.studio-layout').getAttribute('data-stage'),'mechanisms');
  assert.match(await page.locator('#templateDescription').textContent(),/Déverrouillez/);
  await page.locator('#quickUnlock').tap();
  await page.locator('#ruleEditor[open]').waitFor();
  const source=await page.locator('#ruleCube').inputValue();
  assert.ok(source);
  assert.match(await page.locator('#ruleStepLabel').textContent(),/1 \/ 2/);
  await page.locator('#nextRuleStep').tap();
  assert.match(await page.locator('#ruleStepLabel').textContent(),/Effets · 2 \/ 2/);
  await page.locator('#ruleGateTarget').selectOption(source);
  await page.locator('#addRule').tap();
  assert.match(await page.locator('#ruleError').textContent(),/différente/);
  await page.locator('#ruleGateTarget').selectOption({index:2});
  assert.match(await page.locator('#rulePreview').textContent(),/Déverrouiller/);
  await page.locator('#addRule').tap();
  await page.locator('#ruleEditor[open]').waitFor({state:'detached'});
  await page.locator('#mechanismFilter').selectOption('rules');
  assert.equal(await page.locator('#mechanismList li').count(),1);

  await page.locator('#newRule').tap();
  await page.locator('#nextRuleStep').tap();
  assert.match(await page.locator('#ruleStepLabel').textContent(),/Conditions · 2 \/ 3/);
  await page.locator('#addCondition').tap();
  assert.equal(await page.locator('#conditionDraft li').count(),1);
  await page.locator('#resetRuleDraft').tap();
  assert.equal(await page.locator('#mechanismList li').count(),1);

  const download=page.waitForEvent('download');
  await page.locator('#export').tap();
  const puzzle=JSON.parse(await readFile(await (await download).path(),'utf8'));
  assert.equal(puzzle.mechanisms.rules.length,1);
  assert.equal(puzzle.mechanisms.gates.length,1);
  assert.notEqual(puzzle.mechanisms.gates[0].cube,puzzle.mechanisms.rules[0].cube);
  await page.locator('#testInline').tap();
  const player=page.frameLocator('#playtestFrame');
  await player.locator('#playerTutorial[open]').waitFor();
  assert.match(await player.locator('#tutorialTopics').textContent(),/États et verrous/);
  await player.locator('#startPuzzle').tap();
  const frame=await (await page.locator('#playtestFrame').elementHandle()).contentFrame();
  const result=await frame.evaluate(()=>{
    const ctl=globalThis.testController;
    const source=ctl.mechanisms.rules[0].cube;
    const target=ctl.mechanisms.gates[0].cube;
    const rotate=id=>ctl.run({type:'rotate',ids:[id],axis:'Z',sign:1});
    const locked=rotate(target);
    const triggered=rotate(source);
    ctl.view.animating=false;
    return {locked,triggered,unlocked:rotate(target)};
  });
  assert.deepEqual(result,{locked:false,triggered:true,unlocked:true});
  assert.deepEqual(errors,[]);
  console.log('Studio mobile : modèle, création guidée, conditions, export et Player OK');
}catch(error){
  await captureFailure(browser,'studio-wizard').catch(console.error);
  throw error;
}finally{await browser.close();}
