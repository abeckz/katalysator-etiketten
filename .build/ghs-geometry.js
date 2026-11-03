/*
 * Build-Hilfsskript (nicht Teil der App): misst die Etiketten-Geometrie
 * (Felder links untereinander, GHS-Gruppe rechts) für 0..6 Piktogramme und
 * prüft, dass sich Rauten, Signalwort, Felder und Empfängerbox nicht überdecken.
 * Die App läuft dafür in einem iframe; gemessen wird gegen die unskalierte
 * Blattgröße (210 mm), damit die Live-Vorschau-Skalierung keine Rolle spielt.
 *   node .build/ghs-geometry.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const cases = {
    0: { symbols: [], name: 'Katalysator Cu/ZnO', production: 'Charge 24/0417' },
    1: { symbols: ['explos'], name: 'Katalysator Cu/ZnO', production: 'Charge 24/0417' },
    2: { symbols: ['flamme', 'exclam'], name: 'Katalysator Pd/C', production: 'Charge 24/0417' },
    3: { symbols: ['flamme', 'skull', 'silhouette'], name: 'Katalysator Ni-Tr', production: 'Charge 24/0417' },
    4: { symbols: ['flamme', 'bottle', 'skull', 'silhouette'], name: 'Katalysator Ru/C', production: 'Charge 24/0417' },
    5: { symbols: ['explos', 'flamme', 'bottle', 'skull', 'exclam'], name: 'Katalysator Cu/ZnO', production: 'Charge 24/0417' },
    6: { symbols: ['explos', 'flamme', 'bottle', 'acid', 'skull', 'exclam'], name: 'Katalysator Al2O3', production: 'Charge 24/0417' },
    /* Grenzfall: Katalysator an der Zeichengrenze (15), Produktion zweizeilig */
    long: {
        symbols: ['flamme', 'bottle', 'acid', 'skull', 'silhouette', 'pollu'],
        name: 'Katalysator NiMo',
        furnace: 'C300',
        production: 'Charge 24/0417 Reaktor B2 Sud 15'
    }
};

