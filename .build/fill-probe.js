/*
 * Build-Hilfsskript (nicht Teil der App): füllt alle Felder mit Beispielwerten
 * und erzeugt Screenshot (Bildschirm) + Druck-PDF, um die C-Klammern zu prüfen.
 *   node .build/fill-probe.js
 * Ergebnis: .build/out/fill-screen.png, fill.pdf, fill-print.png
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const inject = [
  '<script>',
  'window.addEventListener("load", function () {',
  '  window.setTimeout(function () {',
  '    function s(sel, v) {',
  '      var n = document.querySelector(sel); n.value = v;',
  '      n.dispatchEvent(new Event("input", { bubbles: true }));',
  '      n.dispatchEvent(new Event("change", { bubbles: true }));',
  '    }',
  '    s("#fFurnace", "K-08");',
  '    s("#fProduction", "Charge BF-01");',
  '    s("#fExtra1", "AUS OFEN");',
  '    s("#fExtra2", "C100");',
  '  }, 400);',
  '});',
  '</script>'
].join('\n');

const probeFile = path.join(outDir, 'fill-probe.html');
fs.writeFileSync(probeFile,
  fs.readFileSync(htmlFile, 'utf8').replace('</body>', inject + '\n</body>'), 'utf8');

const url = 'file:///' + probeFile.replace(/\\/g, '/');
for (const [name, args] of [
  ['fill-screen.png', ['--window-size=1400,1000', '--screenshot=' + path.join(outDir, 'fill-screen.png')]],
  ['fill.pdf', ['--window-size=794,1123', '--print-to-pdf=' + path.join(outDir, 'fill.pdf')]]
]) {
  spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=1', '--virtual-time-budget=6000', ...args, url], { encoding: 'utf8' });
  console.log((fs.existsSync(path.join(outDir, name)) ? 'OK  ' : 'FAIL') + '  ' + name);
}

/* Druckansicht als Screenshot: CSS-Medienemulation „print“ aktivieren
   (--blink-settings=mediaType=print), sonst zeigt Chrome die Bildschirmansicht.
   Zusätzlich ein 1:1-Ausschnitt des Label-Kopfs (--zoom = 1), damit die
   Klammerformen in Originalgröße beurteilbar sind. */
const shotFile = path.join(outDir, 'fill-print.png');
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=1', '--virtual-time-budget=8000',
  '--blink-settings=mediaType=print', '--window-size=794,1123',
  '--screenshot=' + shotFile, url], { encoding: 'utf8' });
console.log((fs.existsSync(shotFile) ? 'OK  ' : 'FAIL') + '  fill-print.png');

const cropFile = path.join(outDir, 'fill-head.png');
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--force-device-scale-factor=2', '--virtual-time-budget=8000',
  '--blink-settings=mediaType=print', '--window-size=620,470',
  '--screenshot=' + cropFile, url], { encoding: 'utf8' });
console.log((fs.existsSync(cropFile) ? 'OK  ' : 'FAIL') + '  fill-head.png (1:1-Ausschnitt)');

/* PDF: genau eine A4-Seite? */
try {
  const pdf = fs.readFileSync(path.join(outDir, 'fill.pdf'), 'latin1');
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log('PDF-Seiten: ' + pages + (pages === 1 ? ' (OK)' : ' (FEHLER)'));
} catch (e) {
  console.log('PDF nicht lesbar: ' + e.message);
}
