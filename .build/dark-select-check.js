/*
 * Build-Hilfsskript (nicht Teil der App): prüft die Lesbarkeit der
 * Dropdown-Optionen im dunklen Design. Chrome zeichnet die Optionsliste selbst,
 * deshalb wird hier geprüft, dass der Selektor `color-scheme` und die Option-
 * Farben mit den Design-Variablen gesetzt sind und ein Screenshot des offenen
 * Selects entsteht.
 *   node .build/dark-select-check.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<pre id="ds-out">laeuft</pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  var out = [];',
    '  var ok = true;',
    '  var t = function (name, cond, info) {',
    '    if (!cond) ok = false;',
    '    out.push((cond ? "OK    " : "FAIL  ") + name + (info ? "  (" + info + ")" : ""));',
    '  };',
    '  try {',
    '    var sel = document.getElementById("fFurnace");',
    '    var cs = getComputedStyle(sel);',
    '    t("color-scheme light dark am Select", cs.colorScheme === "light dark", cs.colorScheme);',
    '    var opt = sel.querySelector("option");',
    '    var os = getComputedStyle(opt);',
    '    var bg = os.backgroundColor.replace(/\\s/g, "");',
    '    var col = os.color.replace(/\\s/g, "");',
    '    var rgb = function (hex) {',
    '      var h = hex.trim();',
    '      return "rgb(" + parseInt(h.slice(1, 3), 16) + ", " + parseInt(h.slice(3, 5), 16) +',
    '        ", " + parseInt(h.slice(5, 7), 16) + ")";',
    '    };',
    '    /* Leerzeichen im berechneten Wert sind je nach Chrome-Version vorhanden */',
    '    var norm = function (c) { return c.replace(/\\s/g, ""); };',
    '    var rootStyle = getComputedStyle(document.documentElement);',
    '    t("Option-Hintergrund = Flaechenfarbe", norm(bg) === norm(rgb(rootStyle.getPropertyValue("--surface"))),',
    '      bg + " / " + rgb(rootStyle.getPropertyValue("--surface")));',
    '    t("Option-Text = Textfarbe", norm(col) === norm(rgb(rootStyle.getPropertyValue("--ink"))),',
    '      col + " / " + rgb(rootStyle.getPropertyValue("--ink")));',
    '    var lum = function (c) {',
    '      var p = c.match(/\\d+/g).map(function (v) { return parseInt(v, 10) / 255; })',
    '        .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });',
    '      return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];',
    '    };',
    '    var l1 = lum(bg), l2 = lum(col);',
    '    var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);',
    '    t("Kontrast Optionstext >= 4.5:1", ratio >= 4.5, "Verhaeltnis " + (Math.round(ratio * 100) / 100));',
    '  } catch (e) { ok = false; out.push("FEHLER: " + e.message); }',
    '  out.push(ok ? "\\nALLE PRUEFUNGEN OK" : "\\nPRUEFUNG FEHLGESCHLAGEN");',
    '  document.getElementById("ds-out").textContent = out.join("\\n");',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(outDir, 'dark-select.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=4000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
const m = dom.match(/<pre id="ds-out">([\s\S]*?)<\/pre>/);
const text = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&') : 'Messung nicht gefunden';
console.log(text);

const png = path.join(outDir, 'dark-select.png');
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--virtual-time-budget=3000', '--window-size=1400,1000',
    '--screenshot=' + png, 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'pipe' });
console.log('\nScreenshot: ' + png);
process.exitCode = /FAIL|FEHLER|nicht gefunden/.test(text) ? 1 : 0;
