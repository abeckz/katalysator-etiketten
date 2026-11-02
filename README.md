# Ausbau Katalysator – Etiketten (Einzeldatei)

Eine einzige, in sich geschlossene HTML-Datei `katalysator-etiketten.html`
(keine externen Abhängigkeiten, keine CDN-Links). Sie erzeugt zwei
DIN-A5-Etiketten „Ausbau Katalysator“ auf einem A4-Blatt (Avery 3655).

## Bedienung

1. Datei im Browser öffnen (Chrome/Edge empfohlen).
2. Katalysator, Ausbaudatum, Ofen und „ex Produktion“ wählen – beide Etiketten
   aktualisieren sich live.
3. **Speichern** schreibt die Daten in die HTML-Datei selbst
   (File System Access API). Ohne Schreibzugriff wird die Datei als Download
   abgelegt; zusätzlich liegt der Stand im `localStorage`.
4. **Zahnrad** öffnet den Stammdateneditor (Katalysatoren anlegen/ändern/löschen,
   max. 20 Profile, max. 6 GHS-Piktogramme je Profil).
5. **Drucken**: A4 Hochformat, Skalierung 100 %, Ränder „keine“.

## Aufbau

* `.sheet` = A4 (210 × 297 mm); Bildschirm-Vorschau über
  `transform: scale(var(--zoom))` in `.sheet-fit`.
* `.sheet__labels` enthält zwei `article.label` (je 210 × 148,5 mm, A5 quer),
  untereinander: Etikett 1 bei `top: 0`, Etikett 2 bei `top: 148,5 mm`.
* Innen: linke Titelspalte (90° gedreht), rechts Datenblock, GHS-Rauten +
  Signalwort, Empfängerbox. 5 mm Rand je Etikett.
* Die Etiketten werden aus `<template id="labelTemplate">` geklont
  (`buildLabels()` im Skript), damit Markup nur einmal gepflegt wird.
* GHS-Piktogramme sind als Pfaddaten eingebettet (9 Symbole, GHS01–GHS09),
  Rahmengeometrie je Ursprungs-`viewBox` (579/735/919).

## Druck

`@page { size: A4 portrait; margin: 0 }`; die Vorschau-Skalierung wird über
`beforeprint` auf `--zoom: 1` gesetzt, das Blatt steht statisch auf 210 × 297 mm.
Ergebnis: genau eine A4-Seite (per PDF geprüft).

## Prüfskripte (`.build/`)

Reine Entwicklungshilfen – nicht Teil der App, keine Laufzeitabhängigkeit.

| Skript | Zweck |
| --- | --- |
| `ui-check.js` | Screenshots + PDF (1 Seite, A4), DOM-Assertions |
| `behavior-check.js` | Ablauftests: Selects, Live-Updates, GHS-Limit, Editor, localStorage |
| `print-measure.js` | misst die Druckgeometrie (mm) nach `beforeprint` |
| `file-check.js` | Struktur-/Encoding-Sanity der Einzeldatei |
| `measure.js` | Geometrie des GHS-Bereichs im Browser |
| `inline-ghs.js` | bettet GHS-Pfade ein (idempotent) |
| `fix-exclam.js` | korrigiert viewBox/Pfadskala von GHS07 |
| `fix-encoding.js`, `repair-mojibake.js` | Encoding-Reparaturen (idempotent) |

Aufruf im Projektordner:

```powershell
node .build/ui-check.js
node .build/behavior-check.js
node .build/print-measure.js
node .build/file-check.js
```

`ui-check.js` legt `screen-1400.png`, `druck.pdf` und weitere Artefakte in
`.build/out/` ab.
