/*
 * Prueft die Signalwort-Regel am Etikett (headless Chrome, eigenstaendig):
 *   - Piktogramme OHNE Signalwort -> kein Signalwort-Rahmen, kein Text
 *     "kein Signalwort", Container traegt `ghs--nosignal`.
 *   - Signalwort gesetzt -> Rahmen mit Text, kein `ghs--nosignal`.
 *   - keine Piktogramme -> GHS-Stelle im Etikett ganz leer (nichts sichtbar).
 *   - Stammdatenliste zeigt den Zustand weiter als Text.
 *
 *   node .build/label-signal-check.js
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });

const exe = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!exe) { console.error('Kein Chrome/Edge gefunden'); process.exit(1); }

const test = `
<pre id="test-out"></pre>
<script>
window.addEventListener("load", function () {
  var log = [];
  /* PRINT=true -> Druckbogen: beide Etiketten sichtbar (wie im @media print). */
  var PRINT = /print=1/.test(location.search);
  if (PRINT) {
    var s = document.createElement("style");
    s.textContent = '.label[data-index="1"]{display:flex!important}' +
      '.sheet,.sheet__labels{height:297mm!important}';
    document.head.appendChild(s);
  }
  function t(name, fn) {
    try { log.push((fn() ? "OK  " : "FAIL") + "  " + name); }
    catch (e) { log.push("FAIL  " + name + " -> " + e.message); }
  }
  function $(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function ghs() { return $("#sheetLabels [data-f=\\"ghs\\"]"); }
  /* Am Bildschirm zeigt die Vorschau nur Etikett 1; im Druck sind beide da. */
  function visibleLabels() {
    return $("[data-label]").filter(function (l) {
      return l.getBoundingClientRect().height > 0;
    });
  }
  function pick(id) {
    var cat = document.getElementById("fCatalyst");
    cat.value = id; cat.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function mkProfile(name, picks, signal) {
    document.getElementById("btnSettings").click();
    document.getElementById("btnEditorNew").click();
    var n = document.getElementById("eName");
    n.value = name; n.dispatchEvent(new Event("input", { bubbles: true }));
    var opts = $("#ePicker .ghs-opt");
    picks.forEach(function (i) { opts[i].click(); });
    var sig = document.getElementById("eSignal");
    sig.value = signal; sig.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("btnEditorSave").click();
    var li = $("#editorModal .list__item").filter(function (x) {
      return x.querySelector(".list__name").textContent === name;
    })[0];
    var id = li.getAttribute("data-id");
    var chip = li.querySelector(".list__word");
    document.getElementById("btnCloseEditor").click();
    return { id: id, chip: chip ? chip.textContent.trim() : "" };
  }

  setTimeout(function () {
    var a = mkProfile("Pruef ohne Signalwort", [0, 1], "");
    pick(a.id);
    t("ohne Signalwort: ghs--nosignal gesetzt", function () {
      return ghs().every(function (g) { return g.classList.contains("ghs--nosignal"); });
    });
    t("ohne Signalwort: kein Signalwort-Rahmen", function () {
      return $("#sheetLabels .ghs__signal").length === 0;
    });
    t("ohne Signalwort: kein Text im Etikett", function () {
      return ghs().every(function (g) { return g.textContent.trim() === ""; });
    });
    t("ohne Signalwort: Rauten sichtbar", function () {
      var labels = visibleLabels();
      log.push("      PRINT=" + PRINT + " sichtbare Etiketten=" + labels.length);
      return labels.length === (PRINT ? 2 : 1) && labels.every(function (l) {
        var g = l.querySelector(".ghs__grid");
        if (!g) return false;
        var b = g.getBoundingClientRect();
        log.push("      grid h=" + b.height.toFixed(1) + " w=" + b.width.toFixed(1) +
          " dia=" + g.querySelectorAll(".ghs__dia").length);
        return b.height > 0 && b.width > 0 && g.querySelectorAll(".ghs__dia").length === 2;
      });
    });
    t("ohne Signalwort: Editorliste zeigt Hinweis", function () {
      return a.chip === "kein Signalwort";
    });

    var b = mkProfile("Pruef mit Gefahr", [0], "Gefahr");
    pick(b.id);
    t("mit Signalwort: Rahmen + Text", function () {
      var w = $("#sheetLabels .ghs__signal");
      return w.length === ghs().length &&
        w.every(function (x) { return x.textContent.trim() === "Gefahr"; });
    });
    t("mit Signalwort: kein ghs--nosignal", function () {
      return ghs().every(function (g) { return !g.classList.contains("ghs--nosignal"); });
    });
    t("mit Signalwort: Editorliste zeigt Signalwort", function () {
      return b.chip === "Gefahr";
    });

    var c = mkProfile("Pruef ohne Piktogramme", [], "");
    pick(c.id);
    t("ohne Piktogramme: Etikett leer", function () {
      return ghs().every(function (g) {
        return g.textContent.trim() === "" && g.getBoundingClientRect().height === 0;
      });
    });
    t("ohne Piktogramme: kein sichtbarer Rest", function () {
      return $("#sheetLabels .ghs__signal, #sheetLabels .ghs__grid").length === 0;
    });
    t("ohne Piktogramme: Editorliste zeigt Hinweis", function () {
      document.getElementById("btnSettings").click();
      var li = $("#editorModal .list__item").filter(function (x) {
        return x.getAttribute("data-id") === c.id;
      })[0];
      var icons = li ? li.querySelector(".list__icons").textContent.trim() : null;
      document.getElementById("btnCloseEditor").click();
      return icons === "keine Piktogramme";
    });

    document.getElementById("test-out").textContent = log.join("\\n");
  }, 300);
});
</script>
`;

const html = fs.readFileSync(src, 'utf8').replace('</body>', test + '\n</body>');
const page = path.join(out, 'label-signal.html');
fs.writeFileSync(page, html, 'utf8');

function run(query, tag) {
    const domFile = path.join(out, 'label-signal' + tag + '.dom.html');
    const errFile = path.join(out, 'label-signal' + tag + '.err');
    const profile = path.join(out, 'label-signal-profile' + tag);
    [domFile, errFile].forEach((f) => fs.rmSync(f, { force: true }));
    fs.rmSync(profile, { recursive: true, force: true });

    const fdOut = fs.openSync(domFile, 'w');
    try {
        cp.execFileSync(exe, ['--headless=new', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', '--user-data-dir=' + profile,
            '--virtual-time-budget=8000', '--window-size=1400,1000', '--dump-dom',
            'file:///' + page.replace(/\\/g, '/') + query],
        { stdio: ['ignore', fdOut, fs.openSync(errFile, 'w')] });
    } finally {
        fs.closeSync(fdOut);
    }

    const dom = fs.readFileSync(domFile, 'utf8');
    const m = dom.match(/<pre id="test-out">([\s\S]*?)<\/pre>/);
    const result = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
    if (!result.trim()) { console.log(tag + ': Testausgabe nicht gefunden'); return false; }
    console.log(tag + ':');
    console.log(result);
    return !/FAIL/.test(result);
}

const okScreen = run('', 'Vorschau');
const okPrint = run('?print=1', 'Druck');
process.exit(okScreen && okPrint ? 0 : 1);
