/*
 * Build-Hilfsskript (nicht Teil der App): erzeugt aus den offiziellen
 * GHS-SVGs (.ghs-official/, UNECE-Quelle, gemeinfrei) die Pfaddaten fuer
 * die App und schreibt sie nach .build/ghs-paths.json.
 *
 *   node .build/ghs-extract.js
 *
 * Es wird NICHTS an der Geometrie veraendert:
 *   - Pfaddaten werden unveraendert uebernommen (keine Koordinaten-Umrechnung)
 *   - der Inkscape-transform="scale(0.8)" wandert als transform-Attribut
 *     an das jeweilige <path> (bleibt damit 1:1 wie im Original)
 *   - der viewBox bleibt der Original-viewBox (579 / 735 / 919 / 5790)
 * Gerendert wird also exakt das offizielle Symbol.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '.ghs-official');
const FILES = {
    explos: 'explos.svg',
    flamme: 'flamme.svg',
    rondflam: 'rondflam.svg',
    bottle: 'bottle.svg',
    acid: 'acid.svg',
    skull: 'skull.svg',
    exclam: 'exclam.svg',
    silhouette: 'silhouette.svg',
    pollu: 'pollu.svg'
};
const CODES = {
    explos: ['GHS01', 'Explosiv'],
    flamme: ['GHS02', 'Entzündbar'],
    rondflam: ['GHS03', 'Oxidierend'],
    bottle: ['GHS04', 'Gase unter Druck'],
    acid: ['GHS05', 'Korrosiv'],
    skull: ['GHS06', 'Giftig'],
    exclam: ['GHS07', 'Reizend, Achtung'],
    silhouette: ['GHS08', 'Gesundheitsgefahr'],
    pollu: ['GHS09', 'Umweltgefährlich']
};

/* Attribute eines Tags lesen */
function attrs(tag) {
    const out = {};
    const re = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(tag))) out[m[1]] = m[2];
    return out;
}
/* style="fill:#fff;stroke:none" -> { fill: '#fff' } */
function styleMap(style) {
    const out = {};
    String(style || '').split(';').forEach(function (part) {
        const i = part.indexOf(':');
        if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    });
    return out;
}

const result = { pictograms: [] };
Object.keys(FILES).forEach(function (key) {
    const svg = fs.readFileSync(path.join(srcDir, FILES[key]), 'utf8');
    const svgTag = (svg.match(/<svg[^>]*>/) || [''])[0];
    const viewBox = attrs(svgTag).viewBox || '0 0 579 579';
    const transform = attrs(svgTag).transform || '';

    /* alle <path> samt umschliessendem <g transform="..."> einsammeln */
    const paths = [];
    const re = /(<g[^>]*>)|(<path[^>]*\/?>)|(<\/g>)/g;
    let m;
    let groupTf = '';
    while ((m = re.exec(svg))) {
        if (m[1]) {
            groupTf = attrs(m[1]).transform || '';
        } else if (m[3]) {
            groupTf = '';
        } else {
            const a = attrs(m[2]);
            if (!a.d) continue;
            const st = styleMap(a.style);
            const entry = {
                d: a.d,
                fill: a.fill || st.fill || '#000'
            };
            const tf = a.transform || groupTf;
            if (tf) entry.transform = tf;
            if (a['fill-rule']) entry.rule = a['fill-rule'];
            if (st['fill-opacity'] || a['fill-opacity']) {
                /* waere durchscheinend – fuer die App nicht zulaessig */
                entry.opacity = st['fill-opacity'] || a['fill-opacity'];
            }
            paths.push(entry);
        }
    }

    result.pictograms.push({
        key: key,
        code: CODES[key][0],
        name: CODES[key][1],
        viewBox: viewBox,
        transform: transform || undefined,
        paths: paths
    });
    console.log(key.padEnd(11), 'vb=' + viewBox.padEnd(14),
        'pfade=' + String(paths.length).padEnd(3),
        'root-tf=' + (transform || '-'));
});

const out = path.join(__dirname, 'ghs-paths.json');
fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');
console.log('geschrieben:', out, '(' + fs.statSync(out).size + ' Bytes)');
