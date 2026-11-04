/* Hilfsskript: Screenshot der App in 2x-Auflösung (für die Sichtprüfung). */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
const out = path.join(__dirname, 'out', process.argv[2] || 'app-shot.png');
cp.spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=2', '--virtual-time-budget=6000', '--window-size=1100,900',
  '--screenshot=' + out, path.join(root, 'katalysator-etiketten.html')],
{ encoding: 'utf8', maxBuffer: 1 << 28 });
console.log(fs.existsSync(out) ? 'Screenshot: ' + out : 'kein Screenshot');
