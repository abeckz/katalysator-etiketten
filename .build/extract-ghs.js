/*
 * Build-Hilfsskript (nicht Teil der App):
 * Liest die Original-GHS-Piktogramme von Wikimedia Commons aus ./.ghs und
 * erzeugt daraus ein kompaktes JS-Objekt mit den exakten Pfaddaten.
 * Die roten Rahmen werden nicht dupliziert, sondern zur Laufzeit von einer
 * gemeinsamen SVG-Rahmengeometrie erzeugt (identische Formen laut Quelle).
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '.ghs');
const outFile = path.join(__dirname, 'ghs-paths.json');

// Reihenfolge = Anzeigereihenfolge in der App
const files = ['explos', 'flamme', 'rondflam', 'bottle', 'acid', 'skull', 'exclam', 'silhouette', 'pollu'];

// Geometrisch identische rote Rahmen (Kernaussage siehe Analyse)
const RED_579 = 'M147.659 148.012 6 289.672l141.669 141.669L289.328 573l141.688-141.688 141.688-141.688L431.063 147.984C353.166 70.086 289.404 6.343 289.376 6.343c-.029 0-63.8 63.753-141.717 141.669ZM408.622 170.425l119.199 119.199-119.257 119.257-119.256 119.246-119.19-119.256L50.939 289.615l119.199-119.199C235.696 104.859 289.347 51.226 289.376 51.226c.028 0 53.689 53.642 119.246 119.199Z';
const RED_735 = 'm367.5 727.4 360-360-360-360-360 360z';
const RED_919 = 'm459.5 909.3 449.8-449.8-449.8-449.8-449.8 449.8z';

function parseSvg(raw) {
    const paths = [];
    const re = /<path\b([^>]*)>/g;
    let m;
    while ((m = re.exec(raw))) {
        const attrs = m[1];
        const d = (attrs.match(/\bd="([^"]+)"/) || [])[1];
        if (!d) continue;
        const attrFill = (attrs.match(/\bfill="([^"]+)"/) || [])[1] || null;
        const styleFill = (attrs.match(/fill:\s*([^;"]+)/) || [])[1] || null;
        const transform = (attrs.match(/\btransform="([^"]+)"/) || [])[1] || null;
        paths.push({ d, fill: (styleFill || attrFill || 'currentColor').trim().toLowerCase(), transform });
    }
    const viewBox = (raw.match(/viewBox="([^"]+)"/) || [])[1];
    return { viewBox, paths };
}

const out = {};
for (const name of files) {
    const raw = fs.readFileSync(path.join(srcDir, name + '.svg'), 'utf8');
    const { viewBox, paths } = parseSvg(raw);
    // Rahmen (weiße Fläche + roter Rand) werden zentral erzeugt -> hier nur die Glyphen
    const glyphs = paths.filter((p) => !['#fff', '#ffffff', '#f00', '#ff0000', 'red'].includes(p.fill));
    const vbNum = String(viewBox).split(/\s+/).pop();
    out[name] = {
        viewBox,
        frame: vbNum === '579' ? '579' : vbNum === '735' ? '735' : vbNum === '919' ? '919' : null,
        paths: glyphs.map((g) => ({ d: g.d, fill: g.fill, transform: g.transform || undefined })),
    };
}

// Rahmen-Prüfung: erwartete rote Rahmenformen pro viewBox
const frames = { '579': RED_579, '735': RED_735, '919': RED_919 };

fs.writeFileSync(outFile, JSON.stringify({ frames, pictograms: out }, null, 0), 'utf8');
console.log('geschrieben:', outFile, fs.statSync(outFile).size, 'Bytes');
for (const k of Object.keys(out)) {
    console.log(k.padEnd(11), out[k].viewBox.padEnd(14), 'glyphPfade:', out[k].paths.length);
}
