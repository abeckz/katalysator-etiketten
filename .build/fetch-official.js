/*
 * Build-Hilfsskript (nicht Teil der App): laedt die neun offiziellen
 * GHS-Piktogramme (UNECE-Quelle, Wikimedia-Commons-Dateien, gemeinfrei)
 * als SVG nach .ghs-official/ und prueft die Struktur.
 *   node .build/fetch-official.js
 * Es wird nichts an der Geometrie veraendert – nur heruntergeladen und
 * inspiziert (viewBox, transform, Fuellungen, Deckkraft).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const NAMES = {
    explos: 'GHS-pictogram-explos.svg',
    flamme: 'GHS-pictogram-flamme.svg',
    rondflam: 'GHS-pictogram-rondflam.svg',
    bottle: 'GHS-pictogram-bottle.svg',
    acid: 'GHS-pictogram-acid.svg',
    skull: 'GHS-pictogram-skull.svg',
    exclam: 'GHS-pictogram-exclam.svg',
    silhouette: 'GHS-pictogram-silhouette.svg',
    pollu: 'GHS-pictogram-pollu.svg'
};

const dir = path.join(__dirname, '..', '.ghs-official');
fs.mkdirSync(dir, { recursive: true });

function url(file) {
    /* Special:FilePath liefert die Originaldatei */
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function get(u, redirects) {
    return new Promise(function (resolve, reject) {
        https.get(u, { headers: { 'User-Agent': 'katalysator-labels-build/1.0 (SVG sync)' } }, function (res) {
            if ((res.statusCode === 429 || res.statusCode === 503) && redirects > 0) {
                /* Rate-Limit: kurz warten und erneut versuchen */
                res.resume();
                sleep(2500).then(function () { resolve(get(u, redirects - 1)); });
                return;
            }
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
                res.resume();
                resolve(get(res.headers.location, redirects - 1));
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error('HTTP ' + res.statusCode + ' fuer ' + u));
                return;
            }
            const chunks = [];
            res.on('data', function (c) { chunks.push(c); });
            res.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
        }).on('error', reject);
    });
}

(async function () {
    for (const key of Object.keys(NAMES)) {
        const file = NAMES[key];
        const target = path.join(dir, key + '.svg');
        if (fs.existsSync(target) && fs.statSync(target).size > 300) {
            console.log(key.padEnd(11), 'vorhanden, uebersprungen');
            continue;
        }
        try {
            const svg = await get(url(file), 8);
            fs.writeFileSync(target, svg, 'utf8');
            const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
            const tf = (svg.match(/transform="([^"]+)"/) || [])[1];
            const paths = (svg.match(/<path/g) || []).length;
            const opac = (svg.match(/opacity/g) || []).length;
            console.log(key.padEnd(11), (svg.length + ' B').padEnd(9),
                'vb=' + String(vb).padEnd(15), 'p=' + String(paths).padEnd(3),
                'tf=' + (tf ? tf : '-').padEnd(16), 'opacity=' + opac);
        } catch (e) {
            console.log(key.padEnd(11), 'FEHLER ' + e.message);
        }
        await sleep(1500);
    }
})();
