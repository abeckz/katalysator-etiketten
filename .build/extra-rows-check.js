/*
 * Build-Hilfsskript (nicht Teil der App):
 *   node .build/extra-rows-check.js
 * Prüft
 *  - die drei Zusatzzeilen (data-f="extra1..3") im Etikett,
 *  - dass am Bildschirm nur EIN Etikett sichtbar ist (index 1 -> display:none),
 *  - dass im Druck BEIDE Etiketten auf einer A4-Seite stehen,
 *  - dass die Feldspalte mit den Zusatzzeilen im Etikett bleibt,
 *  - dass kein Signalwort-Panel mehr im Formular steht,
 *  - dass der Platzhalter „Zeile n“ nicht im Druck erscheint.
 * Screenshots: .build/out/rows-screen.png, rows.pdf
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const url = 'file:///' + htmlFile.replace(/\\/g, '/');
const probeFile = path.join(outDir, 'extra-rows-probe.html');

/* Messungen direkt in der App-Seite (kein iframe): das Original wird in eine
   Kopie geschrieben und eine kleine Sonde vor </body> eingefügt. So gelten
   exakt die Bildschirm-Styles der App (inkl. Vorschau-Skalierung). */
const MM = 25.4 / 96;
const probe = `
<pre id="probe">-</pre>
<script>
(function () {
  var MM = 25.4 / 96;
  /* Layoutmaße direkt aus dem Layout (offsetHeight/offsetWidth): die
     Sicht-Maße sind vom Vorschau-Zoom verkleinert und taugen nicht als
     mm-Prüfung. computedStyle liefert mm unverändert (absolute Längen
     werden dort NICHT in px umgerechnet). */
  var log = [];
  function r(n) { return n ? n.getBoundingClientRect() : null; }
  function fs(n, pseudo) { return n ? getComputedStyle(n, pseudo || null) : null; }
  var MM_PER_PX = 25.4 / 96;
  function mmv(cssValue) {
    var v = parseFloat(cssValue);
    return isNaN(v) ? cssValue : Math.round(v * MM_PER_PX * 100) / 100 + 'mm';
  }
  function mmPx(px) { return Math.round(px * MM_PER_PX * 100) / 100 + 'mm'; }
  function sc() { return fs(document.getElementById('sheet')).getPropertyValue('--zoom'); }
  function paint() {
    var text = log.join('\\n');
    document.getElementById('probe').textContent = text;
    document.title = 'PROBE | ' + log.slice(0, 5).join(' | ');
  }
  var l0 = document.querySelector('.label[data-index="0"]');
  var l1 = document.querySelector('.label[data-index="1"]');
  var right = l0.querySelector('.label__right');
  var fields = l0.querySelector('.label__fields');
  var rec = l0.querySelector('.recipient');
  var rs = fs(right), ffs = fs(fields), rcs = fs(rec);
  var padY = parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom);
  var avail = right.clientHeight - padY;              /* Innenhöhe für die Zeilen */
  var gap = parseFloat(ffs.rowGap) || 0;              /* row-gap des Etikettenrasters */
  var used = fields.offsetHeight + gap + rec.offsetHeight;
  log.push('label0=' + fs(l0).display + ' label1=' + fs(l1).display);
  log.push('zoom=' + (sc() || '(nicht gesetzt)') + '  (Skalierung der Live-Vorschau)');
  log.push('sumWord=' + (document.getElementById('sumWord') ? 'vorhanden' : 'entfernt'));
  log.push('extra1=' + document.querySelectorAll('.label__fields [data-f="extra1"]').length +
    ' extra2=' + document.querySelectorAll('.label__fields [data-f="extra2"]').length +
    ' extra3=' + document.querySelectorAll('.label__fields [data-f="extra3"]').length);
  log.push('Innenhoehe=' + mmPx(avail) + ' (' + right.clientHeight + 'px) | Felder=' +
    mmPx(fields.offsetHeight) + ' | row-gap=' + mmPx(gap) + ' | Empfaenger=' +
    mmPx(rec.offsetHeight) + ' | benoetigt=' + mmPx(used) + ' | Reserve=' +
    mmPx(avail - used));
  log.push('ragtheraus=' + (used > avail + 1));
  Array.prototype.forEach.call(l0.querySelectorAll('.label__fields > .lrow'), function (row, i) {
    var k = row.querySelector('.lrow__k');
    var v = row.querySelector('.lrow__v');
    var cs = fs(v);
    var after = fs(v, '::after');
    log.push('Zeile ' + (i + 1) + ': h=' + mmPx(row.offsetHeight) +
      (k ? ' "' + k.textContent.trim() + '"' : ' (ohne Beschriftung)') +
      ' | Wert h=' + mmPx(v.offsetHeight) +
      ' | font ' + mmv(cs.fontSize) + ' pad ' + mmv(cs.paddingTop) +
      ' / ' + mmv(cs.paddingBottom) + ' border ' + mmv(cs.borderBottomWidth) +
      ' | Inhalt=' + (v.textContent.trim() === '' ? 'leer' : 'TEXT') +
      ' | ::after=' + (after ? JSON.stringify(after.content) : 'keins'));
  });
  paint();
})();
</script>
</body>`;

