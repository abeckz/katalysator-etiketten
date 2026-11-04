/*
 * Ruft ein vorhandenes Prüfskript unter .build/ auf und leitet dessen
 * headless-Chrome-Aufruf (`--dump-dom`) über eine Datei um. Nötig, weil
 * Chrome seine Ausgabe auf dieser Maschine über eine benannte Pipe liefert –
 * der direkte Aufruf von `node .build/<skript>.js` bleibt dadurch leer.
 * Die Prüfskripte selbst bleiben unverändert.
 *
 *   node .build/run-checks.js signal-check.js
 *   node .build/run-checks.js ui-check.js
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const name = process.argv[2];
const realMs = Number(process.argv[3] || 6000);   /* echte Wartezeit vor dem DOM-Dump */
const winSize = process.argv[4] || '1400,1000';
const root = path.join(__dirname, '..');
const script = path.join(__dirname, name || '');
if (!name || !fs.existsSync(script)) {
    console.error('Aufruf: node .build/run-checks.js <skript.js> [wartezeit_ms] [breite,hoehe]');
    process.exit(2);
}

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
const probe = path.join(outDir, 'probe-out.html');
const errFile = path.join(outDir, 'probe-out.err');
const profile = path.join(outDir, 'headless-profile');

/* Chrome startet mit `--dump-dom` in eine Datei. Die Prüfskripte arbeiten mit
   setTimeout-Ketten; `--virtual-time-budget` lässt sich dafür nicht mit dem
   Dump kombinieren, deshalb wird der Dump erst nach `realMs` angefordert. */
const original = cp.execFileSync;
function dumpDom(file, args) {
    const rest = args.filter(function (a) {
        return a !== '--dump-dom' && !/^--user-data-dir=/.test(a) &&
            !/^--virtual-time-budget=/.test(a) && !/^--window-size=/.test(a);
    });
    fs.rmSync(probe, { force: true });
    fs.rmSync(errFile, { force: true });
    fs.rmSync(profile, { recursive: true, force: true });
    const fdOut = fs.openSync(probe, 'w');
    const fdErr = fs.openSync(errFile, 'w');
    try {
        original(file, rest.concat(['--no-first-run', '--no-default-browser-check',
            '--user-data-dir=' + profile, '--window-size=' + winSize,
            '--virtual-time-budget=' + realMs, '--dump-dom']),
        { stdio: ['ignore', fdOut, fdErr], maxBuffer: 1 << 28 });
    } finally {
        fs.closeSync(fdOut);
        fs.closeSync(fdErr);
    }
    return fs.readFileSync(probe, 'utf8');
}

cp.execFileSync = function (file, args) {
    if (!Array.isArray(args) || args.indexOf('--dump-dom') < 0) {
        return original.apply(this, arguments);
    }
    return dumpDom(file, args);
};

process.chdir(root);
require(script);

