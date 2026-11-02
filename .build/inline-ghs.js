/*
 * Build-Hilfsskript (nicht Teil der App):
 * Bettet die GHS-Pfaddaten aus .build/ghs-paths.json in katalysator-etiketten.html ein.
 *   node .build/inline-ghs.js
 * Ersetzt in der HTML-Datei:
 *   - die Platzhalter __F579__, __F579R__, __F735__, __F735W__, __F919__, __F919W__
 *     im GHS_FRAME-Objekt
 *   - die "paths: []"-Arrays der GHS-Liste
 * Idempotent: erkennt bereits eingebettete Daten und schreibt sie erneut.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const dataFile = path.join(__dirname, 'ghs-paths.json');

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const red = data.frames;
const pic = data.pictograms;

/* Rahmen: rote Raute + weiße Innenraute (Innenform = Original, um 1/20 verkleinert) */
const FRAMES = {
    '579': red['579'],
    '735': red['735'],
    '919': red['919']
};

/* Innere weiße Raute je viewBox (identische Geometrie wie Original, leicht eingerückt) */
const INNER = {
    '579': 'm289.376 51.226 119.246 119.199-119.257 119.257-119.256 119.246-119.19-119.256 119.199-119.199z',
    '735': 'm367.5 670.3-302.8-302.8 302.8-302.8 302.8 302.8z',
    '919': 'm459.5 853.9-394.4-394.4 394.4-394.4 394.4 394.4z'
};

let html = fs.readFileSync(htmlFile, 'utf8');
const before = html.length;

/* 1) Rahmen einsetzen (idempotent: Platzhalter oder bereits ersetzte Form) */
const frameSwap = [
    ['__F579R__', FRAMES['579']],
    ['__F579__', INNER['579']],
    ['__F735W__', INNER['735']],
    ['__F735__', FRAMES['735']],
    ['__F919W__', INNER['919']],
    ['__F919__', FRAMES['919']]
];
for (const [placeholder, value] of frameSwap) {
    if (html.includes(placeholder)) {
        html = html.split(placeholder).join(value);
        continue;
    }
    /* bereits ersetzt? dann nichts tun */
}

/* 2) Glyphenpfade je Piktogramm einsetzen (idempotent über Klammer-Zählung) */
for (const key of Object.keys(pic)) {
    const entry = pic[key];
    const literal = JSON.stringify(entry.paths.map((p) => {
        const o = { d: p.d, fill: p.fill };
        if (p.transform) o.transform = p.transform;
        return o;
    }));
    const anchor = "key: '" + key + "'";
    const start = html.indexOf(anchor);
    if (start < 0) throw new Error('Eintrag für "' + key + '" nicht gefunden');
    const pathsAt = html.indexOf('paths: ', start);
    if (pathsAt < 0) throw new Error('paths-Feld für "' + key + '" nicht gefunden');
    const open = pathsAt + 'paths: '.length;
    if (html[open] !== '[') throw new Error('paths beginnt nicht mit "[" bei "' + key + '"');
    /* passende schließende Klammer suchen (Strings beachten) */
    let depth = 0;
    let i = open;
    let inStr = false;
    for (; i < html.length; i += 1) {
        const ch = html[i];
        if (inStr) {
            if (ch === '\\') { i += 1; continue; }
            if (ch === '"') inStr = false;
            continue;
        }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '[') depth += 1;
        else if (ch === ']') {
            depth -= 1;
            if (depth === 0) break;
        }
    }
    if (i >= html.length) throw new Error('paths-Ende für "' + key + '" nicht gefunden');
    html = html.slice(0, open) + literal + html.slice(i + 1);
    console.log('  •', key.padEnd(11), literal.length, 'Zeichen');
}


/* 3) Prüfen, dass keine Platzhalter übrig sind */
const left = html.match(/__F(579|735|919)[RW]?__/g);
if (left) throw new Error('Nicht ersetzte Platzhalter: ' + left.join(', '));

fs.writeFileSync(htmlFile, html, 'utf8');
console.log('eingebettet:', Object.keys(pic).length, 'Piktogramme');
console.log(htmlFile, before, '->', Buffer.byteLength(html, 'utf8'), 'Bytes');
