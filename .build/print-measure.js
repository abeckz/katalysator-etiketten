/*
 * Prüft die Druck-Geometrie: löst beforeprint aus (setzt zoom = 1) und misst
 * danach Blatt, Etiketten und Innenbereiche in mm.
 *   node .build/print-measure.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<pre id="pm-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  window.dispatchEvent(new Event("beforeprint"));',
    '  setTimeout(function () {',
    '    var out = [];',
    '    var PX = 96 / 25.4;',
    '    var mm = function (px) { return Math.round((px / PX) * 100) / 100; };',
    '    var show = function (sel) {',
    '      var n = document.querySelector(sel);',
    '      if (!n) { out.push(sel + " FEHLT"); return; }',
    '      var r = n.getBoundingClientRect();',
    '      var cs = getComputedStyle(n);',
    '      out.push(sel + " -> x=" + mm(r.left) + " y=" + mm(r.top) + " w=" + mm(r.width) +',
    '        " h=" + mm(r.height) + " mm (transform=" + cs.transform + ")");',
    '    };',
    '    ["#sheet", ".label[data-index=\\"0\\"]", ".label[data-index=\\"1\\"]",',
    '     ".label[data-index=\\"0\\"] .label__right",',
    '     ".label[data-index=\\"1\\"] .recipient",',
    '     ".label[data-index=\\"0\\"] [data-f=\\"catalyst\\"]"].forEach(show);',
    '    document.getElementById("pm-out").textContent = out.join("\\n");',
    '  }, 250);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'print-measure.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="pm-out">([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    : 'Messung nicht gefunden');
