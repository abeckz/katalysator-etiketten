/*
 * Prüft die Layout-Anforderungen der Etiketten und die GHS-Auswahl.
 *   node .build/mid-check.js
 * Kernprüfung: Mitte des Etiketts = (obere Spitze der GHS-Gruppe bis
 * Unterkante Signalwort) / 2, gemessen im Druckmaßstab (1:1 in mm).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<pre id="mid-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  window.dispatchEvent(new Event("beforeprint"));',
    '  setTimeout(function () {',
    '    var out = [];',
    '    var PX = 96 / 25.4;',
    '    var mm = function (px) { return Math.round((px / PX) * 100) / 100; };',
    '    var LABELS = [].slice.call(document.querySelectorAll("[data-label]"));',
    '    function measure(tag) {',
    '      LABELS.forEach(function (L, i) {',
    '        /* Bezug: Innenflaeche des Etiketts = .label__right (5 mm Rand innen) */',
    '        var rb = L.querySelector(".label__right").getBoundingClientRect();',
    '        var innerTop = rb.top, innerBot = rb.bottom;',
    '        var g = L.querySelector(".ghs"), grid = L.querySelector(".ghs__grid"),',
    '            sig = L.querySelector(".ghs__signal"), rc = L.querySelector(".recipient");',
    '        var gr = g.getBoundingClientRect(), gir = grid ? grid.getBoundingClientRect() : null;',
    '        var tiles = [].slice.call(L.querySelectorAll(".ghs__dia"));',
    '        var sr = sig.getBoundingClientRect(), rr = rc.getBoundingClientRect();',
    '        /* Obere Spitze der Gruppe = Oberkante der ersten Raute */',
    '        var top = tiles.length ? tiles[0].getBoundingClientRect().top',
    '          : (gir ? gir.top : gr.top);',
    '        /* Untere Kante der Gruppe = Unterkante Signalwort */',
    '        var midGroup = (top + sr.bottom) / 2;',
    '        var midLabel = (innerTop + innerBot) / 2;',
    '        /* Felder/Box duerfen sich nicht mit der Gruppe ueberdecken */',
    '        var fr = L.querySelector(".label__fields").getBoundingClientRect();',
    '        var overlap = Math.max(0, Math.min(gr.bottom, rr.top) - Math.max(gr.top, rr.bottom)) ;',
    '        out.push(tag + " Etikett " + (i + 1) + ": Etikettenmitte y=" + mm(midLabel - innerTop) +',
    '          " mm | Gruppenmitte y=" + mm(midGroup - innerTop) + " mm | Abweichung=" +',
    '          mm(Math.abs(midGroup - midLabel)) + " mm | Spitze->Box=" + mm(sr.bottom - top) +',
    '          " mm | top=" + getComputedStyle(L.querySelector(".label__right"))',
    '            .getPropertyValue("--ghs-top").trim() +',
    '          " | GHS ueber Box=" + mm(Math.max(0, gr.bottom - rr.top)) +',
    '          " | Felder-Rand=" + mm(Math.min(fr.right, gr.left)) +',
    '          " mm | title-Zeilen=" + L.querySelectorAll(".label__lefttext span").length +',
    '          " | Trennstrich=" + getComputedStyle(L.querySelector(".label__left")).borderRightWidth);',
    '      });',
    '    }',
    '    measure("kat-01(2 Symbole, kein Ofen)");',
    '    /* Cases: 0, 4, 6 Symbole + alles leer */',
    '    var opt = function (k) { return document.querySelector(\'.ghs-opt[data-key="\' + k + \'"]\'); };',
    '    var sel = function (sel, v) { var s = document.querySelector(sel); s.value = v;',
    '      s.dispatchEvent(new Event("change", { bubbles: true })); };',
    '    sel("#fCatalyst", "kat-02");',
    '    sel("#fFurnace", "C300");',
    '    var p = document.querySelector("#fProduction"); p.value = "Charge 24/0417 Reaktor B2 Sud 15";',
    '    p.dispatchEvent(new Event("input", { bubbles: true }));',
    '    measure("kat-02 (3 Symbole, Ofen, 2-zeilige Produktion)");',
    '    sel("#fCatalyst", "kat-04");',
    '    measure("kat-04 (2 Symbole)");',
    '    /* Extremfall: kein Piktogramm, kein Signalwort – über den Stammdaten-',
    '       editor (alle Piktogramme abwählen, Signalwort leeren) */',
    '    document.getElementById("btnSettings").click();',
    '    var pick = document.querySelectorAll(".ghs-opt.is-active");',
    '    for (var k = 0; k < pick.length; k += 1) pick[k].click();',
    '    var sigField = document.querySelector("#eSignal");',
    '    sigField.value = "";',
    '    sigField.dispatchEvent(new Event("change", { bubbles: true }));',
    '    document.getElementById("btnEditorSave").click();',
    '    measure("leer (0 Symbole, kein Signalwort)");',
    '    document.getElementById("mid-out").textContent = out.join("\\n");',
    '    document.getElementById("mid-out").textContent = out.join("\\n");',
    '    document.getElementById("mid-out").textContent = out.join("\\n");',
    '  }, 300);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'mid-check.html');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000',
    '--window-size=1400,1100', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="mid-out">([\s\S]*?)<\/pre>/);
console.log(m
    ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'Messung nicht gefunden');
