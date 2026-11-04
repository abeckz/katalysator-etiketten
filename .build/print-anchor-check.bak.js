/*
 * Build-Hilfsskript (nicht Teil der App): misst Titel, vertikalen Trennstrich
 * und den Gruppenblock im DRUCK-MASSSTAB (1:1, alle Felder + Zusatzzeilen
 * gefüllt, beide Etiketten sichtbar).
 *
 * Warum 1:1? Die Bildschirm-Vorschau skaliert das Blatt per
 * `transform: scale(--zoom)`. Ein Trennstrich, dessen Kante auf eine halbe
 * CSS-Pixel-Kante fällt, wird dabei interpoliert (weich) – im Druck (1:1)
 * darf das nicht passieren. Deshalb wird hier gegen ganze Pixel gemessen.
 *
 *   node .build/print-anchor-check.js [quelle.html] [extra.css]
 *        [extra1] [extra2] [extra3] [ofen] [ex-produktion]
 *
 * Ohne Argumente: katalysator-etiketten.html, alle Zusatzzeilen gefüllt.
 * Die Messwerte stehen am Ende auch in `.build/out/print-anchor.txt`.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, process.env.PA_SRC || 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const probe = String.raw`
<pre id="pa">-</pre>
<style>#pa{position:absolute;left:-9999px;top:0}</style>
<script>
/* Zusatzzeilen: Werte aus der Befehlszeile ('' = Zeile leer lassen) */
const PA_FILL = __FILL__;
const PA_PREVIEW = __PREVIEW__;
const PA_ZOOM = __ZOOM__;
(function () {
  /* Zusatz-CSS (Datei \`extra.css\`) erst hier einspielen: im Quelltext der
     Messdatei stören Kommentare und Anführungszeichen nicht. */
  var extra = document.getElementById('pa-extra-css');
  if (extra && extra.textContent.trim()) {
    var st = document.createElement('style');
    st.textContent = extra.textContent;
    (document.head || document.documentElement).appendChild(st);
    window.PA_EXTRA = st;
  }
}());
function measure() {
 try {
  /* Maßstab 1:1 erzwingen (wie im Druck): keine Vorschau-Skalierung. */
  var sh = document.getElementById('sheet');
  if (!PA_PREVIEW) {
    sh.style.setProperty('--zoom', '1');
    sh.style.transform = 'none';
  }
  /* Etikett 1 im Messlauf zeigen (am Bildschirm ausgeblendet, im Druck sichtbar) */
  var l1 = document.querySelector('.label[data-index="1"]');
  if (l1) l1.style.setProperty('display', 'flex', 'important');
  var MM = 25.4 / 96;
  function mm(px) { return Math.round(px * MM * 100) / 100; }
  function r(n) { return n.getBoundingClientRect(); }
  var out = [];
  if (window.PA_EXTRA) out.push('[extra.css: ' + window.PA_EXTRA.sheet.cssRules.length + ' Regeln]');
  var i;
  for (i = 0; i < 2; i += 1) {
    var L = document.querySelector('.label[data-index="' + i + '"]');
    if (!L) continue;
    var lb = r(L);
    var left = L.querySelector('.label__left');
    var title = L.querySelector('.label__lefttext');
    var fields = L.querySelector('.label__fields');
    var rec = L.querySelector('.recipient');
    var grp = L.querySelector('.lrow--group');
    var rows = [].slice.call(fields.children);
    var titleLines = [].slice.call(title.querySelectorAll('span')).map(function (s) {
      var b = r(s);
      return mm(b.width) + 'x' + mm(b.height) + ' @y' + mm(b.top - lb.top);
    });
    out.push('--- Etikett ' + i + ' (Blatt ' + mm(lb.width) + 'x' + mm(lb.height) + 'mm) ---');
    /* Titel: Mitte muss auf der Etikettenmitte liegen */
    var tb = r(title);
    out.push('Titel ' + titleLines.join(' | ') +
      ' | Mitte ' + mm((tb.top + tb.bottom) / 2 - lb.top) + 'mm (Soll ' + mm(lb.height / 2) + 'mm)');
    /* Pixelgenauigkeit im DRUCK (1:1): Kanten müssen auf ganzen Pixeln liegen,
       sonst wird die Kante beim Rastern interpoliert (unscharf). */
    var baseTop = lb.top;
    function frac(n) { return (Math.round(n * 1000) / 1000) % 1; }
    function snap(n) { return Math.round(n * 100) / 100; }
    out.push('Kanten px: links ' + frac(tb.left).toFixed(3) + ' rechts ' + frac(tb.right).toFixed(3) +
      ' oben ' + frac(tb.top).toFixed(3) + ' unten ' + frac(tb.bottom).toFixed(3) +
      ' | ganze Pixel? ' + ([tb.left, tb.right, tb.top, tb.bottom].every(function (n) {
        return Math.abs(frac(n)) < 0.01;
      }) ? 'JA' : 'nein'));
    /* Trennstrich = rechter Rand der Titelspalte (border-right). */
    var lc = r(left);
    var cs = getComputedStyle(left);
    var bw = lc.width - left.clientWidth;
    if (!(bw > 0)) bw = parseFloat(cs.borderRightWidth) || 0;
    var borderR = lc.right - (parseFloat(cs.marginRight) || 0);
    var borderL = borderR - bw;
    out.push('Trennstrich ' + bw.toFixed(3) + 'px: ' + borderL.toFixed(3) + '..' + borderR.toFixed(3) +
      'px | Etikettenrand ' + lb.right.toFixed(3) +
      ' | halbe Pixel? ' + ((borderR % 1) !== 0 || (borderL % 1) !== 0 ? 'JA' : 'nein'));
    /* Unterkante UND Oberkante des Etiketts: ein Rand auf ganzen Pixeln ist
       nur dann ganzzahlig, wenn auch die Etikettenkante selbst ganzzahlig
       liegt – der Rand wird relativ zur Etikettenfläche gerastert. */
    out.push('Etikettenkanten px: oben ' + lb.top.toFixed(3) + ' unten ' + lb.bottom.toFixed(3) +
      ' links ' + lb.left.toFixed(3) + ' rechts ' + lb.right.toFixed(3) +
      ' | ganzzahlig? ' + ([lb.top, lb.bottom, lb.left, lb.right].every(function (n) {
        return Math.abs(n - Math.round(n)) < 0.01;
      }) ? 'JA' : 'nein'));
    /* Gemessene Linie: rechter Rand der Titelspalte ohne Rand/Polsterung
       (funktioniert für den Rahmen UND für eine absolut positionierte
       Linie). */
      var lineW = parseFloat(cs.borderRightWidth) || 0;
    if (!lineW) {
      /* Position der Linie über den Rand der Titelspalte bestimmen */
      var insetR = lc.right - (parseFloat(cs.marginRight) || 0) - (parseFloat(cs.paddingRight) || 0);
      var pseudoW = 2;
      out.push('Trennlinie (::after) ' + (insetR - pseudoW).toFixed(3) + '..' + insetR.toFixed(3) +
        'px | ganze Pixel? ' + (((insetR - pseudoW) % 1 === 0 && insetR % 1 === 0) ? 'JA' : 'nein'));
      void lineW;
    }
    out.push('Titelspalte x ' + mm(left.getBoundingClientRect().left - lb.left) + '-' +
      mm(lc.right - (parseFloat(cs.marginRight) || 0) - lb.left) + 'mm (padL ' + cs.paddingLeft +
      ', padR ' + cs.paddingRight + ', mr ' + cs.marginRight + ')');
    /* Empfängerbox und Gruppenklammer */
    var rb = r(rec);
    var fbT = r(fields);
    if (grp) {
      var gb = r(grp);
      out.push('Gruppe ' + mm(gb.top - lb.top) + '-' + mm(gb.bottom - lb.top) + 'mm' +
        ' | Empfaenger ' + mm(rb.top - lb.top) + '-' + mm(rb.bottom - lb.top) + 'mm' +
        ' | Luft ' + mm(rb.top - gb.bottom) + 'mm');
      out.push('Klammer ' + (gb.bottom <= fbT.bottom + 0.5 ? 'vollständig sichtbar' : 'GEKAPPT') +
        ' (Feldspalte endet ' + mm(fbT.bottom - lb.top) + 'mm) | unten ' + mm(gb.bottom - fbT.bottom) + 'mm zu tief');
      out.push('Felder ' + mm(fbT.top - lb.top) + '-' + mm(fbT.bottom - lb.top) + 'mm (pad-top ' +
        (getComputedStyle(fields).paddingTop) + ') | Zeilen: ' +
        L.querySelectorAll('.label__fields .lrow--group .lrow--extra').length + ' Zusatzzeilen ' +
        [].slice.call(L.querySelectorAll('.label__fields .lrow--extra')).map(function (n) {
          return mm(r(n).height);
        }).join(' / ') + 'mm');
      /* die letzte Zusatzzeile: sitzt ihr Text komplett in ihrem Kasten? */
      var ex = L.querySelectorAll('.label__fields .lrow--extra');
      var last = ex[ex.length - 1];
      if (last) {
        var vb = r(last.querySelector('.lrow__v'));
        out.push('letzte Zusatzzeile ' + mm(vb.height) + 'mm Text in ' + mm(r(last).height) +
          'mm Kasten | Text abgeschnitten? ' + (vb.bottom > r(last).bottom + 0.5 ? 'JA' : 'nein'));
      }
    } else {
      out.push('Gruppe - | Empfaenger ' + mm(rb.top - lb.top) + '-' + mm(rb.bottom - lb.top) + 'mm');
    }
    out.push('Spalte: gap ' + (getComputedStyle(fields).getPropertyValue('--fields-gap') || '-').trim() +
      ' | top ' + (getComputedStyle(fields).getPropertyValue('--fields-top') || '-').trim() +
      ' | shift ' + (getComputedStyle(L.querySelector('.label__right')).getPropertyValue('--fields-shift') || '-').trim() +
      ' | Zeilen ' + rows.map(function (n) { return mm(r(n).height); }).join(' / ') + 'mm');
    /* Trennstrich und Titel zusätzlich in einer VORSCHAU-Skalierung messen
       (0,68 wie bei einem typischen Fenster). Zeigt, welche Kanten dabei auf
       halben Bildpunkten landen und deshalb interpoliert (unscharf) werden. */
    if (i === 0 && !PA_PREVIEW) {
      sh.style.transform = 'scale(' + PA_ZOOM + ')';
      sh.style.setProperty('--zoom', String(PA_ZOOM));
      var tb2 = r(title);
      var lc2 = r(left);
      var cs2 = getComputedStyle(left);
      var glyph = r(title.querySelector('span'));
      /* Verlust beim Skalieren: Überschwingen der Kanten um 1/8 px (Chrome
         rastert hier mit „anti-aliasing" über die Kante hinaus) */
      var z = PA_ZOOM;
      var over = Math.max(
        snap(tb2.left / z) - snap(tb.left),
        snap(tb.right) - snap(tb2.right / z),
        snap(tb2.top / z) - snap(tb.top),
        snap(tb.bottom) - snap(tb2.bottom / z));
      /* auch die Vorschau-Kanten prüfen: auf halben Pixeln => interpoliert */
      out.push('Vorschau ' + z + ': Titel x ' + tb2.left.toFixed(3) + '..' + tb2.right.toFixed(3) +
        ' y ' + tb2.top.toFixed(3) + '..' + tb2.bottom.toFixed(3) +
        ' | Glyphen ' + glyph.left.toFixed(3) + '..' + glyph.right.toFixed(3) +
        ' | Kantenverlust ' + over.toFixed(3) + 'px');
      sh.style.transform = 'none';
      sh.style.setProperty('--zoom', '1');
    }
  }
  /* 1:1 stehen lassen (Screenshot des 1:1-Layouts): keine Skalierung,
     keine Rückkehr zur Vorschau. */
  if (!PA_PREVIEW) return;
 } catch (e) {
  document.getElementById('pa').textContent = 'FEHLER: ' + e.message;
 }
}
window.addEventListener('load', function () {
  window.setTimeout(function () {
    function s(sel, v) {
      var n = document.querySelector(sel);
      if (!n) return;
      n.value = v;
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }
    /* Füllwerte: Standard = alle Zusatzzeilen belegt (Druckfall) */
    const fill = PA_FILL || ['AUS OFEN', 'C100', 'Restcharge 12,4 t'];
    s('#fFurnace', 'K-08');
    s('#fProduction', 'Charge BF-01');
    s('#fExtra1', fill[0] || '');
    s('#fExtra2', fill[1] || '');
    s('#fExtra3', fill[2] || '');
    window.setTimeout(measure, 900);
  }, 400);
});
</script>
</body>`;

/* DruckmaÃŸstab erzwingen: BedienoberflÃ¤che weg, beide Etiketten sichtbar,
   Zoom aus (dieselben Regeln wie @media print).
   WICHTIG: `@media screen` statt Medienwechsel â€“ ein Medienwechsel per
   Kommandozeile (`--blink-settings=mediaType=print`) wÃ¼rde die App dazu
   bringen, den Zoom 1:1 zu setzen und die Screenshot-Breite zu sprengen. */
/* Anzeige-Modus: `--preview` = normale Bildschirm-Vorschau (Blatt skaliert wie
   in der App), sonst Druckmaßstab 1:1 (Screenshot + Messung). */
const previewMode = process.argv.indexOf('--preview') > 0;
const printCss = previewMode
  ? '<style>' +
    '.panel,.app-bar,.stage-tools,.toast{display:none!important}' +
    '.app-shell{height:auto!important}' +
    '.workspace{display:block!important;max-width:none!important;margin:0!important;padding:0!important}' +
    '.preview-wrap,.sheet-stage{display:block!important;padding:0!important;margin:0!important;border:0!important;background:none!important}' +
    '.sheet-fit{width:auto!important;height:auto!important}' +
    '.sheet__labels .label[data-index="1"]{display:flex!important}' +
    '</style>'
  : '<style>' +
  '.panel,.app-bar,.stage-tools,.toast{display:none!important}' +
  '.app-shell{height:auto!important}' +
  '.workspace{display:block!important;max-width:none!important;margin:0!important;padding:0!important}' +
  '.preview-wrap,.sheet-stage{display:block!important;padding:0!important;margin:0!important;border:0!important;background:none!important}' +
  '.sheet-fit{width:auto!important;height:auto!important}' +
  /* Massstab 1:1: Blatt und Wrapper wie im Druck, die Vorschau-Skalierung aus */
  '.sheet{transform:none!important;width:210mm!important;height:297mm!important}' +
  '.sheet,.sheet__labels{height:297mm!important}' +
  /* Referenz-Etikett sichtbar machen (die App blendet es auf dem Bildschirm aus) */
  '.sheet__labels .label[data-index="1"]{display:flex!important}' +
  '</style>';
/* Zoom-Variable auf 1 setzen, damit die App nicht gegen die Vorschau rechnet */
const zoomFix = previewMode ? '' :
  '<script>document.addEventListener("DOMContentLoaded", function () {' +
  'var s = document.getElementById("sheet"); if (s) s.style.setProperty("--zoom", "1");' +
  '});</script>';

const file = path.join(outDir, previewMode ? 'print-preview.html' : 'print-anchor.html');
/* Optionaler Quellpfad als Argument (Experimente): node ... <name>.html */
let source = fs.readFileSync(htmlFile, 'utf8');
if (process.argv[2]) {
  const altSrc = path.join(root, process.argv[2]);
  source = fs.existsSync(altSrc) ? fs.readFileSync(altSrc, 'utf8') : '(fehlt: ' + altSrc + ')';
}
/* Zusatz-CSS für die Messung: `node ... <datei.html> <extra.css>`
   (wird erst im Messlauf eingespielt, damit kein Kommentar im CSS stört). */
const extraFile = process.argv[3] ? path.join(root, process.argv[3]) : null;
const extraCss = extraFile && fs.existsSync(extraFile)
  ? '<script type="text/plain" id="pa-extra-css">' + fs.readFileSync(extraFile, 'utf8') + '</script>'
  : '';
/* Zusatzzeilen aus der Befehlszeile ('' = Zeile leer lassen) */
const fillArg = [process.argv[4], process.argv[5], process.argv[6]];
fillArg[0] = (fillArg[0] === undefined || fillArg[0].startsWith('--')) ? 'AUS OFEN' : fillArg[0];
fillArg[1] = (fillArg[1] === undefined || fillArg[1].startsWith('--')) ? 'C100' : fillArg[1];
fillArg[2] = (fillArg[2] === undefined || fillArg[2].startsWith('--')) ? 'Restcharge 12,4 t' : fillArg[2];
const probeSrc = probe.replace('__FILL__', JSON.stringify(fillArg))
  .replace('__PREVIEW__', previewMode ? 'true' : 'false')
  .replace('__ZOOM__', String(process.env.PA_ZOOM || 0.68));
fs.writeFileSync(file, source.replace(/<\/body>\s*<\/html>\s*$/, zoomFix + extraCss + probeSrc + '</html>')
  .replace('</head>', printCss + '</head>'), 'utf8');

/* Eigenes Prüfskript: liest die erzeugte Datei und schreibt die Messwerte in
   eine Textdatei (unabhängig von der Konsole). */
const outTxt = path.join(outDir, 'print-anchor.txt');
const srcTxt = fs.readFileSync(file, 'utf8');
fs.writeFileSync(path.join(outDir, 'probe-snippet.js'),
  srcTxt.slice(srcTxt.indexOf('<pre id="pa">')), 'utf8');

const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=1',
  '--window-size=1600,1200', '--virtual-time-budget=9000',
  '--screenshot=' + path.join(outDir, 'print-anchor.png'),
  '--dump-dom', 'file:///' + file.replace(/\\/g, '/')],
{ encoding: 'utf8', maxBuffer: 1 << 28 });
fs.writeFileSync(outTxt, String(res.stdout || ''), 'utf8');
console.log('DOM gespeichert: ' + outTxt);

const dm = (res.stdout || '').match(/<pre id="pa">([\s\S]*?)<\/pre>/);
if (dm && dm[1] !== '-') {
  console.log(dm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
} else {
console.log('Debugger: ' + (res.stdout || '').slice(-1200));
}
console.log('\nScreenshot: ' + path.join(outDir, 'print-anchor.png'));
