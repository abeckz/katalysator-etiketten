/* Prüft: Breite der drei Zusatzzeilen (dürfen nicht 0 sein) + Vorschau-Höhe. */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

const url = 'file:///' + htmlFile.replace(/\\/g, '/');
const probeFile = path.join(outDir, 'width-probe.html');

const probe = `
<pre id="probe">-</pre>
<script>
(function () {
  var l = document.querySelector('.label[data-index="0"]');
  var rows = Array.prototype.slice.call(l.querySelectorAll('.label__fields > .lrow'));
  var out = [];
  rows.forEach(function (r, i) {
    var v = r.querySelector('.lrow__v');
    var cs = getComputedStyle(v);
    out.push('Zeile ' + (i + 1) + ' width=' + v.getBoundingClientRect().width.toFixed(1) +
      'px borderWidth=' + cs.borderBottomWidth);
  });
  var sh = document.getElementById('sheet');
  var sl = document.getElementById('sheetLabels');
  out.push('sheetH=' + getComputedStyle(sh).height + ' labelsH=' + getComputedStyle(sl).height +
    ' zoom=' + getComputedStyle(sh).getPropertyValue('--zoom'));
  document.getElementById('probe').textContent = out.join('\\n');
})();
</script>
</body>`;

const source = fs.readFileSync(htmlFile, 'utf8');
fs.writeFileSync(probeFile, source.replace('</body>', probe), 'utf8');

const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--virtual-time-budget=5000', '--window-size=1400,1000',
  '--dump-dom', 'file:///' + probeFile.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });

const dom = res.stdout || '';
const out = (dom.match(/<pre id="probe">([\s\S]*?)<\/pre>/) || [])[1] || '(keine Messwerte)';
console.log(out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
