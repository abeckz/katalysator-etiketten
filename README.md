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
* GHS-Piktogramme sind die **offiziellen UNECE-Vorlagen** (Wikimedia-Commons-
  Dateien `GHS-pictogram-*.svg`, gemeinfrei) und als Pfaddaten eingebettet
  (9 Symbole, GHS01–GHS09). Quelle: `.ghs/` (die Arbeitskopie der Downloads
  liegt lokal in `.ghs-official/` und wird nicht versioniert).
* Je Piktogramm liegen in der App zwei Felder:
  * `paths` – das Symbol (deckend schwarz, `#000`)
  * `overlay` – die Raute aus derselben Vorlage (deckendes Weiß + roter Rand)
  Beides stammt zeichengenau aus dem Original. Dadurch ist der Hintergrund
  jeder Raute **undurchsichtig weiß** und der rote Rand sitzt exakt wie in
  der Vorlage – unabhängig vom `viewBox` (579 / 735 / 919 / 5790).
* Darstellung der Rauten über `ghsTile()`: `ghsParts()` liefert Raute und
  Symbol, `picGroup()` setzt das Symbol in die Innenraute (50,94 … 527,82).
  `PIC_BOX.k` rechnet den `viewBox`-Raum der Vorlage auf 579 um (Originalgröße
  bleibt erhalten) und `PIC_FIT` enthält die Symbolmitte (`mx`/`my`) je
  Piktogramm – die Originale sitzen unterschiedlich hoch in ihrer Fläche.
  Die Werte stammen aus `node .build/ghs-fit-calc.js`. Vorlagen mit eigener
  Raute bleiben unverändert (`ownFrame`). Das Symbol wird bewusst **nicht**
  auf die Innenraute aufgeblasen, sonst liefe es über den roten Rand hinaus.
* Der Stammdateneditor zeigt in den GHS-Kacheln dieselbe fertige Raute
  (`ghsTile`) wie Etikett und Liste – inklusive rotem Rand und weißer Fläche.
* Das Panel „Etikettendaten“ zeigt zum gewählten Katalysator nur das
  Signalwort; die Piktogramme stehen im fertigen Etikett in der Vorschau.

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
| `ghs-bbox.js` | Bounding-Box je GHS-Symbol im 579er-Raum (Werte für `PIC_FIT`) |
| `ghs-fit-calc.js` | misst die Originale und berechnet `s`/`mx`/`my` für `PIC_FIT` |
| `ghs-fit-check.js` | prüft Zentrierung/Größe der Symbole in den Editor-Kacheln |
| `ghs-sym-dump.js` | rendert jedes Symbol einzeln nach `.build/out/sym-*.png` |
| `ghs-src-check.js` | vergleicht eingebettete Pfade mit `.ghs/*.svg` |
| `fetch-official.js` | lädt die neun Originalsymbole nach `.ghs-official/` |
| `embed-official.js` | schreibt Symbol + Raute aus `.ghs-official/` in die HTML-Datei |
| `compare-embedded.js` | vergleicht die eingebetteten Pfade zeichengenau mit den Originalen |
| `tile-check.js` | prüft je Raute: deckendes Weiß, roter Rand, Symbol deckend schwarz |
| `picker-shot.js`, `editor-shot.js` | Screenshots der GHS-Auswahl bzw. des Editors (hell/dunkel) |
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
