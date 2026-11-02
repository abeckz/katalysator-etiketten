/*
 * Korrigiert den GHS07-Eintrag (exclam): der Glyphen-Pfad liegt im
 * 5790er-Koordinatensystem, der Rahmen im 579er-System.
 * Skaliert alle Pfad-Koordinaten um 0.1 und setzt viewBox auf '0 0 579 579'.
 * Idempotent: läuft nur, wenn viewBox noch '0 0 5790 5790' ist.
 *   node .build/fix-exclam.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
const lines = fs.readFileSync(file, 'utf8').split('\n');

const idx = lines.findIndex((l) => l.includes("key: 'exclam'"));
if (idx < 0) {
    console.log('exclam-Eintrag nicht gefunden');
    process.exit(1);
}
if (!lines[idx].includes('0 0 5790 5790')) {
    console.log('Bereits korrigiert – keine Änderung.');
    process.exit(0);
}

const line = lines[idx];
const start = line.indexOf('paths: [');
const end = line.lastIndexOf(']');
const paths = JSON.parse(line.slice(start + 7, end + 1));

const scale = (d) =>
    d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (num) => {
        const v = Math.round(Number(num) * 0.1 * 1000) / 1000;
        return String(v);
    });

paths.forEach((p) => {
    p.d = scale(p.d);
});

const rebuilt = line.slice(0, start) +
    'paths: ' + JSON.stringify(paths) + line.slice(end + 1);
lines[idx] = rebuilt.replace(/0 0 5790 5790/, '0 0 579 579');

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('exclam korrigiert: viewBox 0 0 579 579');
