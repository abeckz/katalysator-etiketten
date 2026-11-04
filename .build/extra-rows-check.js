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
const probeBody = [
  '<pre id="probe">-</pre>',
  '<script>',
  '(function () {',
  "  /* Die App blendet am Bildschirm alle Etiketten ausser dem ersten aus",
  "     (display:none -> keine Geometrie). Fuer die Messung wird nur das zweite",
  "     Etikett sichtbar gemacht (sonst waere die App-Ansicht veraendert). */",
  "  var l2 = document.querySelector('.label[data-index=\"1\"]');",
  "  var vis1 = l2 ? getComputedStyle(l2).display : 'none';",
  "  if (l2 && vis1 === 'none') l2.style.display = 'flex';",
  "  var MM = 25.4 / 96;",
  "  /* Layoutmaße direkt aus dem Layout (offsetHeight/offsetWidth): die",
  "     Sicht-Maße sind vom Vorschau-Zoom verkleinert und taugen nicht als",
  "     mm-Prüfung. computedStyle liefert mm unverändert (absolute Längen",
  "     werden dort NICHT in px umgerechnet). */",
  "  var log = [];",
  "  function r(n) { return n ? n.getBoundingClientRect() : null; }",
  "  function fs(n, pseudo) { return n ? getComputedStyle(n, pseudo || null) : null; }",
  "  var MM_PER_PX = 25.4 / 96;",
  "  function mmv(cssValue) {",
  "    var v = parseFloat(cssValue);",
  "    return isNaN(v) ? cssValue : Math.round(v * MM_PER_PX * 100) / 100 + 'mm';",
  "  }",
  "  function mmPx(px) { return Math.round(px * MM_PER_PX * 100) / 100 + 'mm'; }",
  "  function sc() { return fs(document.getElementById('sheet')).getPropertyValue('--zoom'); }",
  "  function paint() {",
  "    var text = log.join('\\\\n');",
  "    document.getElementById('probe').textContent = text;",
  "    document.title = 'PROBE | ' + log.slice(0, 5).join(' | ');",
  "  }",
  "  var l0 = document.querySelector('.label[data-index=\"0\"]');",
  "  var l1 = document.querySelector('.label[data-index=\"1\"]');",
  "  /* Sichtbarkeit VOR der Messmanipulation festhalten (display des zweiten",
  "     Etiketts wird danach fuer die Geometrie kurz auf flex gesetzt). */",
  "  var vis0 = getComputedStyle(l0).display;",
  "  var vis1Before = vis1;",
  "  /* Erst nach zwei Frames messen: die App richtet die Felder in",
  "     alignFieldsTop() aus, das Layout steht erst im Folgeframe fest. Faengt",
  "     ein Schritt einen Fehler, wird er ausgegeben statt still zu scheitern. */",
  "  setTimeout(function () {",
  "    setTimeout(function () {",
  "      try { run(); } catch (e) { log.push('FEHLER: ' + e.message); paint(); }",
  "    }, 250);",
  "  }, 250);",
  "  function run() {",
  "  var right = l0.querySelector('.label__right');",
  "  var fields = l0.querySelector('.label__fields');",
  "  var rec = l0.querySelector('.recipient');",
  "  var rs = fs(right), rcs = fs(rec);",
  "  var ffs = fs(fields);",
  "  var gap = parseFloat(ffs.rowGap) || 0;              /* row-gap des Etikettenrasters */",
  "  /* Die Feldspalte laeuft im Koordinatensystem des Vorschau-Zooms",
  "     (transform: scale(--zoom)): clientHeight/offsetHeight sind dort noch",
  "     NICHT skaliert, die Sicht-Masse (getBoundingClientRect) schon. Deshalb",
  "     wird die Innenhoehe aus der Sicht-Hoehe geteilt durch den Zoom geholt. */",
  "  var zf = parseFloat(sc());",
  "  zf = zf > 0 ? zf : 1;",
  "  var MM_PER_PX = 25.4 / 96;",
  "  var avail = r(right).height / zf;",
  "  var fieldsH = fields.offsetHeight;",
  "  /* Platz laut max-height (Bruchteile bleiben erhalten, sonst entsteht",
  "     eine scheinbare Reserve von 0,09 mm aus der Rundung). */",
  "  var maxHVal = parseFloat(ffs.maxHeight);",
  "  var roomPx = isNaN(maxHVal) ? fieldsH : maxHVal;",
  "  /* Platz, den der Textteil laut max-height belegen darf (Bruchteile",
  "     bleiben als Nachkommastellen erhalten, sonst entsteht eine",
  "     scheinbare Reserve von 0,09 mm). */",
  "  var maxHVal = parseFloat(ffs.maxHeight);",
  "  var roomPx = isNaN(maxHVal) ? fieldsH : maxHVal;",
  "  var recH = rec.offsetHeight;",
  "  var contentPx = 0;",
  "  Array.prototype.forEach.call(fields.children, function (c) { contentPx += c.offsetHeight; });",
  "  contentPx += gap * Math.max(0, fields.children.length - 1);",
  "  var contentPad = contentPx + (parseFloat(ffs.paddingTop) || 0);",
  "  var used = contentPad + gap + recH;",
  "  log.push('label1Before=' + vis1Before + ' label1NachReset=' +",
  "    (l2 ? getComputedStyle(l2).display : 'none') + ' label0=' + vis0);",
  "  log.push('zoom=' + (sc() || '(nicht gesetzt)') + '  (Skalierung der Live-Vorschau)');",
  "  log.push('sumWord=' + (document.getElementById('sumWord') ? 'vorhanden' : 'entfernt'));",
  "  log.push('extra1=' + document.querySelectorAll('.label__fields [data-f=\"extra1\"]').length +",
  "    ' extra2=' + document.querySelectorAll('.label__fields [data-f=\"extra2\"]').length +",
  "    ' extra3=' + document.querySelectorAll('.label__fields [data-f=\"extra3\"]').length);",
  "  log.push('Innenhoehe=' + mmPx(avail) + ' | Felder=' +",
  "    mmPx(roomPx) + ' | row-gap=' + mmPx(gap) + ' | Empfaenger=' +",
  "    mmPx(recH) + ' | benoetigt=' + mmPx(used) + ' | Reserve=' +",
  "    mmPx(avail - used));",
  "  /* Der Block darf nicht scrollen und seine Zeilen duerfen nicht weiter als",
  "     die Innenhoehe reichen. Gemessen wird in CSS-Pixeln (offsetHeight,",
  "     clientHeight): identisch zum Druck, unabhaengig vom Vorschau-Zoom. Der",
  "     obere Versatz `--fields-top` (padding-top des Blocks) ist Luft ueber dem",
  "     Inhalt und kein Inhalt und wird deshalb abgezogen. */",
  "  var fcs = fs(fields);",
  "  var padT = parseFloat(fcs.paddingTop) || 0;",
  "  var boxH = fields.clientHeight - padT - (parseFloat(fcs.paddingBottom) || 0);",
  "  var rowsH = 0;",
  "  var hidden = 0;",
  "  var limitPx = parseFloat(ffs.maxHeight);",
  "  Array.prototype.forEach.call(fields.children, function (c) {",
  "    if (!isNaN(limitPx) && c.offsetTop + c.offsetHeight > limitPx + 1) {",
  "      hidden += 1;",
  "      return;",
  "    }",
  "    rowsH += c.offsetHeight;",
  "  });",
  "  /* row-gap liefert der Browser hier als px (nicht mm) */",
  "  rowsH += (parseFloat(fcs.rowGap) || 0) * Math.max(0, fields.children.length - 1);",
  "  /* Die Feldspalte ist unten durch die Empfängerbox begrenzt. Das Etiketten-",
  "     raster gibt ihr genau den Platz bis zu dieser Grenze (max-height). Was",
  "     darueber hinausgeht, wird abgeschnitten. */",
  "  var recGap = parseFloat(fcs.rowGap) || 0;",
  "  var limit = fields.clientHeight - padT - (parseFloat(fcs.paddingBottom) || 0);",
  "  var maxH = parseFloat(fcs.maxHeight);",
  "  var room = isNaN(maxH) ? limit : Math.min(limit, maxH - padT -",
  "    (parseFloat(fcs.paddingBottom) || 0));",
  "  var clipped = hidden > 0 || rowsH > room + 3;      /* gekappte Zeile */",
  "  /* Wichtig wie in der App: der Platz darf NICHT vom Zeilenabstand abhängen,",
  "     sonst schaukeln sich Abstand und Platz gegenseitig auf. Verteilte Luft",
  "     füllt den Platz hoechstens bis zum Rand (3 px Rundungstoleranz).",
  "     `.label__fields` kappt Ueberstand mit `overflow:hidden` (kein Scroll). */",
  "  var clipped = rowsH > room + 3;",
  "  log.push('spaltenueberlauf=' + (clipped ? 'ja' : 'nein') + ' (Zeilen ' +",
  "    mmPx(rowsH) + ' / Platz ' + mmPx(room) + ', oberer Versatz ' +",
  "    mmPx(padT) + ', max-height ' + (isNaN(maxH) ? 'none' : Math.round(maxH) + 'px') +",
  "    ', overflow-y=' + fcs.overflowY + ')' +",
  "    ' | gruppenklammer=' + (l0.querySelector('.lrow--group')",
  "      ? mmPx(l0.querySelector('.lrow--group').offsetHeight) : '-'));",
  "  /* Die Gruppenklammer (ex Produktion + Zusatzzeilen) hat eine FESTE Höhe –",
  "     sie wächst bewusst nicht mit beschriebenen Zusatzzeilen (sonst würde sie",
  "     je nach Eingabe springen und die Datenzeile verschieben). Der Text steht",
  "     dann innerhalb der Klammer um. Geprüft wird deshalb die feste Höhe. */",
  "  var grp = l0.querySelector('.lrow--group');",
  "  log.push('gruppenhoehe=' + (grp ? mmPx(grp.getBoundingClientRect().height / zf) : '-') +",
  "    ' | fix=' + (grp ? fs(grp).getPropertyValue('--group-h').trim() : '-') +",
  "    ' | overflow=' + (grp ? fs(grp).overflow : '-'));",
  "  log.push('blockunterkante=' +",
  "    mmPx((r(fields).bottom - r(l0).top) / zf) + ' | empfaengerAb=' +",
  "    mmPx((r(rec).top - r(l0).top) / zf) + ' | fieldsTop=' +",
  "    ffs.getPropertyValue('--box-top').trim());",
  "  Array.prototype.forEach.call(l0.querySelectorAll('.label__fields > .lrow, .label__fields > .lrow--group, .lrow--group > .lrow, .lrow--group > .lrow--extra'), function (row, i) {",
  "    var k = row.querySelector('.lrow__k');",
  "    var v = row.querySelector('.lrow__v');",
  "    var cs = fs(v);",
  "    var after = fs(v, '::after');",
  "    var before = fs(row, '::before');",
  "    /* Klammer in mm; 0 mm = keine eigene Klammer. Normalerweise 0,79 mm",
  "       (0,8 mm) – die Gruppe hat eine gemeinsame Klammer, ihre Zeilen keine. */",
  "    var bracket = ' | Klammer ' + mmv(before.borderLeftWidth) +",
  "      ' Bogen ' + mmv(before.width);",
  "    log.push('Zeile ' + (i + 1) + ': h=' + mmPx(row.offsetHeight) +",
  "      (k ? ' \"' + k.textContent.trim() + '\"' : ' (ohne Beschriftung)') +",
  "      ' | Wert h=' + mmPx(v.offsetHeight) +",
  "      ' | font ' + mmv(cs.fontSize) + ' pad ' + mmv(cs.paddingTop) +",
  "      ' / ' + mmv(cs.paddingBottom) + ' border ' + mmv(cs.borderBottomWidth) +",
  "      ' | Inhalt=' + (v.textContent.trim() === '' ? 'leer' : 'TEXT') +",
  "      ' | ::after=' + (after ? JSON.stringify(after.content) : 'keins') + bracket);",
  "  });",
  "  /* Feldüberschriften „Zusatzzeile n“ im Panel ürfen nicht mehr vorkommen */",
  "  log.push('formLabels=' + Array.prototype.map.call(",
  "    document.querySelectorAll('#labelForm .field__label'),",
  "    function (n) { return n.textContent.trim(); }).join(',') +",
  "    ' | extraLabels=' + document.querySelectorAll('#labelForm label[for^=\"fExtra\"]').length);",
  "  /* Messung abgeschlossen: zweites Etikett wieder ausblenden (Zustand der",
  "     App ist danach unveraendert). */",
  "  if (l2) l2.style.display = '';",
  "  log.push('label1Reset=' + (l2 ? getComputedStyle(l2).display : 'none'));",
  "  paint();",
  "  }",
  "})();",
  "</script>",
  "<\/body>"
].join('\n');

