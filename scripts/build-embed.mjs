import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const [page, base, workspace, license, bundle] = await Promise.all([
  read('play.html'),
  read('src/style.css'),
  read('src/workspace.css'),
  read('node_modules/three/LICENSE'),
  build({
    absWorkingDir:fileURLToPath(root),
    entryPoints:['src/player.js'],
    bundle:true,
    format:'esm',
    target:'es2022',
    minify:true,
    legalComments:'inline',
    write:false
  })
]);

function replace(html, pattern, value) {
  if (!pattern.test(html)) throw new Error('Balise requise absente du Player : ' + pattern);
  return html.replace(pattern, () => value);
}

let standalone = replace(page, /<script type="importmap">[^<]*<\/script>/, '');
standalone = replace(standalone, /<link[^>]+href="\.\/src\/style\.css">/, '');
standalone = replace(standalone, /<link[^>]+href="\.\/src\/workspace\.css">/, '');
standalone = replace(standalone, /<\/head>/, '<style>\n'+base+'\n'+workspace+'\n</style>\n</head>');
standalone = replace(standalone, /<script type="module" src="\.\/src\/player\.js"><\/script>/,
  '<script type="application/json" id="embeddedPuzzle">__CUBICUS_PUZZLE__</script>\n' +
  '<script type="module">'+bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')+'</script>');
standalone = standalone.replace('<!doctype html>', () => '<!doctype html>\n<!-- Three.js\n'+license.replaceAll('--','—')+'\n-->');
await writeFile(new URL('src/standalone-player.html', root), standalone);
