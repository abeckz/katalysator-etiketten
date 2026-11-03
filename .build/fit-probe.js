/*
 * Messhilfe (nicht Teil der App): prüft, ob die Arbeitsfläche das Fenster
 * vollständig, aber ohne Scrollen ausfüllt – optional mit offenem
 * Stammdateneditor.
 *   node .build/fit-probe.js [Breite] [Höhe] [--shot name] [--editor]
 * Standardgröße 2293x928 = 3440x1440 px bei 150 % Windows-Skalierung.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const W = Number(args[0] || 2293);
const H = Number(args[1] || 928);
const shotIdx = process.argv.indexOf('--shot');
const shotName = shotIdx > 0 ? process.argv[shotIdx + 1] : '';
const withEditor = process.argv.indexOf('--editor') > 0;

const probe = [
    '<pre id="fp-out" style="position:fixed;left:0;top:0;z-index:9999;'
    + 'font:11px/1.3 monospace;color:#0f0;background:#000;padding:4px;margin:0;white-space:pre"></pre>',
    '<script>',
    'window.addEventListener("load", function () {',
    '  setTimeout(function () {',
    '    var out = [];',
    '    var de = document.documentElement;',
    '    var rect = function (sel) {',
    '      var n = document.querySelector(sel);',
    '      if (!n) return null;',
    '      return n.getBoundingClientRect();',
    '    };',
    '    var box = function (sel) {',
    '      var r = rect(sel);',
    '      if (!r) return sel + "=n/a";',
    '      return sel + " " + Math.round(r.width) + "x" + Math.round(r.height) +',
    '        " @top" + Math.round(r.top) + " bottom" + Math.round(r.bottom);',
    '    };',
    '    var vh = window.innerHeight;',
    '    var pn = rect(".panel"), st = rect(".sheet-stage");',
    '    var sf = rect(".sheet-fit"), sh = rect("#sheet");',
    '    var docScroll = de.scrollHeight - de.clientHeight;',
    '    var belowBottom = Math.round(vh - Math.max(pn.bottom, st.bottom));',
    '    out.push("viewport " + window.innerWidth + "x" + vh +',
    '      "  docScrollMax=" + docScroll + "  schiebtUntenRaus=" + (Math.max(pn.bottom, st.bottom) > vh));',
    '    [".app-bar", ".workspace", ".panel", ".preview-wrap", ".sheet-stage", ".sheet-fit", "#sheet"].forEach(function (s) {',
    '      out.push(box(s));',
    '    });',
    '    out.push("panel scrollt intern=" + (document.querySelector(".panel__body").scrollHeight >',
    '      document.querySelector(".panel__body").clientHeight + 1));',
    '    out.push("abstand Panel-Unterkante -> Fensterunterkante=" + belowBottom + "px");',
    '    out.push("blatt in Flaeche: frei rechts=" + Math.round(st.right - sf.right) +',
    '      " frei unten=" + Math.round(st.bottom - sf.bottom));',
    '    out.push("zoom=" + getComputedStyle(document.getElementById("sheet")).getPropertyValue("--zoom"));',
    '    out.push(".sheet overshoot w=" + Math.round(sf.width - sh.width) + " h=" + Math.round(sf.height - sh.height));',
    '    out.push("shellMax=" + getComputedStyle(de).getPropertyValue("--shell-max"));',
    '    if (' + withEditor + ') {',
    '      document.getElementById("btnSettings").click();',
    '      setTimeout(function () {',
    '        var dlg = rect(".modal__dialog"), lst = document.getElementById("entryList");',
    '        out.push("--- Stammdateneditor ---");',
    '        out.push("dialog " + Math.round(dlg.width) + "x" + Math.round(dlg.height) +',
    '          " @top" + Math.round(dlg.top) + " bottom" + Math.round(dlg.bottom) + " (Fenster " + vh + ")");',
    '        out.push("liste sichtbar h=" + Math.round(lst.getBoundingClientRect().height) +',
    '          " scrollt=" + (lst.scrollHeight > lst.clientHeight + 1) +',
    '          " eintraege=" + lst.children.length);',
    '        document.getElementById("fp-out").textContent = out.join("\\n");',
    '      }, 300);',
    '      return;',
    '    }',
    '    document.getElementById("fp-out").textContent = out.join("\\n");',
    '  }, 700);',
    '});',
    '</script>'
].join('\n');

let html = fs.readFileSync(src, 'utf8');
html = html.replace('</body>', probe + '\n</body>');
const tmp = path.join(__dirname, 'out', 'fit-probe.html');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(tmp, html, 'utf8');

const common = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=1', '--virtual-time-budget=4000',
    '--window-size=' + W + ',' + H];

const dom = execFileSync(chrome, common.concat(['--dump-dom',
    'file:///' + tmp.replace(/\\/g, '/')]), { encoding: 'utf8', maxBuffer: 1 << 28 });
const m = dom.match(/<pre id="fp-out"[^>]*>([\s\S]*?)<\/pre>/);
console.log('--- ' + W + 'x' + H + ' ---');
console.log(m
    ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'Messung nicht gefunden');

if (shotName) {
    const png = path.join(__dirname, 'out', shotName + '.png');
    execFileSync(chrome, common.concat(['--screenshot=' + png,
        'file:///' + tmp.replace(/\\/g, '/')]), { encoding: 'utf8' });
    console.log('Screenshot: ' + png);
}
