/*
 * Build-Hilfsskript (nicht Teil der App): misst die C-Klammer jedes Feldes
 * (Strichstärke, Radius, Breite, Farbe) und prüft, dass keine Unterstreichung
 * mehr vorhanden ist.
 *   node .build/bracket-check.js
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
  function mm(v) { var n = parseFloat(v); return isNaN(n) ? v : Math.round(n * MM * 100) / 100 + 'mm'; }
  function mmPx(px) { return Math.round(px * MM * 100) / 100 + 'mm'; }
  var l = document.querySelector('.label[data-index="0"]');
  var out = [];
  var z0 = parseFloat(getComputedStyle(document.getElementById('sheet')).getPropertyValue('--zoom'));
  z0 = z0 > 0 ? z0 : 1;
  /* Klammern sitzen an den Zeilen der Feldspalte; „ex Produktion“ und die drei
     Zusatzzeilen teilen sich EINE Klammer am Gruppencontainer
     (.lrow--group, ohne die Klammerklasse .lrow), die eingerückten Zeilen
     darin haben keine eigene Klammer. */
  Array.prototype.forEach.call(l.querySelectorAll('.label__fields .lrow, .label__fields .lrow--group, .label__fields .lrow--extra'), function (row, i) {
    var b = getComputedStyle(row, '::before');
    var k = row.querySelector('.lrow__k');
    var own = row.querySelector('.lrow__v');
    out.push('Zeile ' + (i + 1) +
      ' | ' + (row.className || 'lrow') +
      ' | Klammer: links ' + mm(b.borderLeftWidth) + ' oben ' + mm(b.borderTopWidth) +
      ' rechts ' + mm(b.borderRightWidth) +
      ' Radius ' + mm(b.borderTopLeftRadius) + ' Breite ' + mm(b.width) + ' ' + b.borderLeftColor +
      ' | pad-left ' + mm(getComputedStyle(row).paddingLeft) +
      ' | Unterstrich ' + mm(own ? getComputedStyle(own).borderBottomWidth : '0') +
      ' | Titel' + (k ? '="' + k.textContent.trim() + '"' : '=keiner') +
      ' | Wert h ' + mm(own ? own.offsetHeight : 0));
  });
  /* Oberkante des Textblocks gegen die 5-mm-Randkante des Etiketts */
  var label = l.getBoundingClientRect();
  var fl = l.querySelector('.label__fields');
  var first = (fl.querySelector('.lrow, .lrow--group') || fl).getBoundingClientRect();
  var lf = fl.getBoundingClientRect();
  out.push('Feldspalte: h ' + mmPx(lf.height / z0) + ' | scrollH ' + mmPx(fl.scrollHeight / z0) +
    ' | top-im-Etikett ' + mmPx((lf.top - label.top) / z0) +
    ' | pad-top ' + mmPx(parseFloat(getComputedStyle(fl).paddingTop) / z0));
  var fl = l.querySelector('.label__fields');
  var rowsAll = Array.prototype.map.call(fl.children, function (c) {
    var b = c.getBoundingClientRect();
    return (c.className.replace('lrow', '').trim() || 'row') + '=' + mmPx(b.height / z0) +
      '(y' + mmPx((b.top - lf.top) / z0) + ')';
  });
  out.push('Spaltenkinder: ' + rowsAll.join(', ') +
    ' | gap ' + mmPx(parseFloat(getComputedStyle(fl).rowGap) / z0) +
    ' | justify ' + getComputedStyle(fl).justifyContent +
    ' | display ' + getComputedStyle(fl).display);
  out.push('Block: erster Klammerbogen ' + mmPx((first.top - label.top) / z0) +
    ' unter der Etikettenkante (Rand 5mm)' +
    ' | --fields-top=' +
    getComputedStyle(l.querySelector('.label__fields')).getPropertyValue('--fields-top').trim() +
    ' | --fields-shift=' +
    getComputedStyle(l.querySelector('.label__right')).getPropertyValue('--fields-shift').trim() +
    ' | Reserve ' + mmPx(l.querySelector('.label__fields').clientHeight -
      l.querySelector('.label__fields').scrollHeight));
  out.push('labels: ' + Array.prototype.map.call(l.querySelectorAll('.label__fields .lrow__k'),
    function (k) { return k.textContent.trim() + '=' + mmPx(k.getBoundingClientRect().height); }).join(', '));
  var grp = l.querySelector('.lrow--group');
  var grpC = getComputedStyle(grp);
  out.push('Gruppenstil: basis "' + grpC.flexBasis + '" | grow ' + grpC.flexGrow +
    ' | shrink ' + grpC.flexShrink + ' | h ' + mmPx(grp.getBoundingClientRect().height / z0) +
    ' | inline "' + grp.getAttribute('style') + '"');
  out.push('Gruppe: Zeilen ' +
    grp.querySelectorAll('.lrow--row, .lrow--extra').length +
    ' | Klammern darin ' + Array.prototype.filter.call(grp.querySelectorAll('.lrow, .lrow--row, .lrow--extra'),
      function (r) { return parseFloat(getComputedStyle(r, '::before').borderLeftWidth) > 0; }).length +
    ' | eigene Klammer ' + (parseFloat(getComputedStyle(grp, '::before').borderLeftWidth) > 0 ? 'ja' : 'nein'));

  /* Zweiter Durchlauf: Zusatzzeilen beschreiben -> Klammer muss wachsen */
  var f1 = document.getElementById('fExtra1');
  var f2 = document.getElementById('fExtra2');
  var f3 = document.getElementById('fExtra3');
  var hBefore = grp.getBoundingClientRect().height;
  var e1 = l.querySelector('.lrow__v[data-f="extra1"]');
  var e3 = l.querySelector('.lrow__v[data-f="extra3"]');
  var r1 = e1.getBoundingClientRect();
  out.push('extra-Rohmasse (leer): h ' + mmPx(r1.height) +
    ' | scrollH ' + mmPx(e1.scrollHeight) + ' | breite ' + mmPx(r1.width) +
    ' | minH ' + getComputedStyle(e1).minHeight);
  f1.value = 'Restcharge 12,4 t';
  f1.dispatchEvent(new Event('input', { bubbles: true }));
  f2.value = 'Sackware, 3 Big Bags';
  f2.dispatchEvent(new Event('input', { bubbles: true }));
  var hAfter = l.querySelector('.lrow--group').getBoundingClientRect().height;
  var z = z0;
  out.push('extra nachher: text="' + e1.textContent + '" h=' +
    mmPx(e1.getBoundingClientRect().height) + ' | scrollH ' + mmPx(e1.scrollHeight) +
    ' | e3 h=' + mmPx(e3.getBoundingClientRect().height) +
    ' | Gruppe ' + mmPx(hAfter / z) +
    ' | Platz ' + mmPx((l.querySelector('.label__fields').clientHeight -
      l.querySelector('.label__fields').scrollHeight) / z));
  out.push('Zusatzzeilen: vorher ' + mmPx(hBefore / z) + ' nachher ' + mmPx(hAfter / z) +
    ' -> ' + (hAfter > hBefore ? 'Klammer gewachsen' : 'Klammer UNVERAENDERT') +
    ' | offen=' + Array.prototype.filter.call(l.querySelectorAll('.lrow--extra .lrow__v'),
      function (v) { return v.scrollHeight > 0; }).length + '/3');
  f1.value = '';
  f1.dispatchEvent(new Event('input', { bubbles: true }));
  f2.value = '';
  f2.dispatchEvent(new Event('input', { bubbles: true }));
  out.push('Zusatzzeilen zurueck: ' + mmPx(l.querySelector('.lrow--group')
    .getBoundingClientRect().height / z) + ' | leer=' +
    Array.prototype.filter.call(l.querySelectorAll('.lrow--extra .lrow__v'),
      function (v) { return v.textContent.trim() === ''; }).length + '/3');
  document.getElementById('p').textContent = out.join('\\n');
})();
</script>
</body>`;

const probeFile = path.join(outDir, 'bracket-probe.html');
fs.writeFileSync(probeFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', probe), 'utf8');

const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=1', '--virtual-time-budget=5000',
  '--window-size=1400,1000', '--dump-dom', 'file:///' + probeFile.replace(/\\/g, '/')],
{ encoding: 'utf8', maxBuffer: 1 << 28 });

const dom = res.stdout || '';
const m = dom.match(/<pre id="p">([\s\S]*?)<\/pre>/);
const out = m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
console.log(out || '(keine Messwerte)');

const lines = out.split('\n').filter((x) => x.indexOf('Zeile ') === 0);
/* Klammern tragen nur die vier Einzelfelder (`.lrow`) und die Gruppe
   (`.lrow--group`); die Zusatzzeilen (`.lrow--extra`) haben keine.
   Achtung: Zeilen tragen teils MEHRERE Klassen (`lrow lrow--date`), deshalb
   wird auf Enthaltensein geprueft statt auf Gleichheit. */
const bracketLines = lines.filter((x) => /Klammer: links 0\.79mm/.test(x));
const extraLines = lines.filter((x) => /\| lrow--extra \|/.test(x));
const block = (out.match(/Block: ([^\n]*)/) || [])[1] || '';
const blockTop = parseFloat((block.match(/erster Klammerbogen ([\d.]+)mm/) || [])[1]);
const group = (out.match(/Gruppe: ([^\n]*)/) || [])[1] || '';
const grow = (out.match(/Zusatzzeilen: ([^\n]*)/) || [])[1] || '';
/* Gegen die Ausgabe testen, nicht gegen das gefilterte Teilstueck. */
const groupLine = (out.match(/^Gruppe: .*$/m) || [''])[0];
const checks = [
  ['5 Klammern in der Feldspalte (4 Felder + 1 Gruppe)', bracketLines.length + (/\| lrow--group \|/.test(out) ? 1 : 0) >= 5],
  ['ex Produktion + Zusatzzeilen tragen keine eigene Klammer (eine gemeinsame C-Klammer)',
    extraLines.length === 3 && extraLines.every((x) => /Klammer: links 0mm/.test(x)) &&
    /\| lrow--group \|/.test(out) &&
    /^Gruppe: Zeilen 4 \| Klammern darin 0 \| eigene Klammer ja$/.test(groupLine)],
  ['jede Klammer 0,8 mm / hellgrau', bracketLines.every((x) =>
    /links 0\.79mm/.test(x) && /rgb\(185, 190, 198\)/.test(x))],
  ['Klammer ohne rechten Strich', bracketLines.every((x) => /rechts 0mm/.test(x))],
  ['Bögen 2 cm nach rechts gezogen (Breite 25 mm)',
    bracketLines.every((x) => /Breite 25mm/.test(x))],
  ['Bogenhöhe bleibt fest (Radius 1,8 mm)',
    bracketLines.every((x) => /Radius 1\.8mm/.test(x))],
  ['keine Unterstreichung mehr', lines.every((x) => /Unterstrich 0mm/.test(x))],
  ['Überschriften in den ersten vier Feldern',
    ['Katalysator', 'Ausbaudatum', 'aus Ofen', 'ex Produktion'].every((t) =>
      new RegExp('Titel="' + t + '"').test(out))],
  ['Texte laufen bis unter das Klammerende (Katalysator 9 mm hoch)',
    /Titel="Katalysator" \| Wert h 9mm/.test(out)],
  ['Textblock steht unter der 5-mm-Randkante (> 8 mm)', blockTop > 8],
  ['Gruppenklammer umfasst ex Produktion + 3 Zusatzzeilen (1 Klammer)',
    /^Gruppe: Zeilen 4 \| Klammern darin 0 \| eigene Klammer ja$/.test(groupLine)],
  ['Gruppenklammer wächst mit beschriebenen Zusatzzeilen',
    (parseFloat((grow.match(/nachher ([\d.]+)mm/) || [])[1]) || 0) >
    (parseFloat((grow.match(/vorher ([\d.]+)mm/) || [])[1]) || 0) + 0.5],
  ['Textblock bleibt unter der 5-mm-Randkante (Klammer nicht angeschnitten)',
    blockTop > 5.8 && !/Reserve -/.test(block)]
];
const pass = new RegExp(process.env.BRACKET_RE || '.*');
let ok = true;
for (const [label, _pass] of checks) {
  const result = pass.test(label) ? _pass : false;
  console.log((result ? 'OK  ' : 'FAIL') + '  ' + label);
  ok = ok && result;
}
console.log('\n' + (ok ? 'ALLE KLAMMER-PRÜFUNGEN OK' : 'PRÜFUNG FEHLGESCHLAGEN'));
process.exit(ok ? 0 : 1);
