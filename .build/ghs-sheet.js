/*
 * Build-Hilfsskript (nicht Teil der App): rendert die neun Piktogramme als
 * Kontaktbogen (.build/out/ghs-sheet.png) und je Symbol als Einzelbild
 * (.build/out/sym-<key>.png) zur Sichtpruefung.
 *   node .build/ghs-sheet.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghs-paths.json'), 'utf8'));

function pathsMarkup(list) {
    return list.map(function (p) {
        return '<path d="' + p.d + '" fill="' + p.fill + '"' +
            (p.rule ? ' fill-rule="' + p.rule + '"' : '') + '/>';
    }).join('');
}
function tile(g, size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 579 579" width="' + size +
        '" height="' + size + '">' + pathsMarkup(data.frames) + pathsMarkup(g.paths) + '</svg>';
}
function shot(svg, file) {
    const svgFile = file.replace(/\.png$/, '.svg');
    fs.writeFileSync(svgFile, svg, 'utf8');
    spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--default-background-color=ffffff',
        '--screenshot=' + file, 'file:///' + svgFile.replace(/\\/g, '/')], { encoding: 'utf8' });
    console.log('OK  ' + path.basename(file));
}

/* Kontaktbogen: 3 x 3 Rauten */
const cell = 200;
const cols = 3;
const rows = Math.ceil(data.pictograms.length / cols);
let sheet = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (cell * cols) + '" height="' + (cell * rows) +
    '"><rect width="100%" height="100%" fill="#fff"/>';
data.pictograms.forEach(function (g, i) {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    sheet += '<g transform="translate(' + x + ',' + y + ')">' + tile(g, cell) + '</g>' +
        '<text x="' + (x + 8) + '" y="' + (y + 18) + '" font-family="sans-serif" font-size="13" fill="#333">' +
        g.code + ' ' + g.key + '</text>';
});
sheet += '</svg>';
shot(sheet, path.join(outDir, 'ghs-sheet.png'));
console.log('Bogen:', cell * cols, 'x', cell * rows);

/* Einzelbilder */
data.pictograms.forEach(function (g) {
    shot(tile(g, 500), path.join(outDir, 'sym-' + g.key + '.png'));
});
