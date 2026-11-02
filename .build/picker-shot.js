/*
 * Build-Hilfsskript (nicht Teil der App): Screenshot nur der GHS-Auswahl
 * (beide Themes) zur Sichtprüfung der Symbolgröße.
 *   node .build/picker-shot.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const outDir = path.join(__dirname, 'out');

const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chrome = chromeCandidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Kein Chromium gefunden');

function shot(name, theme) {
    const probe = [
        '<script>',
        'window.addEventListener("load", function () {',
        theme ? '  document.documentElement.setAttribute("data-theme", "' + theme + '");' : '',
        '  setTimeout(function () {',
        '    document.getElementById("btnSettings").click();',
        '    /* Auswahlraster aus dem Editor kopieren, danach den Dialog schließen –',
        '       so zeigt der Screenshot nur die Kacheln. */',
        '    var src = document.getElementById("ePicker");',
        '    var pane = src.parentNode.cloneNode(true);',
        '    pane.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });',
        '    var wrap = document.createElement("div");',
        '    wrap.id = "picker-shot";',
        '    wrap.style.cssText = "position:fixed;inset:0;z-index:9999;background:var(--surface);" +',
        '      "padding:14px;overflow:auto";',
        '    wrap.appendChild(pane);',
        '    document.body.appendChild(wrap);',
        '    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });',
        '  }, 200);',
        '});',
        '</script>'
    ].join('\n');

    let html = fs.readFileSync(htmlFile, 'utf8');
    html = html.replace('</body>', probe + '\n</body>');
    const tmp = path.join(outDir, 'picker-' + name + '.html');
    fs.writeFileSync(tmp, html, 'utf8');
    const png = path.join(outDir, 'picker-' + name + '.png');
    const res = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=2', '--virtual-time-budget=4000',
        '--window-size=460,700', '--screenshot=' + png,
        'file:///' + tmp.replace(/\\/g, '/')], { encoding: 'utf8' });
    console.log((fs.existsSync(png) ? 'OK  ' : 'FAIL') + '  ' + png + (fs.existsSync(png) ? '' : '\n' + (res.stderr || '')));
}

shot('light', 'light');
shot('dark', 'dark');
