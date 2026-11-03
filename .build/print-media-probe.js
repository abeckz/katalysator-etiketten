/*
 * Debug-Hilfe (nicht Teil der App): rendert die Datei mit echter
 * CSS-Medienemulation „print“ (--blink-settings=mediaType=print) und gibt die
 * Geometrie von Dokument, Vorschau und Blatt aus.
 *   node .build/print-media-probe.js [Breite] [Höhe] [--shot name]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const W = Number(args[0] || 794);
const H = Number(args[1] || 1123);
const shotIdx = process.argv.indexOf('--shot');
const shotName = shotIdx > 0 ? process.argv[shotIdx + 1] : '';

const probe = [
    '<pre id="pm-probe" style="position:fixed;left:0;top:0;z-index:99999;'
    + 'font:11px/1.3 monospace;color:#0f0;background:#000;padding:4px;margin:0;'
    + 'white-space:pre;display:none"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    var de = document.documentElement;',
    '    var o = [];',
    '    o.push("medium print? " + window.matchMedia("print").matches);',
    '    o.push("viewport " + window.innerWidth + "x" + window.innerHeight);',
    '    o.push("doc client " + de.clientWidth + "x" + de.clientHeight +',
    '      " scroll " + de.scrollWidth + "x" + de.scrollHeight +',
    '      " overflow " + getComputedStyle(de).overflow + "/" + getComputedStyle(de).overflowY);',
    '    o.push("body client " + document.body.clientWidth + "x" + document.body.clientHeight +',
    '      " scroll " + document.body.scrollWidth + "x" + document.body.scrollHeight);',
    '    [".app-shell", ".workspace", ".preview-wrap", ".sheet-stage", ".sheet-fit", "#sheet"].forEach(function (s) {',
    '      var n = document.querySelector(s);',
    '      if (!n) { o.push(s + " FEHLT"); return; }',
    '      var r = n.getBoundingClientRect();',
    '      var c = getComputedStyle(n);',
    '      o.push(s + " box " + Math.round(r.width) + "x" + Math.round(r.height) +',
    '        " @" + Math.round(r.left) + "," + Math.round(r.top) +',
    '        " ovf=" + c.overflow + "/" + c.overflowY +',
    '        " scroll=" + n.scrollHeight + " display=" + c.display);',
    '    });',
    '    document.getElementById("pm-probe").textContent = o.join("\\n");',
    '  }, 900);',
    '});',
    '</script>'
].join('\n');

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(outDir, 'print-media-probe.html');
fs.writeFileSync(tmp, fs.readFileSync(src, 'utf8').replace('</body>', probe + '\n</body>'), 'utf8');

const chromeArgs = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--force-device-scale-factor=1',
    '--blink-settings=mediaType=print',
    '--window-size=' + W + ',' + H, '--virtual-time-budget=6000', '--dump-dom'
];
if (shotName) chromeArgs.push('--screenshot=' + path.join(outDir, shotName + '.png'));
const dom = execFileSync(chrome, chromeArgs.concat(['file:///' + tmp.replace(/\\/g, '/')]),
    { encoding: 'utf8', maxBuffer: 1 << 28 });
const m = dom.match(/<pre id="pm-probe"[\s\S]*?<\/pre>/);
console.log(m ? m[0].split('>').slice(1).join('>').replace(/<\/pre>$/, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    : 'Probe nicht gefunden');
if (shotName) console.log('Screenshot: ' + path.join(outDir, shotName + '.png'));
