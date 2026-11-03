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
* Das Panel „Etikettendaten“ enthält die Eingabefelder (Katalysator,
  Ausbaudatum, aus Ofen, ex Produktion sowie die drei Zusatzzeilen 1–3 ohne
  eigene Überschrift);
  Signalwort und Piktogramme stehen ausschließlich im fertigen Etikett.
* Jede Zeile der Feldspalte (Katalysator, Ausbaudatum, aus Ofen sowie die
  Gruppe „ex Produktion“ + Zusatzzeilen) ist links mit einer **C-förmigen,
  hellgrauen Klammer** eingefasst (`.lrow::before`, 0,8 mm Strich, Bögen nur
  rund 2 mm nach rechts, feste Bogenhöhe). Die Klammer schließt Überschrift
  **und** Wert ein – so ist auf einen Blick erkennbar, was zusammengehört.
  Unterstreichungen unter den Werten gibt es nicht mehr.
* Unter „ex Produktion“ stehen drei Freitext-Zeilen (`.lrow__v` mit
  `data-f="extra1…extra3"`). Sie werden über die drei Felder „Zusatzzeile 1–3“
  im Panel befüllt und erscheinen identisch auf beiden Etiketten. Die drei
  Felder haben bewusst **keine sichtbare Überschrift** (nur `aria-label` für
  Screenreader). Im Etikett haben die Zeilen weder Beschriftung noch
  Unterstrich und auch keinen Platzhaltertext („Zeile 1–3“ wurde entfernt) –
  leere Zeilen bleiben leer, Bildschirm und Druck sind dadurch identisch.
* „ex Produktion“ und die drei Zusatzzeilen bilden **eine** gemeinsame
  Klammer (`.lrow--group`); die eingerückten Zeilen darin haben keine eigene
  Klammer. Die Gruppe ist eine Flex-Spalte: jede Zusatzzeile ist leer 11,4 mm
  hoch (Schreibplatz) und 13,8 mm, sobald Text darin steht
  (`.lrow--extra:has(> .lrow__v:not(:empty))`). Die Klammer wächst dadurch
  sichtbar mit dem Inhalt, die GHS-Gruppe bleibt davon unberührt.
* Der Gruppencontainer hat links **keine** eigene Polsterung – der 5,6-mm-
  Vorsprung kommt von der inneren Zeile (`.lrow--row`) bzw. von
  `.lrow--extra`. Dadurch stehen „ex Produktion“ und die Zusatzzeilen exakt
  bündig unter „aus Ofen“ (vorher rutschte der Block um 5,6 mm nach rechts).
  `node .build/gap-check.js` prüft das („Feldspalte bündig in x“).
* Der Zeilenabstand **innerhalb** der Gruppe ist gleichmäßig: „ex Produktion“
  trägt unten `padding-bottom:6.9mm`, die Zusatzzeilen haben `margin-top:0`
  und ihre Höhe (leer 13,4 mm, gefüllt 15,5 mm) enthält dieselbe Luft. Vorher
  saß zwischen Wert und erster Zusatzzeile mehr Abstand als zwischen den
  Zusatzzeilen, weil deren Kastenhöhe die Textzeile überragte.
  `node .build/fill-measure.js` misst das („Zeilenabstaende … | Streuung …“).
* Die Gruppenklammer liegt mit `left:0` am linken Rand der Gruppenbox –
  ein negativer Wert würde den Strich aus dem Kasten schieben, wo ihn
  `.label__fields{overflow:hidden}` abschneidet. Die Bögen bleiben frei, weil
  `::before` um 0,9 mm nach oben/unten aufgeweitet ist
  (`margin-top/-bottom:-.9mm`) und die Gruppe selbst **kein**
  `overflow:hidden/clip` trägt.
* Die Feldspalte beginnt oben (`justify-content:flex-start`, `--fields-top`
  = 6 mm); die GHS-Gruppe wird über `--fields-shift` in die Etikettenmitte
  gerückt. Reicht der Platz mit allen drei Zusatzzeilen nicht (kurzes
  Etikett), verkleinert `alignFieldsTop()` zuerst den Zeilenabstand bis
  `FIELDS_GAP_MIN_MM` und staucht danach die Gruppenklammer – Untergrenze ist
  `GROUP_MIN_MM` = natürliche Höhe minus Zeilenabstand plus Mindestabstand,
  damit zum oberen Bogen und zur Empfängerbox rund 2,2 mm Luft bleiben.
  Gemessen wird über die Kinder, nicht über `scrollHeight`: `.label__fields`
  hat `overflow:hidden` und meldet sonst immer `scrollHeight == clientHeight`.
* Ist danach Platz übrig, verteilt `alignFieldsTop()` ihn gleichmäßig auf die
  Abstände der Feldspalte (gedeckelt bei `FIELDS_GAP_MAX_MM` = 6 mm). Vorher
  sammelte sich die ganze Restluft als eine große Lücke zwischen
  Gruppenklammer und Empfängerbox.
