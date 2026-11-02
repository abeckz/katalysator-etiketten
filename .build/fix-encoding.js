/*
 * Build-Hilfsskript: repariert die Zeichenkodierung der HTML-Datei.
 * Wurde die Datei als UTF-8 gelesen, obwohl sie Windows-1252 war, entstehen
 * Mojibake-Folgen. Dann wird der umgekehrte Weg gegangen.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
const raw = fs.readFileSync(file);
const text = raw.toString('utf8').replace(/^\uFEFF/, '');

const mojibake = /Ã¤|Ã¶|Ã¼|Ã„|Ã–|Ãœ|ÃŸ|â€“|â€ž|â€œ|â€¦|Â·/;
console.log('Treffer Mojibake:', (text.match(/Ã|â€/g) || []).length);

function repaired(input) {
    const bytes = Buffer.from(input, 'latin1');
    return bytes.toString('utf8').replace(/^\uFEFF/, '');
}

const fixed = repaired(text);
/* Bereits reparierte Stellen erzeugen kein U+FFFD mehr; die Pruefung gilt
   nur, wenn die Reparatur noch nicht angewendet wurde. */
const bad = mojibake.test(fixed) ? fixed.indexOf('\uFFFD') : -1;

if (bad >= 0) {
    /* Stellen mit ungueltigen Bytes sammeln (max. 12 Kontexte) */
    const spots = [];
    let i = fixed.indexOf('\uFFFD');
    while (i >= 0 && spots.length < 12) {
        spots.push(fixed.slice(Math.max(0, i - 60), i + 30));
        i = fixed.indexOf('\uFFFD', i + 1);
    }
    fs.writeFileSync(path.join(__dirname, 'out', 'encoding-spots.json'),
        JSON.stringify(spots, null, 1), 'utf8');
    console.log('  Ungueltige Stellen:', spots.length);
    console.log('  Beispiel:', JSON.stringify(spots[0]));
}

if (mojibake.test(text) && bad < 0) {
    fs.writeFileSync(file, fixed, 'utf8');
    console.log('Kodierung repariert -> UTF-8 ohne Mojibake.');
    console.log('Länge:', fixed.length, 'Zeichen');
    console.log('Probe:', (fixed.match(/Ausbaudatum[^<]{0,24}/) || ['-'])[0]);
} else {
    if (bad >= 0) {
        /* Kontext der ersten ungueltigen Stelle ausgeben */
        console.log('  Kontext:', JSON.stringify(fixed.slice(Math.max(0, bad - 70), bad + 50)));
    }
    console.log('Keine Reparatur nötig (Mojibake:', mojibake.test(text), ', bad:', bad, ')');
}
