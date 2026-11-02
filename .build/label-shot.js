/*
 * Build-Hilfsskript (nicht Teil der App): rendert das Etikett der App mit
 * ausgewaehlten GHS-Symbolen, damit die Rauten im echten Druckkontext
 * geprueft werden koennen (weisser Hintergrund, Groesse, Lage).
 *   node .build/label-shot.js
 * Ergebnis: .build/out/label-ghs.png
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const src = path.join(root, 'katalysator-etiketten.html');

/* Alle neun Symbole auswaehlen, damit jede Raute einmal sichtbar ist. */
const keys = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];

const probe = [
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    /* Editor oeffnen und alle GHS-Optionen anklicken */',
    '    document.getElementById("btnSettings").click();',
    '    var keys = ' + JSON.stringify(keys) + ';',
    '    keys.forEach(function (k) {',
    '      var el = document.querySelector(\'.ghs-opt[data-key="\' + k + \'"]\');',
    '      if (el && !el.classList.contains("is-active") && !el.disabled) el.click();',
    '    });',
    '    /* Dialog schliessen, damit nur das Etikett zu sehen ist */',
    '    setTimeout(function () {',
    '      if (document.getElementById("btnEditorCancel")) document.getElementById("btnEditorCancel").click();',
    '      document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });',
    '    }, 400);',
    '  }, 200);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(outDir, 'label-shot.html');
fs.writeFileSync(tmp, html, 'utf8');

const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browser = candidates.find(function (p) { return fs.existsSync(p); });
if (!browser) { console.error('Kein Chrome/Edge gefunden'); process.exit(1); }

const png = path.join(outDir, 'label-ghs.png');
execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--virtual-time-budget=5000',
    '--window-size=1100,900', '--screenshot=' + png,
    'file:///' + tmp.replace(/\\/g, '/')], { encoding: 'utf8' });

console.log('OK  ' + png);
