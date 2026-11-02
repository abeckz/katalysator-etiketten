/*
 * Build-Hilfsskript (nicht Teil der App): misst die Originalgeometrie der
 * neun GHS-Vorlagen und berechnet daraus die Einpasswerte (PIC_BOX/PIC_FIT)
 * fuer den 579er-Rahmen.
 *
 *   node .build/ghs-fit-calc.js
 *
 * Gemessen wird im Browser ueber getBBox() am Originalpfad – damit sind auch
 * Kurven und Lupe genau, ohne eigenen Parser.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, '.ghs-official');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const ORDER = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];
const BG = ['#fff', '#ffffff', 'red', '#f00', '#ff0000'];

function glyphsOf(key) {
    const raw = fs.readFileSync(path.join(srcDir, key + '.svg'), 'utf8');
    const viewBox = (raw.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 579 579';
    const out = [];
    const re = /<path\b([^>]*)>/g;
    let m;
    while ((m = re.exec(raw))) {
        const a = m[1];
        const d = (a.match(/\bd="([^"]+)"/) || [])[1];
        if (!d) continue;
        const fill = String((a.match(/fill:\s*([^;"]+)/) || a.match(/\bfill="([^"]+)"/) || [])[1] || '#000')
            .trim().toLowerCase();
        if (BG.indexOf(fill) >= 0) continue;
        const tf = (a.match(/\btransform="([^"]+)"/) || [])[1] || '';
        out.push({ d: d, tf: tf });
    }
    return { viewBox: viewBox, glyphs: out };
}

/* Messseite: alle Symbole gestapelt in Originalgroesse, dann getBBox */
const data = {};
ORDER.forEach(function (k) { data[k] = glyphsOf(k); });

const body = ORDER.map(function (k) {
    const g = data[k];
    const ps = g.glyphs.map(function (p) {
        return '<path d="' + p.d + '"' + (p.tf ? ' transform="' + p.tf + '"' : '') + '/>';
    }).join('');
    return '<svg id="m-' + k + '" xmlns="http://www.w3.org/2000/svg" viewBox="' + g.viewBox +
        '" width="300" height="300"><g class="g">' + ps + '</g></svg>';
}).join('');

const page = '<!doctype html><meta charset="utf-8"><body>' + body +
    '<pre id="out"></pre><script>' +
    'window.addEventListener("load",function(){' +
    'var res=[];' +
    'document.querySelectorAll("svg").forEach(function(svg){' +
    'var g=svg.querySelector("g");' +
    'var bb=g.getBBox();' +
    'var vb=svg.viewBox.baseVal;' +
    'res.push([svg.id.slice(2),vb.width,bb.x,bb.y,bb.width,bb.height].join(","));' +
    '});' +
    'document.getElementById("out").textContent=res.join("\\n");' +
    '});' +
    '</script>';

const tmp = path.join(outDir, 'fit-calc.html');
fs.writeFileSync(tmp, page, 'utf8');

const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browser = candidates.find(function (p) { return fs.existsSync(p); });
const dom = execFileSync(browser, ['--headless=new', '--disable-gpu', '--window-size=900,900',
    '--virtual-time-budget=3000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const mm = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
const lines = (mm ? mm[1] : '').split('\n').filter(Boolean);
if (!lines.length) { console.error('keine Messwerte'); process.exit(1); }

/* Zielraum: Innenraute im 579er-Rahmen */
const IN_MIN = 50.939;
const IN_MAX = 527.821;
const C = 289.38;
const BOX = 434;               /* verfuegbare Kantenlaenge der Innenraute */

// Facts brauchen x/y im Originalraum
console.log('key          vb    x       y       w       h      Mitte dx/dy   k(auf 579)  s(auf Innenraute)');
const facts = [];
lines.forEach(function (l) {
    const p = l.split(',');
    const key = p[0];
    const vb = +p[1], x = +p[2], y = +p[3], w = +p[4], h = +p[5];
    const cx = x + w / 2, cy = y + h / 2;
    const k = 579 / vb;
    const mx = cx * k, my = cy * k;
    const mw = w * k, mh = h * k;
    const s = BOX / Math.max(mw, mh);
    const f = function (n) { return (Math.round(n * 100) / 100).toString(); };
    console.log(key.padEnd(11), String(vb).padEnd(5),
        f(x).padStart(7), f(y).padStart(7), f(w).padStart(7), f(h).padStart(7),
        (f(mx - C) + '/' + f(my - C)).padStart(14),
        f(k).padStart(11), f(s).padStart(17));
    facts.push({ key: key, vb: vb, k: k, x: x, y: y, cx: cx, cy: cy, w: mw, h: mh, s: s });
});

console.log('\nVorschlag PIC_FIT (Symbol mittig + auf Innenraute normiert):');
facts.forEach(function (f) {
    /* Symbol mit Faktor s skalieren und seine Mitte auf C legen.
       dx/dy sind die Verschiebung NACH der Skalierung, bezogen auf den
       Nullpunkt des Originalraums (wie in picGroup verwendet). */
    const scale = 434 / Math.max(f.w, f.h);
    /* Mitte im Originalraum (unskaliert), danach auf 579 normiert */
    const mx = (f.x + f.w / 2) * f.k;
    const my = (f.y + f.h / 2) * f.k;
    console.log('    ' + (f.key + ':').padEnd(13) + '{ s: ' + scale.toFixed(3) +
        ', mx: ' + mx.toFixed(2) + ', my: ' + my.toFixed(2) + ' }');
});
