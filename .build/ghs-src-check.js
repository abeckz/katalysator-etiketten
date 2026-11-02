/*
 * Build-Hilfsskript (nicht Teil der App): vergleicht die eingebetteten
 * GHS-Pfade mit den Quelldateien in .ghs/ (nur Info, kein Test).
 *   node .build/ghs-src-check.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'katalysator-etiketten.html'), 'utf8');
const srcDir = path.join(root, '.ghs');

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.svg'))) {
    const key = file.replace(/\.svg$/, '');
    const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const ds = [...raw.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
    /* Symbolpfade sind die ohne fill (Rahmen tragen fill="#f00"/"#fff") */
    const glyphs = ds.filter((d) => !/^m4\d\d|^m36\d/.test(d.slice(0, 12)) || ds.indexOf(d) > 1);
    const own = ds.slice(2);
    const status = own.map((d) => {
        const head = d.slice(0, 40);
        return html.includes(head) ? 'identisch' : 'ABWEICHEND';
    });
    console.log(key.padEnd(11) + own.length + ' Pfad(e): ' + status.join(', '));
    void glyphs;
}
