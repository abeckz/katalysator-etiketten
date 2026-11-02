/*
 * Build-Hilfsskript (nicht Teil der App): misst die Bounding-Box der
 * Glyphen-Pfade direkt im Quell-viewBox-Raum (ohne eine Transformation der
 * App). Grundlage für die Normalisierung der Pfaddaten.
 *   node .build/probe-bbox.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghs-paths.json'), 'utf8'));
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const svgs = Object.keys(data.pictograms).map((key) => {
    const p = data.pictograms[key];
    const body = p.paths.map((g) => '<path d="' + g.d + '"' +
        (g.transform ? ' transform="' + g.transform + '"' : '') + '/>').join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" id="s-' + key + '" viewBox="' +
        p.viewBox.replace(/0 0 5790 5790/, '0 0 579 579') + '">' + body + '</svg>';
}).join('\n');

const probe = '<div style="position:absolute;left:-9999px">' + svgs + '</div>\n' +
    '<pre id="bb-out"></pre>\n<script>\n' +
    'window.addEventListener("load", function () {\n' +
    '  var out = [];\n' +
    '  document.querySelectorAll("svg[id^=\\"s-\\"]").forEach(function (svg) {\n' +
    '    var b = svg.getBBox();\n' +
    '    out.push([svg.id.slice(2), b.x.toFixed(1), b.y.toFixed(1), b.width.toFixed(1), b.height.toFixed(1)].join(","));\n' +
    '  });\n' +
    '  document.getElementById("bb-out").textContent = out.join("\\n");\n' +
    '});\n</script>\n';

const tmp = path.join(outDir, 'probe-bbox.html');
fs.writeFileSync(tmp, '<!doctype html><meta charset="utf-8"><body>' + probe + '</body>', 'utf8');
const dom = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--window-size=800,600',
    '--virtual-time-budget=3000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '';
const m = dom.match(/<pre id="bb-out">([\s\S]*?)<\/pre>/);
console.log(m ? m[1] : 'FAIL');
