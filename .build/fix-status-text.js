/*
 * Repariert die Status-Texte, die durch eine fruehere Encoding-Reparatur
 * Ersatzzeichen (U+FFFD) und Tilde-Reste enthalten. Idempotent.
 *   node .build/fix-status-text.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
let t = fs.readFileSync(file, 'utf8');
const before = t;

const fixes = [
    [/setStatus\('dirty', '[^']*'\);/, "setStatus('dirty', 'Ungespeicherte \u00c4nderungen \u2013 \u201eSpeichern\u201c schreibt in die HTML-Datei.');"],
    [/setStatus\('dirty', '[^']*im Browser[^']*'\);/, "setStatus('dirty', 'Ungespeicherte \u00c4nderungen \u2013 im Browser gesichert.');"],
    [/setStatus\('saved', '[^']*handle\.name[^']*'\);/, "setStatus('saved', 'Gespeichert als \u201e' + handle.name + '\u201c \u2013 weitere \u00c4nderungen schreiben direkt dorthin.');"],
    [/setStatus\('saved', '[^']*heruntergeladen[^']*'\);/, "setStatus('saved', 'Datei heruntergeladen \u2013 bitte die bisherige HTML-Datei damit ersetzen.');"],
    [/setStatus\('error', '[^']*'\);/, "setStatus('error', 'Speichern fehlgeschlagen \u2013 \u00c4nderungen bleiben nur im Browser.');"],
    [/setStatus\('idle', 'Bereit[^']*Startdaten[^']*'\);/, "setStatus('idle', 'Bereit \u2013 Startdaten aktiv. Mit \u201eSpeichern\u201c werden sie dauerhaft in die HTML-Datei geschrieben.');"],
    [/setStatus\('idle', 'Bereit[^']*Datei geladen[^']*'\);/, "setStatus('idle', 'Bereit \u2013 Datenbestand aus dieser HTML-Datei geladen.');"],
    [/setStatus\('idle', 'Bereit[^']*gespeichert[^']*'\);/, "setStatus('idle', 'Bereit \u2013 \u00c4nderungen werden in dieser Datei gespeichert.');"]
];

let count = 0;
fixes.forEach(function (pair) {
    t = t.replace(pair[0], function () { count += 1; return pair[1]; });
});

/* Zeile mit "Gespeichert als ..." enthaelt loeschte Umlaute (ASCII-Reste) */
const lines = t.split('\n');
for (let i = 0; i < lines.length; i += 1) {
    if (/setStatus\('saved', 'Gespeichert als ~'/.test(lines[i])) {
        lines[i] = "        setStatus('saved', 'Gespeichert als \u201e' + handle.name + '\u201c \u2013 weitere \u00c4nderungen schreiben direkt dorthin.');";
        count += 1;
    }
}
t = lines.join('\n');

/* Weitere Texte mit geloeschten Umlauten (Toasts, Statusmeldungen, Kommentar) */
const lineFixes = [
    [/showToast\('nderungen in die HTML-Datei geschrieben\.'/, "        showToast('\u00c4nderungen in die HTML-Datei geschrieben.', 'ok');"],
    [/showToast\('Datei gespeichert\. Weitere nderungen/, "        showToast('Datei gespeichert. Weitere \u00c4nderungen gehen direkt in diese Datei.', 'ok');"]
];
{
    const ls = t.split('\n');
    for (let i = 0; i < ls.length; i += 1) {
        for (let k = 0; k < lineFixes.length; k += 1) {
            if (lineFixes[k][0].test(ls[i])) {
                ls[i] = lineFixes[k][1];
                count += 1;
            }
        }
    }
    t = ls.join('\n');
}

const moreFixes = [
    [/setStatus\(state\.dirty \? 'dirty' : 'idle', '[^']*'\);/, "setStatus(state.dirty ? 'dirty' : 'idle', 'Speichern abgebrochen \u2013 \u00c4nderungen bleiben im Browser gesichert.');"],
    [/damit alle nderungen/, 'damit alle \u00c4nderungen']
];
moreFixes.forEach(function (pair) {
    const before2 = t;
    t = t.replace(pair[0], pair[1]);
    if (t !== before2) count += 1;
});

/* Restliche Ersatzzeichen in String-Literalen der Statuszeile melden */
const left = (t.match(/\uFFFD/g) || []).length;

if (t !== before) fs.writeFileSync(file, t, 'utf8');
console.log('Status-Texte ersetzt: ' + count);
console.log('verbleibende U+FFFD in Datei: ' + left);
