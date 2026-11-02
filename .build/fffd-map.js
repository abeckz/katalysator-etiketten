/*
 * Diagnose: listet alle U+FFFD-Stellen mit Kontext auf.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
const t = fs.readFileSync(file, 'utf8');
const out = [];
let i = t.indexOf('\uFFFD');
while (i >= 0) {
    out.push({
        at: i,
        before: t.slice(Math.max(0, i - 55), i),
        after: t.slice(i + 1, i + 25)
    });
    i = t.indexOf('\uFFFD', i + 1);
}
fs.writeFileSync(path.join(__dirname, 'out', 'fffd.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('U+FFFD gesamt:', out.length);
out.slice(0, 45).forEach(function (o, n) {
    console.log(String(n).padStart(3), '…' + o.before.replace(/\n/g, '⏎') + '⟦FFFD⟧' + o.after.replace(/\n/g, '⏎'));
});