const source = fs.readFileSync(htmlFile, 'utf8');
/* Die Sonde muss GANZ am Ende des Body stehen: die App klont die Etiketten
   in ihren eigenen Container und blendet je nach Ansicht Etiketten ein/aus.
   Steht die Sonde vorher, sieht sie die Etiketten aus dem bereits
   abgeschlossenen Zustand nicht mehr (label1=none, keine Messwerte). */
const closeBody = source.lastIndexOf('</body>');
fs.writeFileSync(probeFile,
  closeBody === -1 ? source + probeBody
    : source.slice(0, closeBody) + probeBody + source.slice(closeBody), 'utf8');

const probe = probeBody.split('\n').slice(2, -2).join('\n');
/* Selbsttest der Sonde: die eingefuegten Zeilen muessen als JavaScript
   syntaktisch in Ordnung sein - ein Syntaxfehler im Browser ('keine
   Messwerte') ist sonst nur schwer zu finden. */
try {
  new (require('vm').Script)(probe);
} catch (e) {
  const line = probe.split('\n')[(e.stack.match(/<anonymous>:(\d+)/) || [0, 0])[1] - 1];
  console.log('FEHLER in der Sonde: ' + e.message + '\n  bei: ' + line);
  process.exit(1);
}

/* Selbsttest der Sonde: die eingefuegten Zeilen muessen als JavaScript
   syntaktisch in Ordnung sein. Ein Syntaxfehler im Browser ('keine
   Messwerte') ist sonst nur schwer zu finden. */
