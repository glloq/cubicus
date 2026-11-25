import {downloadFile} from './storage.js';

const filename = 'cubicus-enigme.html';
const marker = '__CUBICUS_PUZZLE__';
const escapeAttribute = value => value.replace(/[&<>"\r\n]/g, character => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', '\r':'&#13;', '\n':'&#10;'
})[character]);

export function standaloneDocument(template, puzzle) {
  const script = '<script type="application/json" id="embeddedPuzzle">'+marker+'</script>';
  if (!template.includes(script)) throw new Error('Lecteur autonome indisponible.');
  const json = JSON.stringify(puzzle).replaceAll('<', '\\u003c');
  return template.replace(script, () => script.replace(marker, () => json));
}

export function iframeMarkup(source, {inline = false} = {}) {
  if (!inline) {
    const url = new URL(source, 'https://example.invalid/');
    if (!source.trim() || !['https:', 'http:'].includes(url.protocol)) {
      throw new Error('Entrez un chemin relatif ou une URL HTTP(S).');
    }
  }
  const attribute = inline ? 'srcdoc' : 'src';
  return '<iframe '+attribute+'="'+escapeAttribute(source)+'" title="Énigme Cubicus" sandbox="allow-scripts" loading="lazy" style="display:block;width:100%;height:clamp(460px,70vw,720px);border:0"></iframe>';
}

async function fetchTemplate() {
  const response = await fetch(new URL('./standalone-player.html', import.meta.url));
  if (!response.ok) throw new Error('Lecteur autonome absent. Lancez npm run build:embed puis réessayez.');
  return response.text();
}

export function bindEmbedExport(snapshot) {
  const q = id => document.getElementById(id);
  const dialog = q('embedDialog');
  const message = q('embedStatus');
  const source = q('embedSource');
  const hosted = q('embedCode');
  const fallback = q('inlineCode');
  const buttons = ['downloadStandalone', 'copyHosted', 'copyInline'].map(q);
  let documentHtml;
  let revision = 0;

  function updateHosted() {
    try {
      hosted.value = iframeMarkup(source.value);
      q('copyHosted').disabled = !documentHtml;
      source.setCustomValidity('');
    } catch {
      hosted.value = '';
      q('copyHosted').disabled = true;
      source.setCustomValidity('Entrez un chemin relatif ou une URL HTTP(S).');
    }
  }

  async function copy(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      message.textContent = 'Code HTML copié.';
    } catch {
      if (field === fallback) {
        field.value = value;
        field.hidden = false;
      }
      field.focus();
      field.select();
      message.textContent = 'Le code est sélectionné. Copiez-le avec votre raccourci habituel.';
    }
  }

  async function open() {
    const current = ++revision;
    documentHtml = undefined;
    fallback.hidden = true;
    fallback.value = '';
    for (const button of buttons) button.disabled = true;
    message.textContent = 'Préparation du lecteur et des textures…';
    updateHosted();
    dialog.showModal();
    try {
      const [template, data] = await Promise.all([fetchTemplate(), snapshot()]);
      if (current !== revision || !dialog.open) return;
      documentHtml = standaloneDocument(template, data);
      for (const button of buttons) button.disabled = false;
      updateHosted();
      message.textContent = 'Fichier HTML prêt au téléchargement.';
    } catch (error) {
      if (current === revision && dialog.open) message.textContent = error.message;
    }
  }

  q('embed').onclick = open;
  q('closeEmbed').onclick = () => dialog.close();
  source.oninput = updateHosted;
  q('downloadStandalone').onclick = () => {
    if (documentHtml) downloadFile(new Blob([documentHtml], {type:'text/html;charset=utf-8'}), filename);
  };
  q('copyHosted').onclick = () => copy(hosted.value, hosted);
  q('copyInline').onclick = () => {
    if (documentHtml) copy(iframeMarkup(documentHtml, {inline:true}), fallback);
  };
}
