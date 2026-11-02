/*
 * Build-Hilfsskript (nicht Teil der App): passives Rendering der GHS-SVGs.
 *   node .build/render-check.js pictogram   -> rendert ALLE Ebenen (weiß, rot, Glyphe) in Einzel-PNGs
 *   node .build/render-check.js shipped     -> rendert den in der App ausgelieferten Rahmen + Glyphen
 * Ergebnis: .build/out/*.png zur Sichtprüfung.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const data = require('./ghs-paths.json');
const srcDir = path.join(__dirname, '..', '.ghs');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

function render(name, svg, size) {
    const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}svg{display:block;width:' + size + 'px;height:' + size + 'px}</style>' + svg;
    const file = path.join(outDir, name + '.html');
    fs.writeFileSync(file, html, 'utf8');
    const png = path.join(outDir, name + '.png');
    const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=' + size + ',' + size, '--screenshot=' + png, 'file:///' + file.replace(/\\/g, '/')], { encoding: 'utf8' });
    if (!fs.existsSync(png)) throw new Error('Render fehlgeschlagen: ' + name + '\n' + (res.stderr || ''));
    return png;
}

const mode = process.argv[2] || 'both';
const size = Number(process.argv[3] || 120);

if (mode === 'pictogram') {
    for (const key of Object.keys(data.pictograms)) {
        const p = data.pictograms[key];
        const raw = fs.readFileSync(path.join(srcDir, key + '.svg'), 'utf8');
        const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + p.viewBox + '">' + inner + '</svg>';
        console.log('rendered', key, render('pictogram-' + key, svg, size));
    }
}

if (mode === 'shipped') {
    const frame = '<path d="' + data.frames['735'] + '" fill="#f00"/><path d="m367.5 670.3-302.8-302.8 302.8-302.8 302.8 302.8z" fill="#fff"/>';
    for (const key of ['acid', 'skull', 'pollu']) {
        const p = data.pictograms[key];
        const glyphs = p.paths.map((g) => '<path d="' + g.d + '" fill="' + g.fill + '"' + (g.transform ? ' transform="' + g.transform + '"' : '') + '/>').join('');
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + p.viewBox + '">' + frame + glyphs + '</svg>';
        console.log('rendered', 'shipped-' + key, render('shipped-' + key, svg, size));
    }
}
