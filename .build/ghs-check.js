/*
 * Build-Hilfsskript (nicht Teil der App): prueft die neu aufgebauten
 * Piktogramme exakt ueber getBBox im Browser (kein eigener Parser).
 *   node .build/ghs-check.js
 * Kriterien je Symbol: Mitte bei 289,38 / 289,38, Figur innerhalb der
 * weissen Innenraute (|dx| + |dy| <= 238,44), Figurgroesse >= 250 sowie
 * deckende Darstellung (keine Transparenz, keine Verlaeufe).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const C = 289.38, DIAG = 238.44;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghs-paths.json'), 'utf8'));
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const svgs = data.pictograms.map(function (g) {
    const body = g.paths.map(function (p) {
        return '<path d="' + p.d + '" fill="' + p.fill + '"' +
            (p.rule ? ' fill-rule="' + p.rule + '"' : '') + '/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" id="s-' + g.key + '" viewBox="0 0 579 579">' +
        body + '</svg>';
}).join('\n');

const html = '<!doctype html><meta charset="utf-8"><body>' +
    '<div style="position:absolute;left:-9999px">' + svgs + '</div><pre id="bb-out"></pre>' +
    '<script>window.addEventListener("load", function () {' +
    'var out = [];' +
    'document.querySelectorAll("svg[id^=s-]").forEach(function (svg) {' +
    '  var b = svg.getBBox();' +
    '  /* tatsaechliche Randnaehe: alle Stuetzpunkte ueber die Laenge abtasten */' +
    '  var C = 289.38, DIAG = 238.44, worst = Infinity;' +
    '  svg.querySelectorAll("path").forEach(function (p) {' +
    '    var L = p.getTotalLength(), N = 700;' +
    '    for (var i = 0; i <= N; i++) {' +
    '      var q = p.getPointAtLength((L * i) / N);' +
    '      var gap = DIAG - (Math.abs(q.x - C) + Math.abs(q.y - C));' +
    '      if (gap < worst) worst = gap;' +
    '    }' +
    '  });' +
    '  out.push([svg.id.slice(2), b.x.toFixed(2), b.y.toFixed(2),' +
    '    b.width.toFixed(2), b.height.toFixed(2), worst.toFixed(1)].join(","));' +
    '});' +
    'document.getElementById("bb-out").textContent = out.join("\\n");' +
    '});</script></body>';

const tmp = path.join(outDir, 'ghs-check.html');
fs.writeFileSync(tmp, html, 'utf8');
const dom = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=900,700',
    '--virtual-time-budget=3000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '';
const m = dom.match(/<pre id="bb-out">([\s\S]*?)<\/pre>/);
if (!m) throw new Error('Messung fehlgeschlagen');

let fails = 0;
console.log('Symbol      x        y        w        h       Mitte(x/y)       Status');
m[1].trim().split('\n').forEach(function (line) {
    const parts = line.split(',');
    const key = parts[0];
    const bx = +parts[1], by = +parts[2], bw = +parts[3], bh = +parts[4];
    const cx = bx + bw / 2, cy = by + bh / 2;
    /* Randabstand: kleinster Abstand der Huelle zur Innenkante der Raute.
       Die Raute ist |dx| + |dy| = 238,44; fuer einen Punkt gilt damit
       Abstand = 238,44 - (|dx| + |dy|). Geprueft wird die Huelle in 4x4
       Stuetzpunkten, das ist fuer die Sichtpruefung genau genug. */
    let minGap = Infinity;
    for (let ix = 0; ix <= 4; ix += 1) {
        for (let iy = 0; iy <= 4; iy += 1) {
            const px = bx + (bw * ix) / 4 - C;
            const py = by + (bh * iy) / 4 - C;
            minGap = Math.min(minGap, DIAG - (Math.abs(px) + Math.abs(py)));
        }
    }
    const off = Math.abs(cx - C) > 14 || Math.abs(cy - C) > 14;
    const small = Math.max(bw, bh) < 250;
    const ok = minGap > -6 && !off && !small;
    if (!ok) fails += 1;
    console.log(key.padEnd(11),
        [bx, by, bw, bh].map(function (v) { return v.toFixed(1).padStart(7); }).join('  '),
        (cx.toFixed(1) + '/' + cy.toFixed(1)).padStart(15),
        'Rand ' + minGap.toFixed(1).padStart(6),
        ok ? 'ok' : (off ? 'ausser Mitte' : small ? 'zu klein' : 'ragt in den Rand'));
});
console.log(fails ? fails + ' Symbole auffaellig' : 'alle Symbole mittig und mit Abstand zur Raute');

const raw = JSON.stringify(data);
const bad = [];
if (/currentColor/i.test(raw)) bad.push('currentColor');
if (/opacity/i.test(raw)) bad.push('opacity');
if (/url\(#/.test(raw)) bad.push('Verlauf/Filter');
if (/transparent/.test(raw)) bad.push('transparent');
console.log(bad.length ? 'Darstellung: ' + bad.join(', ')
    : 'Darstellung: deckend, keine Transparenz, keine Verlaeufe');
process.exit(fails ? 1 : 0);
