/*
 * Build-Hilfsskript (nicht Teil der App):
 *   node .build/extra-rows-check.js
 * Prüft
 *  - die drei Zusatzzeilen (data-f="extra1..3") im Etikett,
 *  - dass am Bildschirm nur EIN Etikett sichtbar ist (index 1 -> display:none),
 *  - dass im Druck BEIDE Etiketten auf einer A4-Seite stehen,
 *  - dass die Feldspalte mit den Zusatzzeilen im Etikett bleibt,
 *  - dass kein Signalwort-Panel mehr im Formular steht,
 *  - dass weder Platzhalter „Zeile n“ noch Unterstreichung an den
 *    Zusatzzeilen hängen und links die C-förmige Klammer sitzt.
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
  /* Erst nach zwei Frames messen: die App richtet die Felder in
     alignFieldsTop() aus, das Layout steht erst im Folgeframe fest. Faengt
     ein Schritt einen Fehler, wird er ausgegeben statt still zu scheitern. */
  setTimeout(function () {
    setTimeout(function () {
      try { run(); } catch (e) { log.push('FEHLER: ' + e.message); paint(); }
    }, 250);
  }, 250);
  function run() {
  var right = l0.querySelector('.label__right');
  var fields = l0.querySelector('.label__fields');
  var rec = l0.querySelector('.recipient');
  var rs = fs(right), rcs = fs(rec);
  var ffs = fs(fields);
  var gap = parseFloat(ffs.rowGap) || 0;              /* row-gap des Etikettenrasters */
  /* Die Feldspalte laeuft im Koordinatensystem des Vorschau-Zooms
     (transform: scale(--zoom)): clientHeight/offsetHeight sind dort noch
     NICHT skaliert, die Sicht-Masse (getBoundingClientRect) schon. Deshalb
     wird die Innenhoehe aus der Sicht-Hoehe geteilt durch den Zoom geholt. */
  var zf = parseFloat(sc());
  zf = zf > 0 ? zf : 1;
  var MM_PER_PX = 25.4 / 96;
  var avail = r(right).height / zf;
  var fieldsH = fields.offsetHeight;
  var recH = rec.offsetHeight;
  var used = fieldsH + gap + recH;
  log.push('label0=' + fs(l0).display + ' label1=' + fs(l1).display);
  log.push('zoom=' + (sc() || '(nicht gesetzt)') + '  (Skalierung der Live-Vorschau)');
  log.push('sumWord=' + (document.getElementById('sumWord') ? 'vorhanden' : 'entfernt'));
  log.push('extra1=' + document.querySelectorAll('.label__fields [data-f="extra1"]').length +
    ' extra2=' + document.querySelectorAll('.label__fields [data-f="extra2"]').length +
    ' extra3=' + document.querySelectorAll('.label__fields [data-f="extra3"]').length);
  log.push('Innenhoehe=' + mmPx(avail) + ' | Felder=' +
    mmPx(fieldsH) + ' | row-gap=' + mmPx(gap) + ' | Empfaenger=' +
    mmPx(recH) + ' | benoetigt=' + mmPx(used) + ' | Reserve=' +
    mmPx(avail - used));
  /* Kein Ueberlauf: die Feldspalte selbst darf nicht ueber ihre Innenhoehe
     hinauswachsen (scrollHeight > clientHeight). Hinweis: avail/used oben
     sind nur eine grobe Kontrollrechnung, weil das Etikettenraster
     (grid-template-rows minmax(0,1fr) auto) Empfaenger und Feldspalte
     gemeinsam verteilt. */
  log.push('spaltenueberlauf=' + ((fields.scrollHeight - fields.clientHeight) > 1 ? 'ja' : 'nein') +
    ' | gruppenklammer=' + (l0.querySelector('.lrow--group')
      ? mmPx(l0.querySelector('.lrow--group').getBoundingClientRect().height / zf) : '-'));
  Array.prototype.forEach.call(l0.querySelectorAll('.label__fields > .lrow, .label__fields > .lrow--group, .lrow--group > .lrow, .lrow--group > .lrow--extra'), function (row, i) {
    var k = row.querySelector('.lrow__k');
    var v = row.querySelector('.lrow__v');
    var cs = fs(v);
    var after = fs(v, '::after');
    var before = fs(row, '::before');
    /* Klammer in mm; 0 mm = keine eigene Klammer. Normalerweise 0,79 mm
       (0,8 mm) – die Gruppe hat eine gemeinsame Klammer, ihre Zeilen keine. */
    var bracket = ' | Klammer ' + mmv(before.borderLeftWidth) +
      ' Bogen ' + mmv(before.width);
    log.push('Zeile ' + (i + 1) + ': h=' + mmPx(row.offsetHeight) +
      (k ? ' "' + k.textContent.trim() + '"' : ' (ohne Beschriftung)') +
      ' | Wert h=' + mmPx(v.offsetHeight) +
      ' | font ' + mmv(cs.fontSize) + ' pad ' + mmv(cs.paddingTop) +
      ' / ' + mmv(cs.paddingBottom) + ' border ' + mmv(cs.borderBottomWidth) +
      ' | Inhalt=' + (v.textContent.trim() === '' ? 'leer' : 'TEXT') +
      ' | ::after=' + (after ? JSON.stringify(after.content) : 'keins') + bracket);
  });
  /* Feldüberschriften „Zusatzzeile n“ im Panel ürfen nicht mehr vorkommen */
  log.push('formLabels=' + Array.prototype.map.call(
    document.querySelectorAll('#labelForm .field__label'),
    function (n) { return n.textContent.trim(); }).join(',') +
    ' | extraLabels=' + document.querySelectorAll('#labelForm label[for^="fExtra"]').length);
  paint();
  }
})();
</script>
</body>`;

const source = fs.readFileSync(htmlFile, 'utf8');
/* Die Sonde muss GANZ am Ende des Body stehen: die App klont die Etiketten
   in ihren eigenen Container und blendet je nach Ansicht Etiketten ein/aus.
   Steht die Sonde vorher, sieht sie die Etiketten aus dem bereits
   abgeschlossenen Zustand nicht mehr (label1=none, keine Messwerte). */
const closeBody = source.lastIndexOf('</body>');
fs.writeFileSync(probeFile,
  closeBody === -1 ? source + probe
    : source.slice(0, closeBody) + probe + source.slice(closeBody), 'utf8');


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
  ['Felder passen ins Etikett (kein Überlauf der Feldspalte)',
    /spaltenueberlauf=nein/.test(domProbe)],
  ['Zusatzzeilen sind leer (kein Platzhalter „Zeile n“)',
    /Zeile 5:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"[\s\S]*?Zeile 6:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"[\s\S]*?Zeile 7:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"/.test(out)],
  ['Zusatzzeilen ohne Unterstrich',
    /Zeile 5:[\s\S]*?border 0mm[\s\S]*?Zeile 6:[\s\S]*?border 0mm[\s\S]*?Zeile 7:[\s\S]*?border 0mm/.test(out)],
  ['Gruppenklammer umfasst ex Produktion + 3 Zusatzzeilen (genau eine Klammer)',
    /Zeile 4: h=[\d.]+mm "ex Produktion"[\s\S]*?Klammer 0.79mm Bogen 25mm[\s\S]*?Zeile 5:[\s\S]*?Klammer 0mm[\s\S]*?Zeile 6:[\s\S]*?Klammer 0mm[\s\S]*?Zeile 7:[\s\S]*?Klammer 0mm/.test(out)],
  ['Panel: keine Feldüberschrift „Zusatzzeile n“', /extraLabels=0/.test(out)]
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