/* Der Messcode läuft im Elternfenster und steuert die App im iframe. */
const probe = `
<pre id="gg-out">laeuft</pre>
<iframe id="fr" style="position:absolute;left:0;top:40px;width:1200px;height:1000px;border:0"></iframe>
<script>
var CASES = ${JSON.stringify(cases)};
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
window.addEventListener('load', function () { setTimeout(run, 300); });

async function run() {
  var out = [];
  var PX = 96 / 25.4;
  var mm = function (px) { return Math.round((px / PX) * 100) / 100; };
  try {
    var fr = document.getElementById('fr');
    fr.src = ${JSON.stringify('file:///' + src.replace(/\\/g, '/'))};
    await new Promise(function (r) { fr.addEventListener('load', r, { once: true }); });
    var W = fr.contentWindow, D = fr.contentDocument;
    D.querySelector('.panel').style.display = 'none';
    D.querySelector('.workspace').style.display = 'block';
    D.querySelector('.sheet-stage').style.padding = '0';
    W.dispatchEvent(new Event('beforeprint'));
    await sleep(150);
    D.getElementById('btnSettings').click();
    await sleep(150);
    var ns = Object.keys(CASES);
    for (var ci = 0; ci < ns.length; ci += 1) {
      var n = ns[ci];
      var keys = CASES[n].symbols;
      D.querySelectorAll('.ghs-opt').forEach(function (b) {
        var on = b.classList.contains('is-active');
        var want = keys.indexOf(b.getAttribute('data-key')) >= 0;
        if (on !== want && !b.disabled) b.click();
      });
      await sleep(40);
      D.getElementById('eName').value = CASES[n].name;
      D.getElementById('btnEditorSave').click();
      if (CASES[n].production !== undefined) {
        D.getElementById('fProduction').value = CASES[n].production;
        D.getElementById('fProduction').dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (CASES[n].furnace) {
        var f = D.getElementById('fFurnace');
        f.value = CASES[n].furnace;
        f.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await sleep(90);

      var sheet = D.getElementById('sheet');
      var L = D.querySelector('.label[data-index="0"]');
      var sheetRect = sheet.getBoundingClientRect();
      /* Layoutbreite (unskaliert) statt sichtbarer Breite: die Vorschau
         skaliert per transform, das darf die Messung nicht verzerren. */
      var layoutW = sheet.offsetWidth || sheetRect.width;
      var S = 793.7 / layoutW;
      var rel = function (r) {
        return {
          left: (r.left - sheetRect.left) * S, right: (r.right - sheetRect.left) * S,
          top: (r.top - sheetRect.top) * S, bottom: (r.bottom - sheetRect.top) * S,
          width: r.width * S, height: r.height * S
        };
      };
      var get = function (sel) {
        var e = L.querySelector(sel);
        return e ? rel(e.getBoundingClientRect()) : null;
      };
      var lbl = rel(L.getBoundingClientRect());
      var dias = [].map.call(L.querySelectorAll('.ghs__dia'), function (d) {
        return rel(d.getBoundingClientRect());
      });
      var ghs = get('.ghs'), grid = get('.ghs__grid'), sig = get('.ghs__signal');
      var rec = get('.recipient'), fields = get('.label__fields'), left = get('.label__left');
      var missing = [['ghs', ghs], ['recipient', rec], ['fields', fields], ['left', left]]
        .filter(function (p) { return !p[1]; }).map(function (p) { return p[0]; });
      /* Ohne Piktogramme gibt es kein Raster/Signalwort-Element (die App zeigt
         dann den Platzhalter) – das ist kein Fehler. */
      if (dias.length && !grid) missing.push('grid');
      if (dias.length && !sig) missing.push('signal');
      var over = function (a, b) {
        return a && b && a.left < b.right - 0.5 && b.left < a.right - 0.5 &&
               a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      };
      var problems = missing.length ? ['nicht gefunden: ' + missing.join(',')] : [];
      dias.forEach(function (d, i) {
        if (over(d, sig)) problems.push('Raute ' + i + ' ueberdeckt Signalwort');
        if (over(d, rec)) problems.push('Raute ' + i + ' ueberdeckt Empfaenger');
        if (over(d, fields)) problems.push('Raute ' + i + ' ueberdeckt Felder');
        if (d.right > lbl.right + 0.5 || d.bottom > lbl.bottom + 0.5) problems.push('Raute ' + i + ' ausserhalb');
      });
      if (!missing.length) {
        if (over(sig, rec)) problems.push('Signalwort ueberdeckt Empfaenger');
        if (over(ghs, fields)) problems.push('GHS-Gruppe ueberdeckt Felder');
        if (over(rec, fields)) problems.push('Empfaenger ueberdeckt Felder');
        if (!(ghs.left > fields.right - 0.5)) problems.push('GHS nicht rechts der Felder');
        if (dias.length && !(sig.top >= (grid ? grid.bottom : ghs.top) - 0.5)) {
          problems.push('Signalwort nicht unter den Rauten');
        }
        if (!(fields.left > left.right - 0.5)) problems.push('Felder nicht rechts der Trennlinie');
      }
      if (L.scrollHeight > L.clientHeight + 1) problems.push('Etikett laeuft ueber');
      var f = function (r) { return r ? mm(r.width) + 'x' + mm(r.height) : '-'; };
      out.push('n=' + n +
        ' label=' + f(lbl) +
        ' leftCol=' + (left ? mm(left.width) : '-') +
        ' fields=' + f(fields) +
        ' ghs=' + f(ghs) + ' grid=' + f(grid) +
        (dias.length ? ' dia=' + mm(dias[0].width) : '') +
        ' signal=' + f(sig) +
        ' recipient=' + f(rec) +
        ' | ' + (problems.length ? 'PROBLEM: ' + problems.join(', ') : 'OK'));
    }
    if (D.querySelector('#btnEditorCancel')) D.querySelector('#btnEditorCancel').click();
    await sleep(150);
  } catch (e) {
    out.push('FEHLER: ' + (e && (e.stack || e.message) || e));
  }
  document.getElementById('gg-out').textContent = out.join('\\n');
}
</script>
`;

const tmp = path.join(__dirname, 'out', 'ghs-geometry.html');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(tmp, probe, 'utf8');
const url = 'file:///' + tmp.replace(/\\/g, '/');
const chromeArgs = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--virtual-time-budget=15000', '--window-size=1200,1100'];

const dom = execFileSync(chrome, chromeArgs.concat(['--dump-dom', url]), { encoding: 'utf8', maxBuffer: 1 << 28 });

const m = dom.match(/<pre id="gg-out">([\s\S]*?)<\/pre>/);
const text = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    : 'Messung nicht gefunden';
console.log(text);

/* Screenshot des Etiketts zur Sichtprüfung */
const png = path.join(__dirname, 'out', 'label-layout.png');
execFileSync(chrome, chromeArgs.concat(['--force-device-scale-factor=1', '--screenshot=' + png, url]));
console.log('\nScreenshot: ' + png);

process.exitCode = /PROBLEM|FEHLER|nicht gefunden/.test(text) ? 1 : 0;
