/*
 * Prüft die neue Signalwort-Regel direkt am Etikett:
 *   - Piktogramme OHNE Signalwort sind zulässig -> Rahmen bleibt leer,
 *     Container trägt `ghs--nosignal`, kein Überdecken, kein Überlauf.
 *   - Signalwort MIT Piktogrammen -> normale Darstellung (kein `ghs--nosignal`).
 *   node .build/signal-check.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Kein Chrome/Edge gefunden'); process.exit(1); }

const test = [
    '<pre id="test-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  var log = [];',
    '  var NO_SHOT = false;   /* true = nur Screenshot-Vorbereitung */',
    '  window.__SHOT_EDITOR = true;   /* Editor beim Screenshot offen lassen */',
    '  function t(name, fn) {',
    '    try { var ok = fn(); log.push((ok ? "OK  " : "FAIL") + "  " + name); }',
    '    catch (e) { log.push("FAIL  " + name + " -> " + e.message); }',
    '  }',
    '  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };',
    '  setTimeout(function () {',
    '    /* Profil über den regulären Editor-Weg anlegen: 2 Piktogramme, kein Signalwort */',
    '    document.getElementById("btnSettings").click();',
    '    document.getElementById("btnEditorNew").click();',
    '    var nameEl = document.getElementById("eName");',
    '    nameEl.value = "Ohne Signalwort";',
    '    nameEl.dispatchEvent(new Event("input", { bubbles: true }));',
    '    var opts = $$("#ePicker .ghs-opt");',
    '    opts[0].click(); opts[1].click();',
    '    var sigEl = document.getElementById("eSignal");',
    '    sigEl.value = ""; sigEl.dispatchEvent(new Event("change", { bubbles: true }));',
    '    document.getElementById("btnEditorSave").click();',
    '    var id = $$("#editorModal .list__item").filter(function (li) {',
    '      return li.querySelector(".list__name").textContent === "Ohne Signalwort";',
    '    })[0].getAttribute("data-id");',
    '    document.getElementById("btnCloseEditor").click();',
    '    var cat = document.getElementById("fCatalyst");',
    '    cat.value = id; cat.dispatchEvent(new Event("change", { bubbles: true }));',
    '',
    '    t("zwei Rauten im Etikett", function () {',
    '      return $$("#sheetLabels [data-f=\\"ghs\\"] .ghs__dia").length === 4;',
    '    });',
    '',
    '    t("Piktogramme ohne Signalwort: ghs--nosignal gesetzt", function () {',
    '      return $$("#sheetLabels [data-f=\\"ghs\\"]").every(function (g) {',
    '        return g.classList.contains("ghs--nosignal");',
    '      });',
    '    });',
    '',
    '    t("Signalwort-Rahmen leer + Platzhaltertext", function () {',
    '      return $$("#sheetLabels [data-f=\\"ghs\\"] .ghs__signal").every(function (s) {',
    '        return s.getAttribute("data-word") === "" &&',
    '          s.textContent.trim() === "kein Signalwort";',
    '      });',
    '    });',
    '',
    '    t("Rahmen ueberdeckt die Rauten nicht", function () {',
    '      return $$("#sheetLabels [data-f=\\"ghs\\"]").every(function (g) {',
    '        var grid = g.querySelector(".ghs__grid"), sig = g.querySelector(".ghs__signal");',
    '        return sig.getBoundingClientRect().top >= grid.getBoundingClientRect().bottom - 0.5;',
    '      });',
    '    });',
    '',
    '    t("Rahmen bleibt im Etikett", function () {',
    '      return $$("#sheetLabels [data-f=\\"ghs\\"]").every(function (g) {',
    '        var label = g.closest(".label").getBoundingClientRect();',
    '        var sig = g.querySelector(".ghs__signal").getBoundingClientRect();',
    '        return sig.bottom <= label.bottom + 0.5 && sig.top >= label.top - 0.5;',
    '      });',
    '    });',
    '',
    '    t("Chip in der Editorliste ist neutral", function () {',
    '      document.getElementById("btnSettings").click();',
    '      var li = $$("#editorModal .list__item").filter(function (x) {',
    '        return x.getAttribute("data-id") === id;',
    '      })[0];',
    '      var w = li.querySelector(".list__word");',
    '      document.getElementById("btnCloseEditor").click();',
    '      return w && w.getAttribute("data-word") === "kein" &&',
    '        w.textContent.trim() === "kein Signalwort";',
    '    });',
    '',
    '    /* Gegenprobe: kat-02 hat weiterhin ein Signalwort */',
    '    t("kat-02 weiterhin mit Signalwort Gefahr", function () {',
    '      var cat = document.getElementById("fCatalyst");',
    '      cat.value = "kat-02"; cat.dispatchEvent(new Event("change", { bubbles: true }));',
    '      var out = $$("#sheetLabels [data-f=\\"ghs\\"]");',
    '      var w = $$("#sheetLabels [data-f=\\"ghs\\"] .ghs__signal");',
    '      return out.every(function (g) { return !g.classList.contains("ghs--nosignal"); }) &&',
    '        w.length === 2 && w[0].textContent.trim() === "Gefahr";',
    '    });',
    '  }, 300);',
    '  setTimeout(function () { document.getElementById("test-out").textContent = log.join("\\n"); }, 1200);',
    '});',
    '</script>'
].join('\n').replace('var NO_SHOT = false;', 'var NO_SHOT = ' + JSON.stringify(process.argv[2] === '--shot') + ';')
    .replace('var log = [];', 'var log = [];\n  function mark(msg) { log.push("OK    " + msg); }')
    .replace(
        '    t("zwei Rauten im Etikett"',
        '    if (NO_SHOT) { mark("Screenshot-Vorbereitung: Piktogramme ohne Signalwort");' +
        ' if (window.__SHOT_EDITOR) document.getElementById("btnSettings").click(); return; }\n' +
        '    t("zwei Rauten im Etikett"');

/* Startdaten so setzen, dass beide Fälle geprüft werden: kat-02 (mit Signalwort)
   und ein Profil mit Piktogramm ohne Signalwort. Das Profil wird über den
   Editor angelegt, damit der reguläre Weg geprüft wird. */
let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', test + '\n</body>');
const tmp = path.join(outDir, 'signal.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=6000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="test-out">([\s\S]*?)<\/pre>/);
const out = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null;
if (!out || !out.trim()) {
    console.log('Testausgabe nicht gefunden');
    process.exit(1);
}
console.log(out);
process.exit(/FAIL/.test(out) ? 1 : 0);
