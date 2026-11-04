/*
 * Prüft die Signalwort-Regel direkt am Etikett:
 *   - Piktogramme OHNE Signalwort sind zulässig -> KEIN Signalwort-Rahmen,
 *     kein Platzhalter „kein Signalwort“, Container trägt `ghs--nosignal`.
 *   - Signalwort MIT Piktogrammen -> normale Darstellung (kein `ghs--nosignal`).
 *   - keine Piktogramme -> im Etikett steht gar nichts (auch nicht
 *     „keine Piktogramme“), die GHS-Stelle ist ausgeblendet.
 *   - Stammdateneditor zeigt den Zustand weiter als Text.
 *
 *   node .build/signal-check.js           Prüfungen ausführen
 *   node .build/signal-check.js --shot    Seite nur für einen Screenshot vorbereiten
 *
 * Der Testcode läuft im Browser und steht hier als Template-String, damit die
 * CSS-Selektoren mit doppelten Anführungszeichen kein Escaping brauchen.
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

const shotOnly = process.argv[2] === '--shot';

const test = '<pre id="test-out"></pre>\n<script>\n' +
    'var SHOT_ONLY = ' + shotOnly + ';\n' +
    `window.addEventListener("load", function () {
  var log = [];
  window.__SHOT_EDITOR = true;   /* Editor beim Screenshot offen lassen */
  function t(name, fn) {
    try { var ok = fn(); log.push((ok ? "OK  " : "FAIL") + "  " + name); }
    catch (e) { log.push("FAIL  " + name + " -> " + e.message); }
  }
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  /* Am Bildschirm zeigt die Vorschau nur Etikett 1, im Druck sind beide da.
     Etikett 2 trägt kein data-label; deshalb über .label zählen. */
  function visibleLabels() {
    return $$("#sheetLabels .label").filter(function (l) {
      return getComputedStyle(l).display !== "none";
    });
  }
  var ghs = '#sheetLabels [data-f="ghs"]';
  function pickListItem(name) {
    return $$("#editorModal .list__item").filter(function (li) {
      return li.querySelector(".list__name").textContent === name;
    })[0];
  }
  function selectCatalyst(p) {
    var cat = document.getElementById("fCatalyst");
    cat.value = p; cat.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setTimeout(function () {
    /* Profil über den regulären Editor-Weg anlegen: 2 Piktogramme, kein Signalwort */
    document.getElementById("btnSettings").click();
    document.getElementById("btnEditorNew").click();
    var nameEl = document.getElementById("eName");
    nameEl.value = "Ohne Signalwort";
    nameEl.dispatchEvent(new Event("input", { bubbles: true }));
    var opts = $$("#ePicker .ghs-opt");
    opts[0].click(); opts[1].click();
    var sigEl = document.getElementById("eSignal");
    sigEl.value = ""; sigEl.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("btnEditorSave").click();
    var id = pickListItem("Ohne Signalwort").getAttribute("data-id");
    document.getElementById("btnCloseEditor").click();
    selectCatalyst(id);

    if (SHOT_ONLY) {
      log.push("OK    Screenshot-Vorbereitung: Piktogramme ohne Signalwort");
      if (window.__SHOT_EDITOR) document.getElementById("btnSettings").click();
      return;
    }


    t("zwei Rauten je Etikett", function () {
      return visibleLabels().every(function (l) {
        return l.querySelectorAll(".ghs__dia").length === 2;
      });
    });

    t("Piktogramme ohne Signalwort: ghs--nosignal gesetzt", function () {
      return $$(ghs).every(function (g) {
        return g.classList.contains("ghs--nosignal");
      });
    });

    t("kein Signalwort-Rahmen im Etikett", function () {
      return $$(ghs + " .ghs__signal").length === 0;
    });

    t("kein Platzhaltertext im Etikett", function () {
      return $$(ghs).every(function (g) {
        var txt = g.textContent.toLowerCase();
        return txt.indexOf("signalwort") < 0 && txt.indexOf("piktogramm") < 0 &&
          g.querySelector(".ghs__signal-empty") === null;
      });
    });

    t("Rauten bleiben im Etikett", function () {
      return visibleLabels().every(function (l) {
        var g = l.querySelector('[data-f="ghs"]');
        var grid = g && g.querySelector(".ghs__grid");
        if (!grid) return false;
        var lb = l.getBoundingClientRect();
        var gb = grid.getBoundingClientRect();
        return gb.height > 0 && gb.bottom <= lb.bottom + 0.5 && gb.top >= lb.top - 0.5;
      });
    });


    t("keine Piktogramme: GHS-Stelle im Etikett ausgeblendet", function () {
      document.getElementById("btnSettings").click();
      document.getElementById("btnEditorNew").click();
      var nameEl2 = document.getElementById("eName");
      nameEl2.value = "Ohne Piktogramme";
      nameEl2.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("btnEditorSave").click();
      var li2 = pickListItem("Ohne Piktogramme");
      var id2 = li2.getAttribute("data-id");
      document.getElementById("btnCloseEditor").click();
      selectCatalyst(id2);
      /* Ohne Piktogramme enthält die GHS-Stelle gar keinen Inhalt mehr. */
      return $$(ghs).every(function (g) {
        return g.innerHTML.trim() === "" && g.getBoundingClientRect().height === 0;
      });
    });

    t("Chip in der Editorliste ist neutral", function () {
      document.getElementById("btnSettings").click();
      var li = $$("#editorModal .list__item").filter(function (x) {
        return x.getAttribute("data-id") === id;
      })[0];
      var w = li.querySelector(".list__word");
      var noChip = !pickListItem("Ohne Piktogramme").querySelector(".list__word");
      document.getElementById("btnCloseEditor").click();
      return noChip && w && w.getAttribute("data-word") === "kein" &&
        w.textContent.trim() === "kein Signalwort";
    });

    /* Gegenprobe: kat-02 hat weiterhin ein Signalwort */
    t("kat-02 weiterhin mit Signalwort Gefahr", function () {
      selectCatalyst("kat-02");
      /* Beide Etiketten sind nur im Druck sichtbar (Vorschau zeigt Etikett 1). */
      window.dispatchEvent(new Event("beforeprint"));
      var out = $$(ghs);
      var w = $$(ghs + " .ghs__signal");
      var ok = out.length === 2 &&
        out.every(function (g) { return !g.classList.contains("ghs--nosignal"); }) &&
        w.length === 2 &&
        w.every(function (x) { return x.textContent.trim() === "Gefahr"; });
      window.dispatchEvent(new Event("afterprint"));
      return ok;
    });
  }, 300);
  setTimeout(function () { document.getElementById("test-out").textContent = log.join("\\n"); }, 1200);
});
</script>`;


/* Das Profil wird über den Editor angelegt, damit der reguläre Weg geprüft wird. */
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
