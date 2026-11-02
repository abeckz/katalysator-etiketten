/*
 * Build-Hilfsskript (nicht Teil der App): prüft Größe und Zentrierung der
 * GHS-Piktogramme in den Editor-Kacheln und liefert die Messwerte, mit denen
 * PIC_FIT in katalysator-etiketten.html justiert wird.
 *   node .build/ghs-fit-check.js
 *
 * Gemessen wird im 579er-Bezugsraum der Raute (Innenkante 50,94 .. 527,82,
 * Mitte 289,38). Achtung: Die Raute ist um 45° gedreht. Die Innenfläche ist
 * in 45°-Richtung quadratisch, die achsenparallele Box eines Symbols darf
 * deshalb bis ~289 breit, aber nur bis ~237 hoch sein. Geprüft wird der
 * Abstand der Box-Ecken zu den Randlinien (x + y = 50,94 bzw. 527,82).
 *
 * Geprüft wird:
 *   - Symbol mittig (Abweichung in x/y höchstens 4 Einheiten)
 *   - Abstand zur Randlinie positiv (Symbol liegt in der Raute)
 *   - gleiche Symbolgröße (längere Seite, Spanne höchstens 10 %;
 *     acid/bottle sind bewusst flacher)
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

/* Messung im Browser: getBoundingClientRect() liefert gerenderte Pixel, der
   Zoomfaktor ergibt sich aus Breite des SVG / Breite der viewBox. */
const probe = [
    '<pre id="fit-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  try {',
    '    setTimeout(function () {',
    '      document.getElementById("btnSettings").click();',
    '      var rows = [];',
    '      document.querySelectorAll(".ghs-opt__dia svg").forEach(function (svg) {',
    '        var g = svg.lastElementChild;',
    '        var box = svg.getBoundingClientRect();',
    '        if (!g || !box.width) return;',
    '        var r = g.getBoundingClientRect();',
    '        var vb = svg.viewBox.baseVal;',
    '        var z = box.width / vb.width;',
    '        rows.push({',
    '          key: svg.closest(".ghs-opt").getAttribute("data-key"),',
    '          x: (r.left - box.left) / z + vb.x,',
    '          y: (r.top - box.top) / z + vb.y,',
    '          w: r.width / z,',
    '          h: r.height / z',
    '        });',
    '      });',
    '      document.getElementById("fit-out").textContent = JSON.stringify(rows);',
    '    }, 400);',
    '  } catch (e) {',
    '    document.getElementById("fit-out").textContent = "ERR " + e.message;',
    '  }',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(htmlFile, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, 'ghs-fit-check.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=1000,900',
    '--virtual-time-budget=4000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '';

const raw = dom.match(/<pre id="fit-out">([\s\S]*?)<\/pre>/);
const text = raw ? raw[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
if (!text) {
    console.log('FAIL  keine Messwerte (Editor nicht geöffnet?)');
    process.exit(1);
}
if (text.startsWith('ERR')) {
    console.log('FAIL  ' + text);
    process.exit(1);
}
const rows = JSON.parse(text);

/* Bezugsraum der Raute (GHS_FRAME): Innenkante 50,94 .. 527,82, Mitte
   289,38. Die Randlinien liegen in 45°-Richtung; für die obere linke Kante
   gilt x + y = 50,94. Die achsenparallele Breite taugt deshalb nicht als
   Maß für den Überstand – geprüft wird der Abstand zu den Kanten. */
const IN = { min: 50.939, max: 527.821, center: 289.38 };
/* Toleranz der Pixelmessung: boundingClientRect liefert ganze Pixel, der
   Zoomfaktor ist ~11,2 – Werte streuen deshalb um ±0,6 Einheiten. */
const TOL = 2.5;

let allOk = true;
const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);

/* kleinster Abstand der Symbol-Ecken zu den vier Randlinien;
   negativ = Symbol ragt über die Randlinie hinaus */
function clearance(r) {
    const d = [
        (r.x + r.y) - IN.min,                   /* Kante oben links */
        IN.max - (r.x + r.w + r.y),             /* Kante oben rechts */
        (r.x + r.y + r.h) - IN.min,             /* Kante unten links */
        IN.max - (r.x + r.w + r.y + r.h)        /* Kante unten rechts */
    ];
    return Math.min.apply(null, d) * Math.SQRT1_2;
}

console.log('Key            x      y      w      h      dx     dy   Luft zur Randlinie');
for (const r of rows) {
    const dx = r.x + r.w / 2 - IN.center;
    const dy = r.y + r.h / 2 - IN.center;
    const cl = clearance(r);
    const ok = Math.abs(dx) <= TOL && Math.abs(dy) <= TOL && cl > 0;
    allOk = allOk && ok;
    console.log((ok ? 'OK  ' : 'FAIL') + '  ' + String(r.key).padEnd(11) + ' ' +
        fmt(r.x).padStart(6) + ' ' + fmt(r.y).padStart(6) + ' ' + fmt(r.w).padStart(6) + ' ' +
        fmt(r.h).padStart(6) + ' ' + fmt(dx).padStart(6) + ' ' + fmt(dy).padStart(6) +
        '   ' + fmt(cl));
}

/* Piktogramme mit breiter, niedriger Grafik (Säure) dürfen flacher sein als
   die übrigen Symbole. Die Ausnahme ist bewusst gesetzt, deshalb wird das
   Symbol nur auf Einhaltung der Raute geprüft. */
const FLAT_OK = new Set(['acid']);
const sizes = rows.filter((r) => !FLAT_OK.has(r.key)).map((r) => Math.max(r.w, r.h));
const smin = Math.min.apply(null, sizes);
const smax = Math.max.apply(null, sizes);
const spread = (smax - smin) / smax;
const sameSize = spread <= 0.10;
console.log((sameSize ? 'OK  ' : 'FAIL') + '  Symbolgröße einheitlich (Spanne ' +
    (Math.round(spread * 1000) / 10) + ' %, ' + fmt(smin) + ' .. ' + fmt(smax) +
    '; ausgeklammert: ' + Array.from(FLAT_OK).join(', ') + ')');
allOk = allOk && sameSize;

/* Stellschrauben für PIC_FIT: nötiger Versatz und Faktor je Symbol */
console.log('\nMesswerte für PIC_FIT (Korrektur für s/dx/dy):');
for (const r of rows) {
    const dx = IN.center - (r.x + r.w / 2);
    const dy = IN.center - (r.y + r.h / 2);
    const s = smax / Math.max(r.w, r.h);
    console.log('    ' + (String(r.key) + '          ').slice(0, 11) +
        ' dx=' + fmt(dx).padStart(6) + '  dy=' + fmt(dy).padStart(6) +
        '  s×' + s.toFixed(2) + '   (' + fmt(r.w) + ' x ' + fmt(r.h) + ')');
}

console.log('\n' + (allOk ? 'ALLE PRÜFUNGEN OK' : 'PRÜFUNG FEHLGESCHLAGEN'));
process.exit(allOk ? 0 : 1);

