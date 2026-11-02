/*
 * Build-Hilfsskript: gibt gerendertes GHS-Markup und Geometrie aus.
 *   node .build/measure.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const probe = [
    '<pre id="probe-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  var out = [];',
    '  [".sheet-stage", ".sheet-fit", "#sheet", ".sheet__labels", ".label[data-index=\\"0\\"]",',
    '   ".label[data-index=\\"1\\"]"].forEach(function (sel) {',
    '    var n = document.querySelector(sel);',
    '    if (!n) { out.push(sel + " FEHLT"); return; }',
    '    var r = n.getBoundingClientRect();',
    '    var cs = getComputedStyle(n);',
    '    out.push(sel + " x=" + Math.round(r.left) + " y=" + Math.round(r.top) +',
    '      " w=" + Math.round(r.width) + " h=" + Math.round(r.height) +',
    '      " | css w=" + cs.width + " h=" + cs.height + " tr=" + cs.transform);',
    '  });',
    '  out.push("innerWidth=" + window.innerWidth + " innerHeight=" + window.innerHeight);',
    '  out.push("stage client=" + document.querySelector(".sheet-stage").clientWidth + "x" +',
    '    document.querySelector(".sheet-stage").clientHeight);',
    '  document.getElementById("probe-out").textContent = out.join("\\n");',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'probe.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=3000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="probe-out">([\s\S]*?)<\/pre>/);
console.log(m ? m[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : 'nicht gefunden');
