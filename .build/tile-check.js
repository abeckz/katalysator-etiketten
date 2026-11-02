/*
 * Build-Hilfsskript (nicht Teil der App): prueft die in der App hinterlegten
 * GHS-Daten – ohne Browser, direkt aus der HTML-Datei.
 *   node .build/tile-check.js
 *
 * Geprueft wird je Piktogramm:
 *   overlay -> Raute vorhanden, deckendes Weiss und roter Rand?
 *   paths   -> Symbol vorhanden, deckend schwarz (kein currentColor)?
 *   viewBox -> zum Original passend?
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'katalysator-etiketten.html'), 'utf8');

const ORDER = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];
const EXPECT = {
    explos: { vb: 579, paths: 1 }, flamme: { vb: 579, paths: 1 },
    rondflam: { vb: 579, paths: 1 }, bottle: { vb: 579, paths: 1 },
    acid: { vb: 735, paths: 20 }, skull: { vb: 735, paths: 1 },
    exclam: { vb: 5790, paths: 1 }, silhouette: { vb: 919, paths: 1 },
    pollu: { vb: 735, paths: 2 }
};

/* Eintraege aus dem GHS-Array lesen */
const block = html.slice(html.indexOf('const GHS = ['), html.indexOf('const GHS_BY_KEY'));
const re = /\{ key: '([^']+)',[\s\S]*?viewBox: '([^']+)',[\s\S]*?paths: (\[[\s\S]*?\]),\s*overlay: (\[[\s\S]*?\])\s*\}/g;
let m;
const rows = [];
while ((m = re.exec(block))) {
    rows.push({ key: m[1], viewBox: m[2], paths: JSON.parse(m[3]), overlay: JSON.parse(m[4]) });
}

const norm = function (f) { return String(f || '').trim().toLowerCase(); };
const isWhite = function (f) { return ['#fff', '#ffffff', 'white'].indexOf(norm(f)) >= 0; };
const isRed = function (f) { return ['#f00', '#ff0000', 'red'].indexOf(norm(f)) >= 0; };
const isBlack = function (f) { return ['#000', '#000000', 'black'].indexOf(norm(f)) >= 0; };

let fails = 0;
console.log('key          raute  weiss  rot  symbol  deckend  viewBox  status');
ORDER.forEach(function (key) {
    const row = rows.find(function (r) { return r.key === key; });
    if (!row) { console.log(key.padEnd(12), 'FEHLT'); fails++; return; }
    const white = row.overlay.filter(function (p) { return isWhite(p.fill); }).length;
    const red = row.overlay.filter(function (p) { return isRed(p.fill); }).length;
    const black = row.paths.filter(function (p) { return isBlack(p.fill); }).length;
    const transp = row.paths.concat(row.overlay).filter(function (p) {
        return /opacity/i.test(JSON.stringify(p)) || /currentcolor/i.test(String(p.fill));
    }).length;
    const vb = Number(String(row.viewBox).split(/\s+/).pop());
    const exp = EXPECT[key];
    const ok = white >= 1 && red >= 1 && row.paths.length === exp.paths &&
        black === row.paths.length && transp === 0 && vb === exp.vb;
    if (!ok) fails++;
    console.log(key.padEnd(12),
        String(row.overlay.length).padEnd(6), String(white).padEnd(6),
        String(red).padEnd(4), String(row.paths.length).padEnd(7),
        String(transp === 0 ? 'ja' : 'NEIN').padEnd(8),
        String(vb).padEnd(8), ok ? 'OK' : 'PRUEFEN');
});
console.log(fails === 0
    ? '\nAlle neun Rauten: deckendes Weiss, roter Rand, Symbol deckend schwarz – nichts durchscheinend.'
    : '\n' + fails + ' Raute(n) auffaellig.');
process.exit(fails === 0 ? 0 : 1);
