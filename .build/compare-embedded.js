/*
 * Wegwerf-Pruefung: vergleicht die in die App eingebetteten GHS-Glyphen
 * Zeichen fuer Zeichen mit den offiziellen Originalen in .ghs-official/.
 *   node .build/compare-embedded.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'katalysator-etiketten.html'), 'utf8');
const FILES = {
    explos: 'explos.svg', flamme: 'flamme.svg', rondflam: 'rondflam.svg',
    bottle: 'bottle.svg', acid: 'acid.svg', skull: 'skull.svg',
    exclam: 'exclam.svg', silhouette: 'silhouette.svg', pollu: 'pollu.svg'
};

/* Original: alle Glyphenpfade (ohne weisse Flaeche, ohne roten Rahmen) */
function officialGlyphs(file) {
    const svg = fs.readFileSync(path.join(root, '.ghs-official', file), 'utf8');
    const out = [];
    const re = /<path[^>]*\/?>/g;
    let m;
    while ((m = re.exec(svg))) {
        const tag = m[0];
        const d = (tag.match(/\sd="([^"]+)"/) || [])[1];
        if (!d) continue;
        const fill = ((tag.match(/fill:\s*([^;"]+)/) || tag.match(/fill="([^"]+)"/) || [])[1] || '').trim().toLowerCase();
        if (fill === '#fff' || fill === '#ffffff' || fill === 'red' || fill === '#f00' || fill === '#ff0000') continue;
        out.push(d);
    }
    return out;
}

/* App: paths-Array je Schluessel aus der HTML holen */
function embedded(key) {
    const anchor = "key: '" + key + "'";
    const i = html.indexOf(anchor);
    if (i < 0) return null;
    const p = html.indexOf('paths: [', i);
    if (p < 0) return null;
    let depth = 0, j = p + 7, inStr = false;
    for (; j < html.length; j += 1) {
        const ch = html[j];
        if (inStr) { if (ch === '\\') { j += 1; continue; } if (ch === '"') inStr = false; continue; }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '[') depth += 1;
        else if (ch === ']') { depth -= 1; if (depth === 0) break; }
    }
    try { return JSON.parse(html.slice(p + 7, j + 1)); } catch (e) { return { error: e.message }; }
}

console.log('Schluessel    Original-Pfade  App-Pfade  identisch?');
Object.keys(FILES).forEach(function (key) {
    const off = officialGlyphs(FILES[key]);
    const emb = embedded(key);
    if (!emb || emb.error) { console.log(key.padEnd(13), String(off.length).padEnd(15), 'FEHLER'); return; }
    const embD = emb.map(function (p) { return p.d; });
    const same = off.length === embD.length && off.every(function (d, i) {
        return d.replace(/\s+/g, ' ') === String(embD[i]).replace(/\s+/g, ' ');
    });
    /* erste Abweichung benennen */
    let note = same ? 'ja' : 'NEIN';
    if (!same) {
        for (let i = 0; i < Math.max(off.length, embD.length); i += 1) {
            const a = (off[i] || '').replace(/\s+/g, ' ');
            const b = String(embD[i] || '').replace(/\s+/g, ' ');
            if (a !== b) {
                /* Position der ersten Abweichung */
                let k = 0;
                while (k < a.length && k < b.length && a[k] === b[k]) k += 1;
                note = 'NEIN (Pfad ' + i + ', Zeichen ' + k + ')';
                break;
            }
        }
    }
    console.log(key.padEnd(13), String(off.length).padEnd(15), String(embD.length).padEnd(10), note);
});
