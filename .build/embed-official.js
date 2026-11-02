/*
 * Build-Hilfsskript (nicht Teil der App): setzt die GHS-Daten in
 * katalysator-etiketten.html auf die offiziellen Originale zurueck.
 *
 *   node .build/embed-official.js
 *
 * Quelle: .ghs-official/*.svg  (UNECE-Vorlagen von Wikimedia Commons,
 * gemeinfrei). Die Pfaddaten werden ZEICHENGENAU uebernommen, inklusive
 * viewBox, transform und fill-rule – es wird keine Koordinate umgerechnet.
 *
 * Geschrieben werden je Piktogramm:
 *   viewBox   -> wie im Original (579 / 735 / 919 / 5790)
 *   paths[]   -> das Symbol (schwarze Glyphen)
 *   overlay[] -> die Raute (weisse Flaeche + roter Rand) aus dem Original.
 *                Dadurch sitzt der undurchsichtige weisse Hintergrund exakt
 *                in der Originalgeometrie, in jedem viewBox.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlFile = path.join(root, 'katalysator-etiketten.html');
const srcDir = path.join(root, '.ghs-official');

const ORDER = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];

/* Farben, die Hintergrund bzw. Rahmen darstellen (nicht das Symbol) */
const BG_FILLS = ['#fff', '#ffffff', 'red', '#f00', '#ff0000'];

function parseSvg(raw) {
    const viewBox = (raw.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 579 579';
    const glyphs = [];
    const overlay = [];
    const re = /<path\b([^>]*)>/g;
    let m;
    while ((m = re.exec(raw))) {
        const a = m[1];
        const d = (a.match(/\bd="([^"]+)"/) || [])[1];
        if (!d) continue;
        const attrFill = (a.match(/\bfill="([^"]+)"/) || [])[1] || null;
        const styleFill = (a.match(/fill:\s*([^;"]+)/) || [])[1] || null;
        const transform = (a.match(/\btransform="([^"]+)"/) || [])[1] || null;
        const rule = (a.match(/fill-rule="([^"]+)"/) || [])[1] || null;
        const fill = String(styleFill || attrFill || '#000').trim().toLowerCase();
        const entry = { d: d, fill: fill === 'currentcolor' ? '#000000' : fill };
        if (transform) entry.transform = transform;
        if (rule) entry.rule = rule;
        /* Raute (weiss/rot) gehoert zum Hintergrund, alles andere ist Symbol */
        if (BG_FILLS.indexOf(fill) >= 0) overlay.push(entry);
        else glyphs.push(entry);
    }
    return { viewBox: viewBox, glyphs: glyphs, overlay: overlay };
}

let html = fs.readFileSync(htmlFile, 'utf8');
const before = html.length;
const EOL = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

ORDER.forEach(function (key) {
    const raw = fs.readFileSync(path.join(srcDir, key + '.svg'), 'utf8');
    const parsed = parseSvg(raw);

    const anchor = "key: '" + key + "',";
    const at = html.indexOf(anchor);
    if (at < 0) throw new Error('Eintrag "' + key + '" nicht gefunden');
    const lineStart = html.lastIndexOf('\n', at) + 1;
    const lineEnd = html.indexOf(EOL, at);
    if (lineEnd < 0) throw new Error('Zeilenende für "' + key + '" fehlt');
    const line = html.slice(lineStart, lineEnd);

    const pathsAt = line.indexOf('paths:');
    if (pathsAt < 0) throw new Error('paths-Feld für "' + key + '" fehlt');
    let head = line.slice(0, pathsAt);
    head = head.replace(/viewBox: '[^']*'/, "viewBox: '" + parsed.viewBox + "'");
    head = head.replace(/frame: '[^']*'/, 'frame: null');

    let depth = 0;
    let inStr = false;
    let i = pathsAt + 6;
    for (; i < line.length; i += 1) {
        const ch = line[i];
        if (inStr) {
            if (ch === '\\') { i += 1; continue; }
            if (ch === '"') inStr = false;
            continue;
        }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '[') depth += 1;
        else if (ch === ']') { depth -= 1; if (depth === 0) break; }
    }
    if (i >= line.length) throw new Error('paths-Ende für "' + key + '" fehlt');
    let tail = line.slice(i + 1);
    tail = tail.replace(/,?\s*overlay: \[[\s\S]*?\]\s*(?=\})/, '');

    const rebuilt = head + 'paths: ' + JSON.stringify(parsed.glyphs) +
        ', overlay: ' + JSON.stringify(parsed.overlay) + tail;

    html = html.slice(0, lineStart) + rebuilt + html.slice(lineEnd);
    console.log('  •', key.padEnd(11), 'viewBox=' + parsed.viewBox.padEnd(14),
        'raute=' + parsed.overlay.length, 'glyphen=' + parsed.glyphs.length);
});

fs.writeFileSync(htmlFile, html, 'utf8');
console.log('fertig:', before, '->', Buffer.byteLength(html, 'utf8'), 'Bytes');
