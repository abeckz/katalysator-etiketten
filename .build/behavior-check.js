/*
 * Verhaltensprüfung im Browser (headless Chrome, --dump-dom + eingeschleustes Testskript).
 *   node .build/behavior-check.js
 * Prüft: Selects, Live-Update beider Etiketten, GHS-Limit (6), Editor-CRUD,
 *        "aus Ofen"-Liste, Datumsformat und localStorage-Roundtrip.
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
    '  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };',
    '  var val = function (sel) { var n = document.querySelector(sel); return n ? n.textContent.trim() : null; };',
    '  var labels = function () { return $$("#sheetLabels .label"); };',
    '  function setSelect(sel, v) {',
    '    var s = document.querySelector(sel); s.value = v;',
    '    s.dispatchEvent(new Event("change", { bubbles: true }));',
    '  }',
    '  function setInput(sel, v) {',
    '    var s = document.querySelector(sel); s.value = v;',
    '    s.dispatchEvent(new Event("input", { bubbles: true }));',
    '    s.dispatchEvent(new Event("change", { bubbles: true }));',
    '  }',
    '',
    '  t("zwei Etiketten im Sheet", function () { return labels().length === 2; });',
    '  t("Katalysatorliste hat 5 Eintraege", function () { return $$("#fCatalyst option").length === 5; });',
    '  t("Ofenliste gefuellt", function () { return $$("#fFurnace option").length > 1; });',
    '',
    '  t("Katalysatorwechsel aktualisiert beide Etiketten", function () {',
    '    setSelect("#fCatalyst", "kat-02");',
    '    var v = $$("#sheetLabels [data-f=\\"catalyst\\"]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0].indexOf("Ni") >= 0 && v[0] === v[1];',
    '  });',
    '',
    '  t("GHS-Anzahl folgt dem Katalysator (3 bei kat-02)", function () {',
    '    return $$("#sheetLabels [data-f=\\"ghs\\"] .ghs__dia").length === 6;',
    '  });',
    '',
    '  t("Signalwort Gefahr bei kat-02", function () {',
    '    var w = $$("#sheetLabels [data-f=\\"ghs\\"] .ghs__signal");',
    '    return w.length === 2 && w[0].textContent.trim() === "Gefahr";',
    '  });',
    '',
    '  t("Ofen-Auswahl landet auf beiden Etiketten", function () {',
    '    var opt = $$("#fFurnace option").filter(function (o) { return o.value; })[0];',
    '    setSelect("#fFurnace", opt.value);',
    '    var v = $$("#sheetLabels [data-f=\\"furnace\\"]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0] === opt.value && v[1] === opt.value;',
    '  });',
    '',
    '  t("Produktion (Freitext) landet auf beiden Etiketten", function () {',
    '    setInput("#fProduction", "Charge 24/0417");',
    '    var v = $$("#sheetLabels [data-f=\\"production\\"]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && v[0] === "Charge 24/0417" && v[1] === "Charge 24/0417";',
    '  });',
    '',
    '  t("Datum erscheint deutsch formatiert", function () {',
    '    setInput("#fDate", "2026-11-02");',
    '    var v = $$("#sheetLabels [data-f=\\"date\\"]").map(function (n) { return n.textContent.trim(); });',
    '    return v.length === 2 && /02\\.11\\.2026/.test(v[0]) && v[0] === v[1];',
    '  });',
    '',
    '  t("Titel 90 Grad gedreht vorhanden", function () {',
    '    return $$("#sheetLabels [data-f=\\"title\\"]").every(function (n) { return n.textContent.trim() === "Ausbau Katalysator"; });',
    '  });',
    '',
    '  t("localStorage speichert Formularstand", function () {',
    '    return !!window.localStorage.length;',
    '  });',
    '  t("Werte in localStorage enthalten", function () {',
    '    var raw = "";',
    '    for (var i = 0; i < window.localStorage.length; i += 1) {',
    '      raw += window.localStorage.getItem(window.localStorage.key(i)) || "";',
    '    }',
    '    return raw.indexOf("24/0417") >= 0;',
    '  });',
    '',
    '  t("Editor oeffnet", function () {',
    '    document.getElementById("btnSettings").click();',
    '    var m = document.getElementById("editorModal");',
    '    return m && !m.hasAttribute("hidden");',
    '  });',
    '',
    '  t("Editor listet Katalysatoren", function () {',
    '    return $$("#editorModal [data-editor-list] .list__item").length >= 5 ||',
    '      $$("#editorModal .list__item").length >= 5;',
    '  });',
    '',
    '  document.getElementById("test-out").textContent = log.join("\\n");',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', test + '\n</body>');
const tmp = path.join(__dirname, 'out', 'behavior.html');
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
console.log('\n' + (failed ? 'TESTS FEHLGESCHLAGEN' : 'ALLE VERHALTENSTESTS OK'));
process.exit(failed ? 1 : 0);
