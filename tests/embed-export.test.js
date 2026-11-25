import assert from 'node:assert/strict';
import {test} from 'node:test';
import {iframeMarkup, standaloneDocument} from '../src/embed-export.js';

test('iframe keeps a single safe HTML line and rejects active source schemes', () => {
  assert.throws(() => iframeMarkup('javascript:alert(1)'), /HTTP/);
  assert.throws(() => iframeMarkup(' '), /HTTP/);
  assert.match(iframeMarkup('./x.html?note="go"&next=y'), /note=&quot;go&quot;&amp;next=y/);
  assert.match(iframeMarkup('<p>Énigme</p>\n', {inline:true}), /srcdoc="&lt;p&gt;Énigme&lt;\/p&gt;&#10;"/);
});

test('public data stays within the standalone JSON block', () => {
  const template = '<script type="application/json" id="embeddedPuzzle">__CUBICUS_PUZZLE__</script>';
  const data = {note:'</script><script>test</script>', token:'$&'};
  const html = standaloneDocument(template,data);
  assert.equal(html.match(/<\/script>/g).length,1);
  assert.deepEqual(JSON.parse(html.slice(html.indexOf('>')+1,html.lastIndexOf('<'))),data);
  assert.throws(() => standaloneDocument('',{}), /indisponible/);
});
