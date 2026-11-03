/*
 * Build-Hilfsskript (nicht Teil der App): fuellt alle Felder (inkl. aller drei
 * Zusatzzeilen) und misst die Gruppenklammer â€“ bleibt sie vollstaendig
 * sichtbar, wenn die Feldspalte knapp wird?
 * Zwei Blattgroessen: A4-Druck (2 x 148,5 mm) und das kurze Etikett
 * (140 mm, beide Etiketten erzwungen).
 *   node .build/fill-measure.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const probe = `
<pre id="p">-</pre>
<script>
function measure() {
  var MM = 25.4 / 96;
  function mm(px) { return Math.round(px * MM * 100) / 100; }
  function r(n) { return n.getBoundingClientRect(); }
  var out = [];
  var L = document.querySelector('.label[data-index="0"]');
  var sheet = document.getElementById('sheet');
  var z = parseFloat(getComputedStyle(sheet).getPropertyValue('--zoom'));
  z = z > 0 ? z : 1;
  var lb = r(L);
  var fields = L.querySelector('.label__fields');
  var rec = L.querySelector('.recipient');
  var grp = L.querySelector('.lrow--group');
  var g = r(grp);
  var extras = [].slice.call(grp.querySelectorAll('.lrow--extra'));
  var vals = [].slice.call(grp.querySelectorAll('.lrow--extra > .lrow__v'));
  out.push('zoom ' + z.toFixed(3) +
    ' | Feldspalte h ' + mm(r(fields).height / z) + ' scrollH ' + mm(fields.scrollHeight / z) +
    ' | Ueberlauf ' + mm((fields.scrollHeight - fields.clientHeight) / z) + 'mm');
  out.push('Gruppe h ' + mm(g.height / z) + ' oben ' + mm((g.top - lb.top) / z) +
    ' unten ' + mm((g.bottom - lb.top) / z) + ' | inline ' + (grp.getAttribute('style') || '-'));
  /* Gleichmaessigkeit: Abstand zwischen den Textzeilen der Gruppe
     (ex Produktion -> Zusatz 1 -> Zusatz 2 -> Zusatz 3), gemessen von
     Oberkante zu Oberkante der Werte. */
  var lines = [].slice.call(grp.querySelectorAll('.lrow__v')).map(function (v) {
    return r(v).top;
  });
  var steps = [];
  for (var i = 1; i < lines.length; i += 1) {
    steps.push(mm((lines[i] - lines[i - 1]) / z));
  }
  out.push('Zeilenabstaende (Oberkante zu Oberkante): ' + steps.join(' / ') + 'mm' +
    ' | Streuung ' + mm((Math.max.apply(null, steps) - Math.min.apply(null, steps))) + 'mm');
  out.push('Zusatzzeilen: ' + extras.map(function (e, i) {
    var v = vals[i];
    var eb = r(e);
    var vb = r(v);
    return 'h' + mm(eb.height / z) + ' text ' + mm(vb.height / z) +
      ' sichtbar ' + mm(Math.max(0, Math.min(eb.bottom, vb.bottom) - Math.max(eb.top, vb.top)) / z);
  }).join(' | '));
  out.push('Empfaenger ' + mm((r(rec).top - lb.top) / z) + '-' + mm((r(rec).bottom - lb.top) / z) +
    ' | Etikett h ' + mm(lb.height / z));
  out.push('Feldspalte: --fields-gap ' +
    getComputedStyle(fields).getPropertyValue('--fields-gap').trim() +
    ' | Ueberlauf ' + mm((fields.scrollHeight - fields.clientHeight) / z) + 'mm' +
    ' | Kinder ' + fields.children.length);
  const cut = Math.max.apply(null, extras.map(function (e) {
    return Math.max(0, (r(e).bottom - g.bottom) / z);
  }));
  out.push('ueber die Gruppenbox hinaus: ' + mm(cut) + 'mm');
  /* Unterer Klammerstrich: er fuellt die Gruppenbox. Sichtbar bleibt er bis
     zur Unterkante der Feldspalte bzw. bis 2,4 mm unter der Gruppenbox
     (clip-margin) â€“ liegt die Klammer darunter, ist sie gekappt. */
  var clipBottom = Math.min(r(fields).bottom, g.bottom + 2.4);
  out.push('Klammerstrich unten ' + mm((g.bottom - lb.top) / z) +
    ' | sichtbar bis ' + mm((clipBottom - lb.top) / z) +
    (g.bottom <= clipBottom + 0.5 ? ' -> vollstaendig' : ' -> GEKAPPT'));
  document.getElementById('p').textContent = out.join('\\n');
}
window.addEventListener('load', function () {
  window.setTimeout(function () {
    function s(sel, v) {
      var n = document.querySelector(sel);
      n.value = v;
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }
    s('#fFurnace', 'K-08');
    s('#fProduction', 'Charge BF-01');
    s('#fExtra1', 'AUS OFEN');
    s('#fExtra2', 'C100');
    s('#fExtra3', 'Restcharge 12,4 t');
    window.setTimeout(measure, 800);
  }, 400);
});
</script>
</body>`;

const probeFile = path.join(outDir, 'fill-short.html');
fs.writeFileSync(probeFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', probe), 'utf8');

/* Kurzes Etikett (140 mm): beide Etiketten sichtbar erzwingen, damit auch das
   zweite (sonst bis 297 mm reichende) Etikett gemessen wird. */
const shortCss = '<style>' +
  '.label{height:140mm!important}' +
  '.label[data-index="1"]{display:block!important;top:148.5mm!important}' +
  '.sheet,.sheet__labels{height:288.5mm!important}' +
  '</style>';
const shortFile = path.join(outDir, 'fill-short-140.html');
fs.writeFileSync(shortFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', shortCss + probe), 'utf8');

/* Leerer Zustand fotografieren: nur laden, nichts fuellen. */
const emptyFile = path.join(outDir, 'empty-shot.html');
fs.writeFileSync(emptyFile, fs.readFileSync(htmlFile, 'utf8'), 'utf8');
const emptyShot = path.join(outDir, 'label-empty.png');
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=2',
  '--blink-settings=mediaType=print', '--virtual-time-budget=6000',
  '--window-size=1400,900', '--screenshot=' + emptyShot,
  'file:///' + emptyFile.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });

for (const [name, file] of [['A4 / 148,5 mm', probeFile], ['kurz / 140 mm', shortFile]]) {
  const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--force-device-scale-factor=2',
    '--blink-settings=mediaType=print', '--virtual-time-budget=9000',
    '--window-size=1400,900', '--screenshot=' + path.join(outDir,
      name.charAt(0) === 'A' ? 'fill-a4.png' : 'fill-140.png'),
    '--dump-dom', 'file:///' + file.replace(/\\/g, '/')],
  { encoding: 'utf8', maxBuffer: 1 << 28 });
  const dm = (res.stdout || '').match(/<pre id="p">([\s\S]*?)<\/pre>/);
  console.log('--- ' + name + ' ---');
  console.log(dm ? dm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    : '(keine Messwerte)');
}




