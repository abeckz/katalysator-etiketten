/*
 * Build-Hilfsskript (nicht Teil der App): rendert NUR die fertigen Rauten
 * (ghsTile) in Druckgroesse, ohne Editor drumherum.
 *   node .build/tiles-shot.js
 * Ergebnis: .build/out/tiles.png
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const src = path.join(root, 'katalysator-etiketten.html');
const keys = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];

/* Auf die App-Seite ein Skript haengen, das die Rauten gross darstellt. */
const probe = [
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    var keys = ' + JSON.stringify(keys) + ';',
    '    var wrap = document.createElement("div");',
    '    wrap.setAttribute("id", "tile-shot");',
    '    var st = document.createElement("style");',
    '    st.textContent = "#tile-shot{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;" +',
    '      "padding:12px;overflow:auto;display:grid;grid-template-columns:repeat(3,170px);gap:14px;" +',
    '      "align-content:start;background:repeating-conic-gradient(#f0f 0 25%,#0cc 0 50%) 0 0/22px 22px}" +',
    '      "#tile-shot>div{width:170px;height:170px}" +',
    '      "#tile-shot svg{width:100%!important;height:100%!important;display:block}";',
    '    document.head.appendChild(st);',
    '    keys.forEach(function (k) {',
    '      var cell = document.createElement("div");',
    '      cell.innerHTML = ghsTile(k);',
    '      wrap.appendChild(cell);',
    '    });',
    '    document.body.appendChild(wrap);',
    '    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });',
    '  }, 250);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(outDir, 'tiles.html');
fs.writeFileSync(tmp, html, 'utf8');

const browser = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(function (p) { return fs.existsSync(p); });

const png = path.join(outDir, 'tiles.png');
execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--virtual-time-budget=5000',
    '--window-size=580,620', '--screenshot=' + png,
    'file:///' + tmp.replace(/\\/g, '/')], { encoding: 'utf8' });
console.log('OK  ' + png);