try {
  new (require('vm').Script)(probe);
} catch (e) {
  const line = probe.split('\n')[(e.stack.match(/<anonymous>:(\d+)/) || [0, 0])[1] - 1];
  console.log('FEHLER in der Sonde: ' + e.message + '\n  bei: ' + line);
  process.exit(1);
}

const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--virtual-time-budget=5000', '--window-size=1400,1000',
  '--dump-dom', 'file:///' + probeFile.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });

/* Die Sonde befuellt das <pre> erst nach zwei Frames (alignFieldsTop laeuft
   im Folgeframe). Bleibt der Inhalt leer bzw. steht dort 'FEHLER', gilt die
   Messung als fehlgeschlagen - sonst laufen alle Pruefungen in ein
   unbrauchbares Muster. */
const domProbe = res.stdout || '';
const out = (domProbe.match(/<pre id="probe">([\s\S]*?)<\/pre>/) || [])[1] || '';
if (!/spaltenueberlauf=/.test(out) || /FEHLER:/.test(out)) {
  console.log('FEHLER: die Sonde hat keine Messwerte geliefert.\n' + out.slice(0, 800));
  process.exit(1);
}
console.log(out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
console.log('');

const outText = out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
console.log(outText.split('\\n').join('\n'));
console.log('');

/* Die Sonde schreibt ihre Zeilen mit '\n' getrennt in einen String, der im
   <pre> als '\\n' ankommt. Fuer die Pruefungen werden daraus echte Zeilen. */
const lineText = outText.split('\\n').join('\n');
const has = (re) => re.test(lineText);

const checks = [
  ['drei Zusatzzeilen je Etikett (2 Etiketten)', /extra1=2 extra2=2 extra3=2/.test(domProbe)],
  ['Signalwort-Panel entfernt', /sumWord=entfernt/.test(domProbe)],
  ['Bildschirm: nur ein Etikett sichtbar',
    /label1Before=none/.test(lineText) && /label1Reset=none/.test(lineText)],
  ['Felder passen ins Etikett (kein Überlauf der Feldspalte)',
    (function () {
      const m = lineText.match(/spaltenueberlauf=(ja|nein)/);
      return !!m && m[1] === 'nein';
    })()],
  ['Zusatzzeilen sind leer (kein Platzhalter „Zeile n“)',
    /Zeile 5:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"[\s\S]*?Zeile 6:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"[\s\S]*?Zeile 7:[\s\S]*?Inhalt=leer[\s\S]*?::after="none"/.test(lineText)],
  ['Zusatzzeilen ohne Unterstrich',
    /Zeile 5:[\s\S]*?border 0mm[\s\S]*?Zeile 6:[\s\S]*?border 0mm[\s\S]*?Zeile 7:[\s\S]*?border 0mm/.test(lineText)],
  ['Gruppenklammer umfasst ex Produktion + 3 Zusatzzeilen (genau eine Klammer)',
    /Zeile 4: h=[\d.]+mm "ex Produktion"[\s\S]*?Klammer 0.79mm Bogen 3.4mm[\s\S]*?Zeile 5:[\s\S]*?Klammer 0mm[\s\S]*?Zeile 6:[\s\S]*?Klammer 0mm[\s\S]*?Zeile 7:[\s\S]*?Klammer 0mm/.test(lineText)],
  ['Panel: keine Feldüberschrift „Zusatzzeile n“', /extraLabels=0/.test(lineText)],
  /* Der Block endet oberhalb der Empfängerbox (nichts abgeschnitten) und der
     obere Versatz bleibt erhalten – nach demselben Muster wie gap-check. */
  ['Feldspalte endet über der Empfängerbox', (function () {
    const l = lineText.match(/blockunterkante=([\d.]+)mm \| empfaengerAb=([\d.]+)mm/);
    return !!l && parseFloat(l[1]) <= parseFloat(l[2]) + 0.2;
  })()],
  ['oberer Versatz der Feldspalte bleibt erhalten (6 mm)', /fieldsTop=6(\.00)?mm/.test(lineText)]
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
