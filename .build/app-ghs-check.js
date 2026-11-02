/*
 * Prueft, was die App aus den eingebetteten GHS-Daten tatsaechlich erzeugt:
 *   - Rahmen (weisse Innenflaeche + roter Rand) vorhanden?
 *   - Glyphen deckend (#000, ohne opacity)?
 *   - sitzt alles im gleichen Koordinatenraum wie der Rahmen?
 * Zusaetzlich wird ein Kontaktblatt auf farbigem Untergrund gerendert, damit
 * durchscheinende Stellen sichtbar werden.
 *   node .build/app-ghs-check.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(path.join(root, 'katalysator-etiketten.html'), 'utf8');

/* GHS_FRAME aus der App lesen */
const frameBlock = html.slice(html.indexOf('const GHS_FRAME'), html.indexOf('const GHS = ['));
const FRAMES = {};
(frameBlock.match(/'(579|735|919)':\s*'((?:[^'\\]|\\.)*)'/g) || []).forEach(function (s) {
    const k = s.match(/^'([^']+)'/)[1];
    const v = s.slice(s.indexOf(':') + 1).trim().replace(/^'/, '').replace(/',$/, '');
    FRAMES[k] = v.replace(/\\'/g, "'");
});

/* GHS-Eintraege aus der App lesen */
const ghsBlock = html.slice(html.indexOf('const GHS = ['), html.indexOf('const GHS_BY_KEY'));
const entries = [];
const re = /\{ key: '([^']+)',\s*code: '([^']+)',\s*name: '([^']+)',\s*viewBox: '([^']+)',\s*frame: ([^,]+),\s*paths: (\[[\s\S]*?\])(?:,\s*overlay: (\[[\s\S]*?\]))?\s*\}/g;
let m;
while ((m = re.exec(ghsBlock))) {
    entries.push({
        key: m[1], code: m[2], name: m[3],
        viewBox: m[4],
        frame: m[5].trim().replace(/^'|'$/g, ''),
        paths: JSON.parse(m[6]),
        overlay: m[7] ? JSON.parse(m[7]) : null
    });
}

console.log('Eintraege gelesen:', entries.length);
entries.forEach(function (e) {
    const glyphs = e.paths;
    const fills = glyphs.map(function (p) { return p.fill; });
    const withOpacity = glyphs.filter(function (p) {
        return /opacity/i.test(JSON.stringify(p));
    }).length;
    const coloured = fills.filter(function (f) {
        return !/^#0{3}$|^#000000$|black/i.test(f);
    });
    console.log('  ' + e.key.padEnd(11), 'viewBox=' + e.viewBox.padEnd(14),
        'glyphen=' + String(glyphs.length).padEnd(3),
        'fills=' + fills.join(',').padEnd(10),
        'transparenz=' + withOpacity,
        coloured.length ? ('FARBIG: ' + coloured.join(',')) : '');
});

/* Kontaktblatt bauen: Raute (overlay) + Glyphen, in der Original-viewBox */
const cells = entries.map(function (e) {
    const mk = function (p) {
        return '<path d="' + p.d + '" fill="' + p.fill + '"' +
            (p.rule ? ' fill-rule="' + p.rule + '"' : '') +
            (p.transform ? ' transform="' + p.transform + '"' : '') + '/>';
    };
    const frame = (e.overlay || []).length ? e.overlay.map(mk).join('') : (FRAMES[e.frame] || '');
    const glyphs = e.paths.map(mk).join('');
    return '<figure><div class="c"><svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
        e.viewBox + '">' + frame + glyphs + '</svg></div><figcaption>' +
        e.code + ' ' + e.name + '</figcaption></figure>';
}).join('');

const page = '<!doctype html><meta charset="utf-8"><style>' +
    'body{margin:0;background:repeating-conic-gradient(#f0f 0 25%,#0cc 0 50%) 0 0/24px 24px;' +
    'font:12px system-ui,sans-serif;padding:12px}' +
    '.g{display:grid;grid-template-columns:repeat(3,220px);gap:16px}' +
    '.c{width:220px;height:220px}' +
    '.c svg{width:100%;height:100%;display:block}' +
    'figcaption{text-align:center;margin-top:4px;font-weight:600}' +
    '</style><div class="g">' + cells + '</div>';

const pageFile = path.join(outDir, 'app-ghs.html');
fs.writeFileSync(pageFile, page, 'utf8');

const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browser = candidates.find(function (p) { return fs.existsSync(p); });
if (!browser) { console.error('Kein Chrome/Edge gefunden'); process.exit(1); }

const png = path.join(outDir, 'app-ghs.png');
execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--window-size=740,900',
    '--screenshot=' + png, 'file:///' + pageFile.replace(/\\/g, '/')
], { stdio: 'ignore' });
console.log('gerendert:', png);