* Am Bildschirm zeigt die Vorschau **ein** Etikett (`@media screen` blendet
  `label[data-index="1"]` aus); gedruckt werden weiterhin **beide**.

## Bildschirm-Layout

* `html`/`body` sind 100 % hoch; `.app-shell` ist eine Flex-Spalte mit
  `height: 100dvh` und `overflow: hidden`. Die Seite selbst scrollt nicht –
  die Boxen „Etikettdaten“ und „Live-Vorschau“ enden also immer 16 px über der
  Fensterunterkante, auch bei 175 / 200 % Browser-Zoom.
* `.workspace` nimmt den Rest der Höhe ein: links das Formular
  (`minmax(320px, 420px)`), rechts die Vorschau. Lange Inhalte scrollen im
  Panel selbst (`.panel__body`); Kopfzeile und `.save-status` bleiben stehen.
* `fitSheet()` misst die freie Fläche der Vorschau und setzt `--zoom` so, dass
  das A5-Etikett genau hineinpasst (Obergrenze `MAX_ZOOM = 3`). `.sheet`
  behält dabei seine Layoutgröße in mm – die Optik kommt nur aus
  `transform: scale()`; der Wrapper `.sheet-fit` bekommt die sichtbare Größe,
  damit im Raster kein Leerraum entsteht. Ausgelöst wird die Anpassung über
  `resize`, `visualViewport`, einen `ResizeObserver` auf der Vorschau und
  `document.fonts.ready` (rAF-gedrosselt über `scheduleFit()`).
* Der Stammdateneditor ist auf `min(1280px, 100%)` × `min(96vh, 1080px)`
  vergrößert, damit die Liste ohne vorzeitiges Scrollen sichtbar ist.
* Unter 1100 px Breite stehen Formular und Vorschau untereinander; dort
  scrollt die Arbeitsfläche, die Vorschau bekommt eine feste Höhe
  (`clamp(240px, 62vh, 720px)`).

## Druck

`@page { size: A4 portrait; margin: 0 }`. Die Vorschau-Skalierung darf den
Ausdruck **nicht** beeinflussen, deshalb passiert beim Druck zweierlei:

* CSS (`@media print`): `--zoom`/`transform` aus, Blatt fest auf 210 × 297 mm,
  Vorschau-Container (`display:block`, `place-items:start`, kein Padding/Rahmen)
  und `html`/`body` ohne Scrollbereich – im Druck scrollt nichts.
* JS (`beforeprint` → `applyPrintStyles()`): setzt `--zoom: 1`, feste
  Druckmaße (`--sheet-w`, `--sheet-h` = 210/297 mm) und die Maße des Wrappers
  `.sheet-fit` auf 210 × 297 mm; `fitSheet()` rechnet im Druckmedium nicht
  nach. `afterprint` → `clearPrintStyles()` + `fitSheet()` stellt die
  Vorschau wieder her.

Ergebnis: genau eine A4-Seite (per PDF geprüft), keine Scrollbalken und kein
herausgeschobenes Blatt.

## Prüfskripte (`.build/`)

Reine Entwicklungshilfen – nicht Teil der App, keine Laufzeitabhängigkeit.

| Skript | Zweck |
| --- | --- |
| `ui-check.js` | Screenshots + PDF (1 Seite, A4), DOM-Assertions |
| `behavior-check.js` | Ablauftests: Selects, Live-Updates, GHS-Limit, Editor, localStorage |
| `print-measure.js` | misst die Druckgeometrie (mm) nach `beforeprint` |
| `print-media-probe.js`, `print-cdp-probe.js` | Druckmedium per CDP (`Emulation.setEmulatedMedia`) prüfen: Scrollbalken, Blattlage, PDF |
| `fit-probe.js` | prüft Fensterfüllung/Überlauf (optional `--editor`); Maße `Breite Höhe` |
| `sheet-box.js` | prüft die sichtbare Blattgröße gegen die Vorschau-Fläche |
| `ghs-geometry.js` | Etiketten-Geometrie für 0–6 Piktogramme (0 mm Überdeckung erwartet) |
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
| `gap-check.js` | Layout-Prüfungen: x-Bündigkeit der Feldspalte, Luft zwischen den Klammerbögen, keine Überläufe |
| `bracket-check.js` | prüft Aufbau/Geometrie der C-Klammern (eine Klammer je Feld, Gruppenklammer wächst mit) |
| `extra-rows-check.js` | prüft die drei Zusatzzeilen (leer, ohne Unterstrich, gemeinsame Klammer, Druck = 1 Seite) |
| `fill-measure.js` | füllt alle Felder + Zusatzzeilen und misst Gruppenklammer, Zeilenabstände und Überlauf (A4 + 140 mm) |
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
