/*
 * Sanity-Check der Einzeldatei (keine externen Abhängigkeiten).
 *   node .build/file-check.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'katalysator-etiketten.html');
const t = fs.readFileSync(file, 'utf8');

const rows = [
    ['Groesse (KB)', (Buffer.byteLength(t) / 1024).toFixed(0)],
    ['Zeilen', t.split('\n').length],
    ['Ersatzzeichen U+FFFD', (t.match(/\uFFFD/g) || []).length],
    ['<script> offen/geschlossen', (t.match(/<script/g) || []).length + ' / ' + (t.match(/<\/script>/g) || []).length],
    ['<template> offen/geschlossen', (t.match(/<template/g) || []).length + ' / ' + (t.match(/<\/template>/g) || []).length],
    ['embedded-data vorhanden', /id="embedded-data"/.test(t)],
    ['showSaveFilePicker', /showSaveFilePicker/.test(t)],
    ['Download-Fallback', /download\s*=/.test(t)],
    ['localStorage', /localStorage/.test(t)],
    ['9 GHS-Piktogramme', (t.match(/code: 'GHS0\d'/g) || []).length],
    ['setProperty(--scale)', /setProperty\('--scale'/.test(t)],
    /* Die Bildschirm-Skalierung steckt in `--zoom`; `--scale` darf es nicht
       mehr geben (sonst wirkte die Vorschau auf den Druck). */
    ['setProperty(--zoom)', /setProperty\('--zoom'/.test(t)],
    ['applyPrintStyles', /function applyPrintStyles\(\)/.test(t)],
    ['@media print ohne Scrollen', /@media print\{[\s\S]*?place-items:start!important/.test(t)],
    ['exclam viewBox 5790', /key: 'exclam'[^\n]*0 0 5790 5790/.test(t)],
    ['GHS-Raute (overlay)', /overlay: \[\{"d":"[^"]+"[^\]]*"#fff"/.test(t) || /overlay: \[/.test(t)],
];
rows.forEach(([k, v]) => console.log(String(k).padEnd(28) + v));
