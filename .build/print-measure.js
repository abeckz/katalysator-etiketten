/*
 * Prüft die Druck-Geometrie im Druck-Medium: misst Blatt, Etiketten und
 * Innenbereiche in mm (das Blatt muss 210 x 297 mm groß sein und bei 1:1
 * stehen – unabhängig von der Bildschirm-Skalierung).
 *   node .build/print-measure.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<pre id="pm-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  /* Bildschirm-Skalierung anwenden (wie beim Öffnen), dann Druckmedien. */',
    '  window.dispatchEvent(new Event("beforeprint"));',
    '  setTimeout(function () {',
    '    var out = [];',
    '    var host = document.querySelector(".app-shell") || document.body;',
    '    /* Identisch zu @media print: Bedienoberfläche weg, nur das Blatt. */',
    '    document.querySelectorAll(".no-print, .panel, .stage-tools").forEach(function (n) {',
    '      n.style.setProperty("display", "none", "important");',
    '    });',
    '    /* Bildschirm-Regel: Etikett 2 wird nur am Bildschirm ausgeblendet */',
    '    var screenBlock = document.createElement("style");',
    '    screenBlock.textContent = \'.label[data-index="1"]{display:flex!important}\' +',
    '      \'.sheet,.sheet__labels{height:297mm!important}\';',
    '    document.head.appendChild(screenBlock);',
    '    document.querySelector(".app-shell").style.setProperty("display", "block", "important");',
    '    document.querySelector(".app-shell").style.setProperty("height", "auto", "important");',
    '    document.querySelector(".workspace").style.setProperty("display", "block", "important");',
    '    document.querySelector(".workspace").style.setProperty("padding", "0", "important");',
    '    document.querySelector(".workspace").style.setProperty("max-width", "none", "important");',
    '    document.querySelector(".preview-wrap").style.setProperty("display", "block", "important");',
    '    document.querySelector(".sheet-stage").style.setProperty("display", "block", "important");',
    '    document.querySelector(".sheet-stage").style.setProperty("padding", "0", "important");',
    '    document.querySelector(".sheet-stage").style.setProperty("border", "0", "important");',
    '    document.querySelector(".sheet-stage").style.setProperty("background", "none", "important");',
    '    var sheet = document.getElementById("sheet");',
    '    var fit = document.querySelector(".sheet-fit");',
    '    var PX = 96 / 25.4;',
    '    sheet.style.setProperty("--zoom", "1");',
    '    sheet.style.setProperty("--sheet-w", "210mm");',
    '    sheet.style.setProperty("--sheet-h", "297mm");',
    '    sheet.style.transform = "none";',
    '    sheet.style.width = "210mm";',
    '    sheet.style.height = "297mm";',
    '    fit.style.width = "auto";',
    '    fit.style.height = "auto";',
    '    window.dispatchEvent(new Event("beforeprint"));',
    '    setTimeout(function () {',
    '    var mm = function (px) { return Math.round((px / PX) * 100) / 100; };',
    '    var show = function (sel) {',
    '      var n = document.querySelector(sel);',
    '      if (!n) { out.push(sel + " FEHLT"); return; }',
    '      var r = n.getBoundingClientRect();',
    '      out.push(sel + " -> y=" + mm(r.top) + " x=" + mm(r.left) + " w=" + mm(r.width) +',
    '        " h=" + mm(r.height) + " mm");',
    '    };',
    '    ["#sheet", ".label[data-index=\\"0\\"]", ".label[data-index=\\"1\\"]",',
    '     ".label[data-index=\\"0\\"] .label__right",',
    '     ".label[data-index=\\"1\\"] .recipient"].forEach(show);',
    '    document.getElementById("pm-out").textContent = out.join("\\n");',
    '    }, 60);',
    '  }, 250);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'print-measure.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000',
    '--window-size=1400,1000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="pm-out">([\s\S]*?)<\/pre>/);
console.log(m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    : 'Messung nicht gefunden');
