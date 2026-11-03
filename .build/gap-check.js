/*
 * Build-Hilfsskript (nicht Teil der App): prüft die Klammer-Geometrie.
 *  - genau EINE C-Klammer um „ex Produktion“ + die drei Zusatzzeilen
 *  - Luft in y zwischen den Klammerbögen (kein Überlappen)
 *  - Block steht ein Stück unter der Randkante, nicht mittig zentriert
 *  - alles innerhalb des Etiketts (kein Überlaufen, nichts abgeschnitten)
 *   node .build/gap-check.js
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
(function () {
  var MM = 25.4 / 96;
  function mm(px) { return Math.round(px * MM * 100) / 100; }
  function r(n) { return n.getBoundingClientRect(); }
  var out = [];
  var L = document.querySelector('.label[data-index="0"]');
  var sheet = document.getElementById('sheet');
  var z0 = parseFloat(getComputedStyle(sheet).getPropertyValue('--zoom'));
  z0 = z0 > 0 ? z0 : 1;
  var lb = r(L);
  var fields = L.querySelector('.label__fields');
  var rec = L.querySelector('.recipient');
  var rows = [].slice.call(fields.children).filter(function (n) {
    return n.classList.contains('lrow') || n.classList.contains('lrow--group');
  });
  /* Sichtbare Klammerflaeche je Zeile: bei .lrow ragt sie 0,9 mm ueber die
     Zeile hinaus, bei der Gruppe ist es die Gruppenbox selbst. */
  var boxes = rows.map(function (row, i) {
    var b = r(row);
    var over = row.classList.contains('lrow--group') ? 0 : 0.9;
    return { i: i + 1, top: b.top - lb.top, bottom: b.bottom - lb.top, overlap: over };
  });
  var gaps = [];
  for (var k = 1; k < boxes.length; k += 1) {
    gaps.push(boxes[k - 1].i + '->' + boxes[k].i + ' ' + mm(
      boxes[k].top - boxes[k - 1].bottom + boxes[k - 1].overlap + boxes[k].overlap) + 'mm');
  }
  out.push('Klammerboegen-Luft: ' + gaps.join(', '));
  var grp = L.querySelector('.lrow--group');
  out.push('Gruppenklammer: h ' + mm(r(grp).height) + 'mm | eigene Klammer ' +
    (parseFloat(getComputedStyle(grp, '::before').borderLeftWidth) > 0 ? 'ja' : 'nein') +
    ' | Innenzeilen mit Klammer ' +
    [].slice.call(grp.querySelectorAll('*')).filter(function (n) {
      return parseFloat(getComputedStyle(n, '::before').borderLeftWidth) > 0;
    }).length);
  /* x-Ausrichtung: die linken Raender von Beschriftung und Wert muessen auf
     einer Linie mit den uebrigen Feldern liegen (die Gruppenklammer ist
     genauso breit wie die der Einzelfelder). */
  var xs = [].slice.call(fields.querySelectorAll('.lrow, .lrow--row')).map(function (row) {
    return r(row).left - lb.left;
  });
  var lefts = [].slice.call(fields.querySelectorAll('.lrow__k')).map(function (n) {
    return r(n).left - lb.left;
  });
  /* Zusatzzeilen: ohne Inhalt ist der Wert so breit wie sein Inhalt (0 px),
     gemessen wird dann die Textkante des Zeilenkastens (Kastenrand + Führung
     bis zum Textbeginn). */
  var LEAD = getComputedStyle(fields.querySelector('.lrow')).getPropertyValue('--bracket-lead').trim();
  LEAD = LEAD ? parseFloat(LEAD) * (96 / 25.4) : 18.9;
  [].slice.call(fields.querySelectorAll('.lrow--extra > .lrow__v')).forEach(function (v) {
    var p = v.parentElement;
    var b = r(v);
    lefts.push(b.width > 2
      ? b.left - lb.left
      : r(p).left - lb.left + LEAD);
  });
  out.push('x-Buendigkeit: Zeilen links ' + xs.map(mm).join(', ') + 'mm | Textkanten ' +
    lefts.map(mm).join(', ') + 'mm | Streuung ' +
    mm(Math.max.apply(null, lefts) - Math.min.apply(null, lefts)) + 'mm');
  out.push('Gruppenkinder: ' + [].slice.call(fields.querySelectorAll('.lrow--group *')).map(function (n) {
    var b = r(n);
    var cs = getComputedStyle(n);
    return (n.className || '(kein class)') + '@' + mm(b.left - lb.left) + ' w' + mm(b.width) +
      ' pl' + mm(parseFloat(cs.paddingLeft)) + ' d' + cs.display;
  }).join(' | '));
  var first = boxes[0];
  var last = boxes[boxes.length - 1];
  out.push('Etikett: h ' + mm(lb.height) + 'mm | 1. Klammerbogen ' +
    mm(first.top - first.overlap) + 'mm | letzte Klammerunterkante ' +
    mm(last.bottom + last.overlap) + 'mm | Blockmitte ' +
    mm((first.top + last.bottom) / 2) + 'mm (Etikettenmitte ' + mm(lb.height / 2) + 'mm)');
  out.push('Feldspalte: h ' + mm(r(fields).height) + 'mm | --fields-top ' +
    getComputedStyle(fields).getPropertyValue('--fields-top').trim() +
    ' | --fields-gap ' + getComputedStyle(fields).getPropertyValue('--fields-gap').trim() +
    ' | scrollH-clientH ' + mm(fields.scrollHeight - fields.clientHeight) + 'mm' +
    ' | Empfaenger unten ' + mm(r(rec).bottom - lb.top) + 'mm');
  document.getElementById('p').textContent = out.join('\\n');
})();
</script>
</body>`;

const probeFile = path.join(outDir, 'gap-probe.html');
fs.writeFileSync(probeFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', probe), 'utf8');

const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=1', '--virtual-time-budget=5000',
  '--window-size=1400,1000', '--dump-dom', 'file:///' + probeFile.replace(/\\/g, '/')],
{ encoding: 'utf8', maxBuffer: 1 << 28 });

const dom = res.stdout || '';
const m = dom.match(/<pre id="p">([\s\S]*?)<\/pre>/);
const out = m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '(keine Messwerte)';
console.log(out);

const g = (out.match(/Klammerboegen-Luft: (.*)/) || [])[1] || '';
const gapsMm = (g.match(/([\d.]+)mm/g) || []).map((s) => parseFloat(s));
const groupLine = (out.match(/Gruppenklammer: ([^\n]*)/) || [])[1] || '';
const posLine = (out.match(/Etikett: ([^\n]*)/) || [])[1] || '';
const firstTop = parseFloat((posLine.match(/1\. Klammerbogen ([\d.-]+)mm/) || [])[1]);
const blockMid = parseFloat((posLine.match(/Blockmitte ([\d.-]+)mm/) || [])[1]);
const labelH = parseFloat((posLine.match(/h ([\d.]+)mm/) || [])[1]);
const colLine = (out.match(/Feldspalte: ([^\n]*)/) || [])[1] || '';
const rest = parseFloat((colLine.match(/scrollH-clientH ([\d.-]+)mm/) || [])[1]);
const recBottom = parseFloat((colLine.match(/Empfaenger unten ([\d.]+)mm/) || [])[1]);
/* Streuung der linken Textkanten („ex Produktion“ vs. die übrigen Felder) */
const colSpread = parseFloat((out.match(/Streuung ([\d.]+)mm/) || [])[1]);
const checks = [
  ['Feldspalte bündig in x (alle Textkanten auf einer Linie)', colSpread <= 0.3],
  ['mindestens 1 mm Luft zwischen allen Klammerbögen',
    gapsMm.length >= 3 && gapsMm.every((v) => v >= 1)],
  ['genau eine Klammer an der Gruppe, Innenzeilen ohne',
    /eigene Klammer ja \| Innenzeilen mit Klammer 0/.test(groupLine)],
  ['oberste Klammer unter der 5-mm-Randkante (>= 6 mm)', firstTop >= 6],
  ['Block nicht mittig, sondern oben mit Abstand (Blockmitte < Etikettenmitte)',
    blockMid < labelH / 2],
  ['Feldspalte ohne Überlauf (nichts abgeschnitten)', rest <= 0.15],
  ['Empfängerbox endet innerhalb des Etiketts', recBottom <= labelH - 4]
];
let ok = true;
for (const [label, pass] of checks) {
  console.log((pass ? 'OK  ' : 'FAIL') + '  ' + label);
  ok = ok && pass;
}
console.log('\n' + (ok ? 'ALLE LAYOUT-PRÜFUNGEN OK' : 'PRÜFUNG FEHLGESCHLAGEN'));
process.exit(ok ? 0 : 1);
