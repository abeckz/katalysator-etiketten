/*
 * Build-Hilfsskript: listet die Transform-Angaben der Glyphen-Pfade je
 * Piktogramm auf (Hilfe bei der Maßstabsprüfung).
 *   node .build/transforms.js
 */
const fs = require('fs');
const path = require('path');

const data = require('./ghs-paths.json');
const srcDir = path.join(__dirname, '..', '.ghs');

for (const key of Object.keys(data.pictograms)) {
    const p = data.pictograms[key];
    const raw = fs.readFileSync(path.join(srcDir, key + '.svg'), 'utf8');
    const m = raw.match(/transform="([^"]*)"/);
    const inApp = p.paths.filter((g) => g.transform).map((g) => g.transform);
    console.log(key.padEnd(11) + 'viewBox ' + p.viewBox.padEnd(12) +
        'datei: ' + (m ? m[1] : '-') + '   app: ' + (inApp.length ? inApp.join(' | ') : '-'));
}
