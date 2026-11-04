/*
 * Build-Hilfsskript (nicht Teil der App): vergleicht die Lage der C-Klammern
 * (Vorschau vs. Druck), wenn nur EIN Feld beschrieben ist.
 *   node .build/one-line-check.js
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

const values = process.env.ONE_LINE
  ? JSON.parse(process.env.ONE_LINE)
  : { fFurnace: 'K-08' };

const probe = `
<pre id="p">-</pre>
<script>
window.__probe = function (text) {
  var p = document.getElementById('p');
  p.textContent = text;
};
window.addEventListener('error', function (e) {
  window.__probe('JS-FEHLER: ' + (e.message || e.type) + ' @ ' + (e.lineno || '?'));
});
/* Debug: berechnet für ein Element, wer es überdeckt (Klick-Test). */
window.__hit = function (node) {
  var b = node.getBoundingClientRect();
  var x = b.left + Math.min(6, b.width / 2);
  var y = b.top + Math.min(3, b.height / 2);
  var hit = document.elementFromPoint(x, y);
  return (hit ? (hit.className || hit.tagName) : 'null') + ' @' + Math.round(x) + ',' + Math.round(y);
};
/* Mess-Hilfe: Element an einem Punkt (liefert 'tag.className'). */
window.__hitPoint = function (x, y) {
  var el = document.elementFromPoint(x, y);
  return el ? ((el.tagName || '?') + '.' + (el.className || '-')) : 'null';
};
function measure() {
  var MM = 25.4 / 96;
  function mm(px) { return Math.round(px * MM * 100) / 100; }
  function r(n) { return n.getBoundingClientRect(); }
  var out = [];
  var L = document.querySelector('.label[data-index="0"]');
  var z = parseFloat(getComputedStyle(document.getElementById('sheet')).getPropertyValue('--zoom'));
  z = z > 0 ? z : 1;
  var lb = r(L);
  var fields = L.querySelector('.label__fields');
  var rec = L.querySelector('.recipient');
  var grp = L.querySelector('.lrow--group');
  var lcs = getComputedStyle(L);
  out.push('Etikett: rect ' + mm(lb.width / z) + ' x ' + mm(lb.height / z) +
    ' | offset ' + mm(L.offsetWidth) + ' x ' + mm(L.offsetHeight) +
    ' | pad ' + lcs.paddingTop + '/' + lcs.paddingLeft);
  var fcs0 = getComputedStyle(fields);
  out.push('fields: top-abstand ' + mm((r(fields).top - lb.top) / z) +
    ' | pad-top ' + fcs0.paddingTop + ' | max-h ' + fcs0.maxHeight +
    ' | room ' + fcs0.getPropertyValue('--fields-room').trim() +
    ' | box-top ' + fcs0.getPropertyValue('--box-top').trim() +
    ' | box-h ' + fcs0.getPropertyValue('--box-h').trim() +
    ' | box-w ' + fcs0.getPropertyValue('--box-w').trim() +
    ' | box-gap ' + fcs0.getPropertyValue('--box-gap').trim() +
    ' | lead ' + fcs0.getPropertyValue('--box-lead').trim());
  out.push('sheet: ' + document.getElementById('sheet').getAttribute('style'));
  out.push('label: ' + L.getAttribute('style'));
  out.push('rootfont: ' + getComputedStyle(document.documentElement).fontSize);
  var e0 = L.querySelector('.lrow--extra');
  out.push('extra: h ' + mm(r(e0).height / z) + ' | flex ' + getComputedStyle(e0).flex +
    ' | display ' + getComputedStyle(e0).display);
  var v0 = e0.querySelector('.lrow__v');
  out.push('extra-v: h ' + mm(r(v0).height / z) + ' | font ' + getComputedStyle(v0).fontSize +
    ' | lh ' + getComputedStyle(v0).lineHeight);
  var k0 = L.querySelector('.lrow__k');
  out.push('k: h ' + mm(r(k0).height / z) + ' | font ' + getComputedStyle(k0).fontSize +
    ' | pad-l ' + getComputedStyle(k0).paddingLeft);
  var vK = L.querySelector('.lrow__v[data-f="furnace"]');
  out.push('raster: ' + (function () {
    var r0 = r(fields.children[0]);
    return 'row1 top-unten ' + Math.round(r0.top) + '-' + Math.round(r0.bottom) +
      ' | before-bogen-y ' + Math.round(r0.top + 0) + ' | hit-oben ' +
      window.__hitPoint(r0.left + 35, r0.top + 0.5) +
      ' | hit-unten ' + window.__hitPoint(r0.left + 35, r0.bottom - 1);
  })());
  out.push('row1: h ' + getComputedStyle(fields.children[0]).height +
    ' | flex ' + getComputedStyle(fields.children[0]).flex +
    ' | rect-h ' + mm(r(fields.children[0]).height / z) +
    ' | k-rect-h ' + mm(r(k0).height / z));
  var vK = L.querySelector('.lrow__v[data-f="furnace"]');
  var cK = L.querySelector('.lrow__v[data-f="catalyst"]');
  var cb = r(cK);
  out.push('cat-v: h ' + mm(cb.height / z) + ' | y ' + mm((cb.top - lb.top) / z) +
    ' | text ' + cK.textContent.length + ' | hit ' + window.__hit(cK));
  out.push('werte: furnace="' + vK.textContent + '" h ' + mm(r(vK).height / z) +
    ' | catalyst len ' + cK.textContent.length);
  out.push('shadow-of-lrow: ' + (function () {
    var els = document.elementsFromPoint(r(vK).left + 4, r(vK).top + 4);
    return els.map(function (e) { return e.className || e.tagName; }).join(' < ');
  })());
  out.push('marker: ' + fcs0.getPropertyValue('--marker-debug').trim() +
    ' | row1-h ' + getComputedStyle(fields.children[0]).height +
    ' | extra-v-h ' + getComputedStyle(fields.querySelector('.lrow--extra .lrow__v')).height);
  var rcs = getComputedStyle(rec);
  out.push('recipient: h ' + mm(r(rec).height / z) + ' | pad ' + rcs.paddingTop +
    ' | font ' + rcs.fontSize + ' | top-abstand ' + mm((r(rec).top - lb.top) / z) +
    ' | max-h ' + rcs.maxHeight);
  var fields = L.querySelector('.label__fields');
  var rec = L.querySelector('.recipient');
  var grp = L.querySelector('.lrow--group');
  out.push('zoom ' + z.toFixed(4) + ' | Etikett h ' + mm(lb.height / z));
  [].slice.call(fields.children).forEach(function (row, i) {
    var b = r(row);
    var pb = getComputedStyle(row, '::before');
    var inner = row.querySelector('.lrow--row') || row;
    var ib = r(inner);
    out.push('Zeile ' + (i + 1) + ' ' + (row.className || 'lrow') +
      ' | h ' + mm(b.height / z) +
      ' | y ' + mm((b.top - lb.top) / z) + '-' + mm((b.bottom - lb.top) / z) +
      ' | Klammer-top ' + mm((ib.top - lb.top) / z - 0.9) +
      ' | style ' + (row.getAttribute('style') || '-'));
  });
  out.push('Gruppe: h ' + mm(r(grp).height / z) +
    ' y ' + mm((r(grp).top - lb.top) / z) + '-' + mm((r(grp).bottom - lb.top) / z) +
    ' | flex ' + getComputedStyle(grp).flex +
    ' | Inline ' + (grp.getAttribute('style') || '-'));
  out.push('fields: --fields-room ' + getComputedStyle(fields).getPropertyValue('--fields-room').trim() +
    ' | --box-top ' + getComputedStyle(fields).getPropertyValue('--box-top').trim() +
    ' | --fields-gap ' + getComputedStyle(fields).getPropertyValue('--fields-gap').trim() +
    ' | --fields-top ' + getComputedStyle(fields).getPropertyValue('--fields-top').trim() +
    ' | scrollH-clientH ' + mm((fields.scrollHeight - fields.clientHeight) / z) +
    ' | h ' + mm(r(fields).height / z));
  out.push('Empfaenger: y ' + mm((r(rec).top - lb.top) / z) + '-' +
    mm((r(rec).bottom - lb.top) / z) + ' | Abstand Gruppenklammer->Empfaenger ' +
    mm((r(rec).top - r(grp).bottom) / z));
  out.push('right: --fields-shift ' + getComputedStyle(L.querySelector('.label__right')).getPropertyValue('--fields-shift').trim() +
    ' | --ghs-top ' + getComputedStyle(L.querySelector('.label__right')).getPropertyValue('--ghs-top').trim() +
    ' | --ghs-maxh ' + (getComputedStyle(L.querySelector('.ghs')).getPropertyValue('--ghs-maxh') || '-').trim());
  out.push('GHS: y ' + mm((r(L.querySelector('.ghs')).top - lb.top) / z) + '-' +
    mm((r(L.querySelector('.ghs')).bottom - lb.top) / z) +
    ' | Signal ' + (L.querySelector('.ghs__signal') ? mm(r(L.querySelector('.ghs__signal')).width / z) + 'mm breit' : '-'));
  document.getElementById('p').textContent = out.join('\\n');
  document.title = 'ready';
}
window.addEventListener('load', function () {
  window.setTimeout(function () {
    ${Object.keys(values).map((k) => `
    (function () {
      var n = document.getElementById('${k}');
      n.value = ${JSON.stringify(values[k])};
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    })();`).join('')}
    window.setTimeout(function () {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { window.setTimeout(measure, 120); });
      } else {
        window.setTimeout(measure, 300);
      }
    }, 200);
  }, 400);
});
</script>
</body>`;

const probeFile = path.join(outDir, 'one-line.html');
fs.writeFileSync(probeFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', probe), 'utf8');

const modes = [
  ['Vorschau', [], 'one-line-screen.png'],
  ['Druck', ['--blink-settings=mediaType=print'], 'one-line-print.png'],
];
for (const [name, extra, shot] of modes) {
  const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--force-device-scale-factor=1', '--virtual-time-budget=8000',
    '--window-size=1400,1000', '--screenshot=' + path.join(outDir, shot),
    '--dump-dom'].concat(extra, ['file:///' + probeFile.replace(/\\/g, '/')]),
  { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = (res.stdout || '').match(/<pre id="p">([\s\S]*?)<\/pre>/);
  console.log('--- ' + name + ' ---');
  console.log(m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    : '(keine Messwerte)');
}
