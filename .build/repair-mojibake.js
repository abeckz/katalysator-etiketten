/*
 * Einmalige Reparatur: U+FFFD aus ungueltigen Bytes rekonstruieren.
 * Die Ersatzzeichen werden anhand des Textkontexts gesetzt
 * (deutsche Texte/Etiketten dieser Datei).
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
let text = fs.readFileSync(file, 'utf8');

/* je Fundstelle (in Dokumentreihenfolge) das richtige Zeichen */
const REPLACEMENTS = [
    '\u2013', // Titel: Ausbau Katalysator - DIN A5
    '\u2013', // Kommentar: (148,5 x 210 mm) - absolut positioniert
    '\u00c4', // title: Aenderungen in diese HTML-Datei schreiben
    '\u2013', // summary__word Platzhalter
    '\u00c4', // saveStatus: Bereit - Aenderungen werden ...
    '\u00c4', // saveStatus zweiter Treffer
    '\u00dc', // Selbst-Speichern: Ueber Speichern
    '\u00d7', // Vorschau A4 - 2 x DIN A5
    '\u00d7', // 148,5 x 210 mm
    '\u00df', // Schliessen
    '\u00df', // Editor schliessen
    '\u2013', // Platzhalter: z. B. Kat. 4 - Cu/ZnO
    '\u2013', // Option: - kein Signalwort -
    '\u2013', // Option: - kein Signalwort - (zweiter Treffer)
    '\u2013', // Maximal 6 Piktogramme - weitere ...
    '\u2013'  // Noch keine Eintraege - links den ersten ...
];

let n = 0;
text = text.replace(/\uFFFD[\u0000-\u001f]?/g, function () {
    const next = REPLACEMENTS[n];
    n += 1;
    return next === undefined ? '' : next;
});

/* letzte Reste: verbliebene Steuerzeichen entfernen */
text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');

fs.writeFileSync(file, text, 'utf8');
console.log('Ersetzt:', n, '| verbleibend U+FFFD:', (text.match(/\uFFFD/g) || []).length);
