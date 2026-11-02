/*
 * Prüft die Layout-Anforderungen der Etiketten und die GHS-Auswahl.
 *   node .build/layout-check.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const probe = [
    '<pre id="lc-out"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  window.dispatchEvent(new Event("beforeprint"));',
    '  setTimeout(function () {',
    '    var out = [];',
    '    var PX = 96 / 25.4;',
    '    var mm = function (px) { return Math.round((px / PX) * 100) / 100; };',
    '    var L = document.querySelector(".label[data-index=\\"0\\"]");',
    '    var R = function (sel) { return L.querySelector(sel).getBoundingClientRect(); };',
    '',
    '    /* 1) Titel zweizeilig */',
    '    var t = L.querySelector(".label__lefttext");',
    '    var spans = t.querySelectorAll("span");',
    '    var sr = [].map.call(spans, function (s) { return s.getBoundingClientRect(); });',
    '    out.push("title: spans=" + spans.length +',
    '      " w=" + mm(t.getBoundingClientRect().width) + " h=" + mm(t.getBoundingClientRect().height) +',
    '      " spanW=" + sr.map(function (r) { return mm(r.width); }).join("/") +',
    '      " writingMode=" + getComputedStyle(t).writingMode +',
    '      " transform=" + getComputedStyle(t).transform);',
    '',
    '    /* 2) Empfaengerbox: Breite + Zentrierung im Datenblock */',
    '    var rc = R(".recipient"), dr = R(".label__right");',
    '    out.push("recipient: w=" + mm(rc.width) + " rightBlockW=" + mm(dr.width) +',
    '      " leftGap=" + mm(rc.left - dr.left) + " rightGap=" + mm(dr.right - rc.right));',
    '',
    '    /* 3) Signalwort mittig unter den Rauten */',
    '    var g = R(".ghs"), grid = R(".ghs__grid"), sig = R(".ghs__signal");',
    '    var gridMid = (grid.left + grid.right) / 2, sigMid = (sig.left + sig.right) / 2;',
    '    out.push("signal: below=" + (sig.top >= grid.bottom - 0.5) +',
    '      " midOffset=" + mm(Math.abs(gridMid - sigMid)) +',
    '      " flexDir=" + getComputedStyle(L.querySelector(".ghs")).flexDirection);',
    '',
    '    /* 4) keine Hilfetexte / Placeholder */',
    '    var ph = document.querySelectorAll("input[placeholder], textarea[placeholder]").length;',
    '    var hints = document.querySelectorAll(".preview-meta, .storage-hint, .ghs-count, #sumCount").length;',
    '    out.push("placeholders=" + ph + " removedBlocks=" + hints);',
    '',
    '    /* 5) GHS-Auswahl */',
    '    document.getElementById("btnSettings").click();',
    '    var opts = document.querySelectorAll(".ghs-opt");',
    '    var oldCheck = document.querySelectorAll(".ghs-opt__check").length;',
    '    var first = opts[0];',
    '    out.push("picker: opts=" + opts.length + " oldCheck=" + oldCheck +',
    '      " cols=" + getComputedStyle(first).gridTemplateColumns +',
    '      " hasBox=" + !!first.querySelector(".ghs-opt__box") +',
    '      " name=\\"" + (first.querySelector(".ghs-opt__name") || {}).textContent + "\\"" +',
    '      " state=\\"" + (first.querySelector("[data-state]") || {}).textContent + "\\"");',
    '',
    '    document.getElementById("lc-out").textContent = out.join("\\n");',
    '  }, 260);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'layout-check.html');
fs.writeFileSync(tmp, html, 'utf8');

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000',
    '--window-size=1400,1100', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')],
    { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="lc-out">([\s\S]*?)<\/pre>/);
console.log(m
    ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'Messung nicht gefunden');
