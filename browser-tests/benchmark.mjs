import {chromium} from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({viewport: {width: 1024, height: 768}});
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8080') + '/studio.html');
  const measurements = await page.evaluate(async () => {
    const [{SceneView}, {grid}] = await Promise.all([import('./src/scene.js'), import('./src/model.js')]);
    const host = document.createElement('section');
    Object.assign(host.style, {position: 'fixed', inset: '0 auto auto 0', width: '640px', height: '480px'});
    document.body.replaceChildren(host);
    const scene = new SceneView(host, () => {});
    const gl = scene.renderer.getContext();
    const rows = [];
    const median = values => values.sort((a,b) => a-b)[Math.floor(values.length / 2)];
    for (const dimensions of [[1,1,1],[2,2,1],[2,2,2],[3,3,2],[3,3,3],[4,4,4],[5,5,5],[8,8,8]]) {
      const cubes = grid(...dimensions);
      gl.finish();
      const start = performance.now();
      scene.update(cubes);
      gl.finish();
      const updateMs = performance.now() - start;
      scene.fit();
      const frames = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        scene.render();
        gl.finish();
        frames.push(performance.now() - start);
      }
      rows.push({cubes: cubes.length, updateMs: +updateMs.toFixed(1), frameMs: +median(frames).toFixed(1),
        drawCalls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles});
    }
    return rows;
  });
  console.table(measurements);
} finally {
  await browser.close();
}
