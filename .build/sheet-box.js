/*
 * Debug-Hilfe: gibt die tatsächliche Geometrie von `.sheet` (inkl. der
 * CSS-Transformation) und der Vorschau-Fläche aus, damit „Blatt wird
 * abgeschnitten“ sauber von „Messfehler“ getrennt werden kann.
 *   node .build/sheet-box.js [Breite] [Höhe] [--shot name]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const W = Number(args[0] || 1100);
const H = Number(args[1] || 760);
const shotIdx = process.argv.indexOf('--shot');
const shotName = shotIdx > 0 ? process.argv[shotIdx + 1] : '';

const probe = [
    '<pre id="sb-out" style="position:fixed;right:0;top:0;z-index:9999;'
    + 'font:11px/1.3 monospace;color:#0f0;background:#000;padding:4px;margin:0;white-space:pre"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    var sheet = document.getElementById("sheet");',
    '    var stage = document.querySelector(".sheet-stage");',
    '    var fit = document.querySelector(".sheet-fit");',
    '    var cs = getComputedStyle(sheet);',
    '    var vis = sheet.getBoundingClientRect();',
    '    var st = stage.getBoundingClientRect();',
    '    var o = [];',
    '    o.push("stage " + Math.round(st.width) + "x" + Math.round(st.height));',
    '    o.push("sheet layout " + cs.width + " x " + cs.height +',
    '      "  transform=" + cs.transform);',
    '    o.push("sheet offsetW/H " + sheet.offsetWidth + "x" + sheet.offsetHeight);',
    '    o.push("sheet sichtbar " + Math.round(vis.width) + "x" + Math.round(vis.height) +',
    '      " @" + Math.round(vis.left) + "," + Math.round(vis.top));',
    '    o.push("passt? breite=" + (vis.width <= st.width - 20) +',
    '      " hoehe=" + (vis.height <= st.height - 20));',
    '    o.push("fitBox " + Math.round(fit.getBoundingClientRect().width) + "x" +',
    '      Math.round(fit.getBoundingClientRect().height) + " (stil " +',
    '      getComputedStyle(fit).width + " x " + getComputedStyle(fit).height + ")");',
    '    document.getElementById("sb-out").textContent = o.join("\\n");',
    '  }, 800);',
    '});',
    '</script>'
].join('\n');

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, 'sheet-box.html');
fs.writeFileSync(tmp, fs.readFileSync(src, 'utf8').replace('</body>', probe + '\n</body>'), 'utf8');
console.log('--- ' + W + 'x' + H + ' ---');
const chromeArgs = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=' + W + ',' + H, '--virtual-time-budget=6000', '--dump-dom'
];
if (shotName) chromeArgs.push('--screenshot=' + path.join(outDir, shotName + '.png'));
console.log(execFileSync(chrome, chromeArgs.concat(['file:///' + tmp.replace(/\\/g, '/')]), { encoding: 'utf8' })
    .split('<pre id="sb-out"')[1]
    .split('>')[1].split('</pre>')[0].replace(/&amp;/g, '&'));
if (shotName) console.log('Screenshot: ' + path.join(outDir, shotName + '.png'));