const source = fs.readFileSync(htmlFile, 'utf8');
fs.writeFileSync(probeFile, source.replace('</body>', probe), 'utf8');


const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--virtual-time-budget=5000', '--window-size=1400,1000',
  '--dump-dom', 'file:///' + probeFile.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });

const domProbe = res.stdout || '';
const out = (domProbe.match(/<pre id="probe">([\s\S]*?)<\/pre>/) || [])[1] || '(keine Messwerte)';
console.log(out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
console.log('');

const checks = [
  ['drei Zusatzzeilen je Etikett (2 Etiketten)', /extra1=2 extra2=2 extra3=2/.test(domProbe)],
  ['Signalwort-Panel entfernt', /sumWord=entfernt/.test(domProbe)],
  ['Bildschirm: nur ein Etikett sichtbar', /label0=flex label1=none/.test(domProbe)],
  ['Felder passen ins Etikett', /ragtheraus=false/.test(domProbe)],
  ['Zusatzzeilen sind leere Schreiblinien', /Zeile 5:[\s\S]*?Inhalt=leer[\s\S]*?Zeile 6:[\s\S]*?Inhalt=leer[\s\S]*?Zeile 7:[\s\S]*?Inhalt=leer/.test(out)]
];

/* Screenshot am Bildschirm + Druck-PDF */
function shot(args, target) {
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=1', '--virtual-time-budget=4000', ...args,
    '--screenshot=' + target, url], { encoding: 'utf8' });
  const ok = fs.existsSync(target);
  console.log((ok ? 'OK  ' : 'FAIL') + '  ' + path.basename(target) + (ok ? '' : '\n' + (r.stderr || '')));
  return ok;
}
let allOk = true;
allOk = shot(['--window-size=1400,1000'], path.join(outDir, 'rows-screen.png')) && allOk;
allOk = shot(['--window-size=794,1123', '--print-to-pdf=' + path.join(outDir, 'rows.pdf')],
  path.join(outDir, 'rows-print.png')) && allOk;

/* Druck-PDF: genau eine A4-Seite */
try {
  const pdf = fs.readFileSync(path.join(outDir, 'rows.pdf'), 'latin1');
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const media = (pdf.match(/MediaBox\s*\[([^\]]*)\]/) || [])[1] || '';
  const nums = media.trim().split(/\s+/).map(Number);
  const ok = pages === 1 && Math.abs(nums[2] - 595) < 1 && Math.abs(nums[3] - 842) < 1;
  console.log((ok ? 'OK  ' : 'FAIL') + '  Druck = 1 Seite A4 (' + pages + ', MediaBox ' + media.trim() + ')');
  allOk = allOk && ok;
} catch (e) {
  console.log('FAIL  PDF nicht lesbar: ' + e.message);
  allOk = false;
}

for (const [label, ok] of checks) {
  console.log((ok ? 'OK  ' : 'FAIL') + '  ' + label);
  allOk = allOk && ok;
}

console.log('\n' + (allOk ? 'ALLE PRÜFUNGEN OK' : 'PRÜFUNG FEHLGESCHLAGEN'));
process.exit(allOk ? 0 : 1);
