/*
 * Screenshot des Stammdateneditors (für die visuelle Abnahme).
 *   node .build/editor-shot.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    document.getElementById("btnSettings").click();',
    '    var o = document.querySelector(".ghs-opt");',
    '    if (o) o.click();',
    '  }, 200);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'editor-shot.html');
fs.writeFileSync(tmp, html, 'utf8');

execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--virtual-time-budget=4000', '--window-size=1280,1000',
    '--screenshot=' + path.join(__dirname, 'out', 'editor.png'),
    'file:///' + tmp.replace(/\\/g, '/')], { encoding: 'utf8' });

console.log('OK  .build/out/editor.png');
