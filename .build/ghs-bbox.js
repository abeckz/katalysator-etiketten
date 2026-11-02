/*
 * Build-Hilfsskript (nicht Teil der App): misst die Bounding-Box jedes
 * GHS-Symbols so, wie es die App darstellt, und leitet daraus die Sollwerte
 * für PIC_FIT in katalysator-etiketten.html ab.
 *   node .build/ghs-bbox.js
 * Werte im 579er-Raum (Rahmen-Innenkante 50,94 .. 527,82, Mitte 289,38).
 * Die Raute ist um 45° gedreht: obere linke Randlinie x + y = 50,94, untere
 * rechte x + y = 527,82; „Luft" ist der kleinste Abstand dorthin.
 *
 * Hinweis: Das Client-Rect der Gruppe ist die achsenparallele Box der
 * gezeichneten Glyphen. Symbole mit weit ausgreifenden Strahlen oder
 * Schattierungen (explos, silhouette, acid) haben deshalb eine größere Box
 * als ihre „Kernfigur" – für die Mittigkeit zählt die Box, für die
 * Raute-Einhaltung muss sie vollständig innerhalb der Kanten liegen.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');

const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const IN = { min: 50.939, max: 527.821, center: 289.38 };
/* Sollgröße der längeren Symbolseite im 579er-Raum, bezogen auf die
   „Kernfigur": explos und silhouette sind Vollflächen bzw. Strahlenbündel,
   deren Box deutlich größer ist als das eigentliche Motiv. */
const TARGET = 250;
const TARGET_OVERRIDE = { explos: 342.8, silhouette: 350.9, acid: 246.5 };

/* Messung an den Editor-Kacheln: `svg.getBBox()` liefert die Geometrie in
   viewBox-Einheiten des Kachel-SVG; mit `getScreenCTM()` wird sie in den
   579er-Raum der Raute umgerechnet. (Ein Client-Rect der Gruppe wäre in
   SVG-Einheiten falsch, weil die Gruppe zusätzlich skaliert ist.) Die
   Kachel-SVGs haben bereits den 579er-Raum, der Nenner bleibt also 1 – die
   Umrechnung steht explizit da, damit das Skript auch bei anderem viewBox
   stimmt. */
const probe = [
    '<pre id="bbox-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  try {',
    '    setTimeout(function () {',
    '      document.getElementById("btnSettings").click();',
    '      var out = [];',
    '      document.querySelectorAll(".ghs-opt__dia svg").forEach(function (svg) {',
    '        var g = svg.lastElementChild;',
    '        var box = svg.getBoundingClientRect();',
    '        if (!g || !box.width) return;',
    '        var bb = g.getBBox();',
    '        var m = g.getScreenCTM();',
    '        var host = svg.getScreenCTM();',
    '        /* in Kachel-Koordinaten (viewBox-Raum des Kachel-SVG) umrechnen */',
    '        var inv = m.inverse();',
    '        var pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y + bb.height]].map(function (p) {',
    '          var pt = svg.createSVGPoint();',
    '          pt.x = p[0]; pt.y = p[1];',
    '          var q = pt.matrixTransform(m).matrixTransform(host.inverse());',
    '          return q;',
    '        });',
    '        var vb = svg.viewBox.baseVal;',
    '        var k = vb.width / 579;',
    '        var x0 = Math.min(pts[0].x, pts[1].x) / k;',
    '        var y0 = Math.min(pts[0].y, pts[1].y) / k;',
    '        var w0 = Math.abs(pts[1].x - pts[0].x) / k;',
    '        var h0 = Math.abs(pts[1].y - pts[0].y) / k;',
    '        var m2 = (g.getAttribute("transform").match(/scale\\(([\\d.]+)\\)/g) || []);',
    '        var scales = m2.map(function (s) { return Number(s.replace(/[^\\d.]/g, "")); });',
    '        out.push([svg.closest(".ghs-opt").getAttribute("data-key"),',
    '          x0.toFixed(1), y0.toFixed(1), w0.toFixed(1), h0.toFixed(1),',
    '          scales.length > 1 ? scales[1] : scales[0]].join(","));',
    '      });',
    '      document.getElementById("bbox-out").textContent = out.join("\\n");',
    '    }, 400);',
    '  } catch (e) {',
    '    document.getElementById("bbox-out").textContent = "ERR " + e.message;',
    '  }',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(htmlFile, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, 'ghs-bbox.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=1000,900',
    '--virtual-time-budget=4000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '';
const m = dom.match(/<pre id="bbox-out">([\s\S]*?)<\/pre>/);
const lines = (m ? m[1] : '').split('\n').filter(Boolean);
if (!lines.length || lines[0].indexOf('ERR') === 0) {
    console.log('FAIL  ' + (lines[0] || 'keine Messwerte'));
    process.exit(1);
}

/* kleinster Abstand der Symbol-Ecken zu den vier 45°-Randlinien */
function clearance(x, y, w, h) {
    const d = [
        (x + y) - IN.min,
        IN.max - (x + w + y),
        (x + y + h) - IN.min,
        IN.max - (x + w + y + h)
    ];
    return Math.min.apply(null, d) * Math.SQRT1_2;
}

const rows = lines.map((l) => l.split(','))
    .map((p) => ({ key: p[0], x: +p[1], y: +p[2], w: +p[3], h: +p[4],
        s: +p[5] }));
const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);

console.log('key          x      y      w      h     dx     dy   Luft   s ist   Δdx    Δdy   s soll');
for (const r of rows) {
    const dx = IN.center - (r.x + r.w / 2);
    const dy = IN.center - (r.y + r.h / 2);
    const s = (TARGET_OVERRIDE[r.key] || TARGET) / Math.max(r.w, r.h);
    /* Δdx/Δdy ist die Restmittigkeit nach eingebauter Korrektur (0 = sitzt
       genau in der Raute). Client-Rects sind auf ganze Pixel gerundet, im
       579er-Raum ~0,7 Einheiten. */
    const e = (v) => (Math.abs(v) < 1.5 ? 0 : v);
    console.log(r.key.padEnd(11) + ' ' + fmt(r.x).padStart(6) + ' ' + fmt(r.y).padStart(6) +
        ' ' + fmt(r.w).padStart(6) + ' ' + fmt(r.h).padStart(6) + ' ' + fmt(dx).padStart(6) +
        ' ' + fmt(dy).padStart(6) + ' ' + fmt(clearance(r.x, r.y, r.w, r.h)).padStart(6) +
        ' ' + r.s.toFixed(3).padStart(6) + ' ' + fmt(e(dx)).padStart(6) + ' ' + fmt(e(dy)).padStart(6) +
        ' ' + (r.s * s).toFixed(3));
}
