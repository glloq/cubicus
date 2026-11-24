import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {captureFailure} from './diagnostics.mjs';
import {controlRules} from '../src/control-rules.js';
import {grid, exportPuzzle} from '../src/model.js';

const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1050,height:840}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Capture the real view/controller instances through their normal entry points.
  await page.route('**/src/player.js', async route=>{
    const original=await route.fetch();
    await route.fulfill({response:original,body:(await original.text())+'\nglobalThis.fixture = {ctl,view};'});
  });
  await page.goto(base+'/play.html');
  await page.waitForFunction(()=>Boolean(window.fixture));
  const state=()=>page.evaluate(()=>({
    cubes:fixture.ctl.cubes.map(cube=>({p:cube.p,r:cube.r})),
    spacing:[...fixture.ctl.spacing], mode:fixture.ctl.mode,
    light:fixture.ctl.lightState(), orthographic:fixture.view.camera.isOrthographicCamera===true
  }));
  const upload=async puzzle=>{
    await page.locator('#load').setInputFiles({name:'test.puzzle',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(puzzle))});
    await page.waitForFunction(ids=>ids.every(id=>fixture.ctl.cubes.some(cube=>cube.id===id)),puzzle.cubes.map(cube=>cube.id));
  };
  const cubes=grid(2,2,1);
  cubes[0].constraints={fixed:true};
  const rules=controlRules({version:2,rotation:{individual:true,simultaneous:false,collective:false,axes:['Z']},
    movement:{swap:false,emptySlots:false},spacing:{axes:['X'],max:.7,step:.1},lighting:{direction:false,shadows:false}});
  const puzzle=exportPuzzle(cubes,rules,{position:[0,0,10],target:[0,0,0],spacing:[.2,.3,.4],zoom:1,orthographic:true});
  await upload(puzzle);
  const initial=await state();
  assert.equal(initial.orthographic,true);
  assert.equal(await page.locator('[data-mode=move]').isVisible(),false);
  assert.equal(await page.locator('#undo').isDisabled(),true);
  await page.locator('[data-mode=rotate]').click();
  const canvas=page.locator('#view > canvas');
  const liveCube=puzzle.cubes.find(cube=>!cube.constraints);
  async function cubePoint(id) {
    return page.evaluate(id=>{
      const mesh=fixture.view.meshes.find(item=>item.userData.id===id);
      const projected=mesh.position.clone().project(fixture.view.camera);
      const rect=fixture.view.renderer.domElement.getBoundingClientRect();
      return {x:rect.left+(1+projected.x)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2};
    },id);
  }
  async function clickCube(id){ const point=await cubePoint(id); await page.mouse.click(point.x,point.y); }
  await clickCube(puzzle.cubes.find(cube=>cube.constraints?.fixed).id);
  assert.equal(await page.evaluate(()=>fixture.view.handles.length),0);
  await clickCube(liveCube.id);
  await canvas.press('KeyX');
  assert.deepEqual((await state()).cubes,initial.cubes);
  assert.deepEqual(await page.evaluate(()=>[...new Set(fixture.view.handles.map(handle=>handle.userData.axis))]),['Z']);
  await canvas.press('KeyZ');
  assert.notDeepEqual((await state()).cubes,initial.cubes);
  await page.locator('#undo').click();
  assert.deepEqual((await state()).cubes,initial.cubes);
  const handle = await page.evaluate(()=>{
    const arrow=fixture.view.handles.find(item=>item.geometry.type==='ConeGeometry');
    const p=arrow.position.clone().project(fixture.view.camera);
    const r=fixture.view.renderer.domElement.getBoundingClientRect();
    return {x:r.left+(1+p.x)*r.width/2,y:r.top+(1-p.y)*r.height/2};
  });
  await page.mouse.click(handle.x,handle.y);
  assert.notDeepEqual((await state()).cubes,initial.cubes);
  await page.locator('#undo').click();
  await page.locator('[data-mode=spacing]').click();
  assert.deepEqual(await page.evaluate(()=>fixture.view.handles.map(handle=>handle.userData.axis)),['X']);
  await page.locator('#gap').fill('70');
  assert.deepEqual((await state()).spacing,[.7,.3,.4]);
  await page.locator('#reset').click();
  assert.deepEqual(await state(),initial);

  const movers=grid(2,1,1);
  const movingPuzzle=exportPuzzle(movers,controlRules({version:2,movement:{emptySlots:false},
    rotation:{individual:false,simultaneous:false,collective:false},
    lighting:{direction:false,position:true,shadows:false},camera:{roll:true}}),
    {position:[0,0,8],target:[0,0,0],spacing:[.1,0,0],zoom:1,orthographic:true,
      lighting:{type:'point',position:[2,3,4],intensity:2}});
  await upload(movingPuzzle);
  await page.locator('button[data-mode=move]').click();
  const [a,b]=await Promise.all(movingPuzzle.cubes.map(cube=>cubePoint(cube.id)));
  const previous=(await state()).cubes;
  await page.mouse.move(a.x,a.y);
  await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:5});
  await page.mouse.up();
  assert.deepEqual((await state()).cubes.map(cube=>cube.p),previous.map(cube=>cube.p).reverse());
  await page.locator('button[data-mode=light]').click();
  await page.locator('.lighttools summary').click();
  assert.equal(await page.locator('#az').isVisible(),false);
  await page.locator('#lightX').fill('6');
  assert.equal(await page.evaluate(()=>fixture.view.light.isPointLight&&fixture.view.light.position.x),6);
  await page.locator('[data-roll="1"]').click();
  assert.notDeepEqual(await page.evaluate(()=>fixture.view.camera.up.toArray()),[0,1,0]);
  await page.locator('#reset').click();
  assert.deepEqual(await page.evaluate(()=>fixture.view.light.position.toArray()),[2,3,4]);
  assert.deepEqual(await page.evaluate(()=>fixture.view.camera.up.toArray()),[0,1,0]);

  const studio=await browser.newPage({viewport:{width:1100,height:850}});
  studio.on('pageerror',error=>errors.push(error.message));
  await studio.goto(base+'/studio.html');
  await studio.locator('.studio-tabs [data-stage=prepare]').click();
  await studio.locator('summary').filter({hasText:'Outils du joueur'}).click();
  await studio.locator('#controlProfile').selectOption('observation');
  await studio.locator('#testInline').click();
  const player=studio.frameLocator('#playtestFrame');
  await player.locator('#controls[hidden]').waitFor({state:'attached'});
  await studio.locator('#closePlaytest').click();
  await studio.locator('.studio-tabs [data-stage=assembly]').click();
  assert.equal(await studio.locator('button[data-mode=rotate]').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('Contrôles adaptatifs : contraintes, clavier, sélection 3D, écartement, réinitialisation et mode Joueur OK');
} catch(error) {
  await captureFailure(browser,'adaptive').catch(console.error);
  throw error;
} finally { await browser.close(); }
