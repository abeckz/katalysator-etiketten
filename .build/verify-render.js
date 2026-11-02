/*
 * Vergleichsrenderer: zeigt jedes offizielle SVG einmal UNVERAENDERT
 * (nur Inline-SVG, keine Transformation) auf farbigem Untergrund, damit
 * durchscheinende Stellen sichtbar werden.
 *   node .build/verify-render.js
 * Ausgabe: .build/out/verify.png
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const srcDir = path.join(__dirname, '..', '.ghs-official');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const ORDER = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];

const cells = ORDER.map(function (key) {
    const svg = fs.readFileSync(path.join(srcDir, key + '.svg'), 'utf8')
        .replace(/<\?xml[^>]*\?>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
    return '<figure>' +
        '<div class="pic">' + svg + '</div>' +
        '<figcaption>' + key + '</figcaption>' +
        '</figure>';
}).join('');

const html = '<!doctype html><meta charset="utf-8"><style>' +
    'body{margin:0;background:#fff;font:13px/1.4 system-ui,sans-serif;padding:16px}' +
    '.grid{display:grid;grid-template-columns:repeat(3,240px);gap:18px}' +
    /* Magenta-Untergrund: alles, was nicht deckend weiss ist, wird sichtbar */
    '.pic{width:240px;height:240px;background:linear-gradient(45deg,#f0f 0 50%,#0cc 50% 100%);' +
    'background-size:20px 20px;display:grid;place-items:center}' +
    '.pic svg{width:100%;height:100%;display:block}' +
    'figcaption{text-align:center;margin-top:6px;font-weight:600}' +
    '</style><div class="grid">' + cells + '</div>';

const htmlPath = path.join(outDir, 'verify.html');
fs.writeFileSync(htmlPath, html, 'utf8');

const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browser = candidates.find(function (p) { return fs.existsSync(p); });
if (!browser) { console.error('Kein Chrome/Edge gefunden'); process.exit(1); }

const png = path.join(outDir, 'verify.png');
execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--window-size=820,1000',
    '--screenshot=' + png,
    'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'ignore' });
console.log('geschrieben:', png);
