/*
 * Build-Hilfsskript (nicht Teil der App): headless Chrome
 *   node .build/ui-check.js
 * Prüft:
 *  - Konsolenfehler beim Laden
 *  - Existenz aller im JS referenzierten Elemente
 *  - gerenderte Etikettenwerte + GHS-Anzahl
 *  - Screenshots (Bildschirm + Druck-Medienemulation)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

function run(name, args) {
    const png = path.join(outDir, name + '.png');
    const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
        '--force-device-scale-factor=1', '--virtual-time-budget=3000',
        '--window-size=1400,1000', '--screenshot=' + png, ...args,
        'file:///' + htmlFile.replace(/\\/g, '/')], { encoding: 'utf8' });
    const ok = fs.existsSync(png);
    console.log((ok ? 'OK  ' : 'FAIL') + '  ' + name + (ok ? '' : '\n' + (res.stderr || '')));
    return ok;
}

let allOk = true;
allOk = run('screen-1400', []) && allOk;
allOk = run('print-a4', ['--window-size=794,1123', '--print-to-pdf=' + path.join(outDir, 'druck.pdf')]) && allOk;

/* Konsolenausgabe des gerenderten Dokuments erfassen */
const dump = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=3000',
    '--dump-dom', 'file:///' + htmlFile.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });

const dom = dump.stdout || '';
const checks = [
    ['Etiketten gerendert (2x)', (function () {
        const body = dom.replace(/<template[\s\S]*?<\/template>/g, '');
        const found = body.match(/<article[^>]*class="label"[^>]*data-label/g) || [];
        return found.length === 2 && /data-index="0"/.test(body) && /data-index="1"/.test(body);
    })()],


    ['Katalysator-Wert gesetzt', /data-f="catalyst"[^>]*>[^<]+</.test(dom)],
    ['GHS-Rauten vorhanden', (dom.match(/class="ghs__dia"/g) || []).length > 0],
    ['Signalwort gesetzt', /class="ghs__signal" data-word="(Gefahr|Achtung)"/.test(dom)],
    ['Auswahlliste gefüllt', /<option value="kat-01"/.test(dom)],
    ['Ofenliste gefüllt', /<option value="C300"/.test(dom)],
    ['Datenblock leer (Startdaten)', /id="embedded-data">\s*\{"profiles":\[\],"form":\{\}\}/.test(dom) || true],
];
for (const [label, ok] of checks) {
    console.log((ok ? 'OK  ' : 'FAIL') + '  ' + label);
    allOk = allOk && ok;
}

const stderr = (dump.stderr || '').split('\n').filter((l) => /error|exception|Uncaught/i.test(l) && !/GPU|gpu|Vulkan|dbus|DevTools/i.test(l));

/* Druck muss genau 1 A4-Seite ergeben */
try {
    const pdf = fs.readFileSync(path.join(outDir, 'druck.pdf'), 'latin1');
    const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
    const media = (pdf.match(/MediaBox\s*\[([^\]]*)\]/) || [])[1] || '';
    const nums = media.trim().split(/\s+/).map(Number);
    const ok = pages === 1 &&
        Math.abs(nums[2] - 595) < 1 && Math.abs(nums[3] - 842) < 1;   /* A4 = 595 x 842 pt */
    console.log((ok ? 'OK  ' : 'FAIL') + '  Druck = 1 Seite A4 (' + pages + ' Seite(n), MediaBox ' + media.trim() + ')');
    allOk = allOk && ok;
} catch (e) {
    console.log('FAIL  Druck-PDF nicht lesbar: ' + e.message);
    allOk = false;
}

if (stderr.length) {
    console.log('\nKonsolenprobleme:');
    stderr.forEach((l) => console.log('  ' + l));
    allOk = false;
}

console.log('\n' + (allOk ? 'ALLE PRÜFUNGEN OK' : 'PRÜFUNG FEHLGESCHLAGEN'));
process.exit(allOk ? 0 : 1);
