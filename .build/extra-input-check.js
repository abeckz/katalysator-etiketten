/*
 * Prüft die drei Freitext-Eingabefelder „Zusatzzeile 1–3“:
 *   node .build/extra-input-check.js
 *  - Felder im Formular vorhanden (fExtra1..3)
 *  - Eingabe per setInput landet auf beiden Etiketten (data-f="extra1..3")
 *  - localStorage enthält die Werte
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const test = [
    '<pre id="test-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  var log = [];',
    '  function t(name, fn) {',
    '    try { var ok = fn(); log.push((ok ? "OK  " : "FAIL") + "  " + name); }',
    '    catch (e) { log.push("FAIL  " + name + " -> " + e.message); }',
    '  }',
    '  function all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }',
    '  function setInput(sel, v) {',
    '    var s = document.querySelector(sel); s.value = v;',
    '    s.dispatchEvent(new Event("input", { bubbles: true }));',
    '    s.dispatchEvent(new Event("change", { bubbles: true }));',
    '  }',
    '',
    '  t("drei Zusatzfelder im Formular", function () {',
    '    return all("#labelForm input[name=extra1], #labelForm input[name=extra2], #labelForm input[name=extra3]").length === 3;',
    '  });',
    '',
    '  t("extra1-Eingabe landet auf beiden Etiketten", function () {',
    '    setInput("#fExtra1", "Charge BF-01");',
    '    var v = all("#sheetLabels [data-f=extra1]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0] === "Charge BF-01" && v[1] === "Charge BF-01";',
    '  });',
    '',
    '  t("extra2-Eingabe landet auf beiden Etiketten", function () {',
    '    setInput("#fExtra2", "Reaktor B2");',
    '    var v = all("#sheetLabels [data-f=extra2]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0] === "Reaktor B2" && v[1] === "Reaktor B2";',
    '  });',
    '',
    '  t("extra3-Eingabe landet auf beiden Etiketten", function () {',
    '    setInput("#fExtra3", "Sud 15");',
    '    var v = all("#sheetLabels [data-f=extra3]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0] === "Sud 15" && v[1] === "Sud 15";',
    '  });',
    '',
    '  t("max 60 Zeichen je Zusatzzeile", function () {',
    '    var long = ""; for (var i = 0; i < 70; i += 1) long += "x";',
    '    setInput("#fExtra1", long);',
    '    var v = all("#sheetLabels [data-f=extra1]")[0].textContent.trim();',
    '    return v.length <= 60;',
    '  });',
    '',
    '  t("Zusatzwerte in localStorage", function () {',
    '    var raw = "";',
    '    for (var i = 0; i < window.localStorage.length; i += 1) {',
    '      raw += window.localStorage.getItem(window.localStorage.key(i)) || "";',
    '    }',
    '    return raw.indexOf("extra1") >= 0 && raw.indexOf("extra2") >= 0 && raw.indexOf("extra3") >= 0;',
    '  });',
    '',
    '  document.getElementById("test-out").textContent = log.join("\\n");',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', test + '\n</body>');
const tmp = path.join(__dirname, 'out', 'extra-input.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="test-out">([\s\S]*?)<\/pre>/);
const out = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null;
if (!out) {
    console.log('Testausgabe nicht gefunden');
    process.exit(1);
}
console.log(out);
const failed = /FAIL/.test(out);
console.log('\n' + (failed ? 'TESTS FEHLGESCHLAGEN' : 'ALLE ZUSATZFELD-TESTS OK'));
process.exit(failed ? 1 : 0);
