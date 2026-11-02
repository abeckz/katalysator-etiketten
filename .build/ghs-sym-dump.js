/*
 * Build-Hilfsskript (nicht Teil der App): schreibt je GHS-Symbol eine
 * Einzel-SVG-Datei (nur Glyphen) nach .build/out/sym-<key>.svg und rendert
 * sie als PNG zur Sichtprüfung der Pfaddaten.
 *   node .build/ghs-sym-dump.js
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

const html = fs.readFileSync(htmlFile, 'utf8');
const block = html.match(/const GHS = \[([\s\S]*?)\n  \];/);
if (!block) throw new Error('GHS-Array nicht gefunden');
const list = eval('[' + block[1] + ']');

fs.mkdirSync(outDir, { recursive: true });
for (const g of list) {
    const paths = (g.paths || []).map((p) => {
        const fill = (p.fill && p.fill !== 'currentcolor') ? p.fill : '#000';
        return '<path d="' + p.d + '" fill="' + fill + '"' +
            (p.transform ? ' transform="' + p.transform + '"' : '') + '/>';
    }).join('');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + g.viewBox + '" width="500" height="500">' +
        '<rect x="0" y="0" width="100%" height="100%" fill="#fff"/>' + paths + '</svg>';
    const svgFile = path.join(outDir, 'sym-' + g.key + '.svg');
    const pngFile = path.join(outDir, 'sym-' + g.key + '.png');
    fs.writeFileSync(svgFile, svg, 'utf8');
    spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=500,500',
        '--screenshot=' + pngFile, 'file:///' + svgFile.replace(/\\/g, '/')], { encoding: 'utf8' });
    console.log('OK  ' + pngFile);
}
