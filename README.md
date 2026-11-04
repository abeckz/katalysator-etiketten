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
   * **Speichern** legt im Modus „Neuer Katalysator“ einen **neuen** Eintrag an
     (auch mehrfach hintereinander) – vorhandene Einträge werden dabei nie
     überschrieben.
   * **Neu** leert das Formular für einen weiteren Katalysator.
   * **Bearbeiten** (Stift in der Liste) lädt den Eintrag ins Formular; nach dem
     Speichern springt das Formular wieder auf „Neuer Katalysator“.
   * **Löschen** entfernt den geladenen Eintrag, **Abbrechen** schließt den Editor.
   * Wird der Editor geschlossen und neu geöffnet, steht das Formular wieder auf
     „Neuer Katalysator“.
5. **Drucken**: A4 Hochformat, Skalierung 100 %, Ränder „keine“.

## Aufbau

* `.sheet` = A4 (210 × 297 mm); Bildschirm-Vorschau über
  `transform: scale(var(--zoom))` in `.sheet-fit`.
* `.sheet__labels` enthält zwei `article.label` (je 210 × 148,5 mm, A5 quer),
  untereinander: Etikett 1 bei `top: 0`, Etikett 2 bei `top: 148,5 mm`.
* Innen: linke Titelspalte (90° gedreht), rechts Datenblock, GHS-Rauten +
  Signalwort, Empfängerbox. 5 mm Rand je Etikett.
* GHS-Signalwort: **Piktogramme dürfen ohne Signalwort stehen** (es gibt
  Einstufungen mit Piktogramm, aber ohne Signalwort), **ein Signalwort ohne
  Piktogramm gibt es nicht**. Der Editor lehnt ein Signalwort ohne Piktogramm
  beim Speichern ab; wird das letzte Piktogramm abgewählt, leert sich das
  Signalwort. Im Etikett steht das Signalwort **nur, wenn es gesetzt ist** –
  bei Piktogrammen ohne Signalwort fehlt der Signalwort-Rahmen komplett
  (kein „kein Signalwort“, kein leerer Kasten, `ghs--nosignal` für die
  Mittelachsen-Rechnung). Ohne Piktogramme bleibt die GHS-Stelle im Etikett
  leer (der Container wird per `.ghs:empty` ausgeblendet). Im
  Stammdateneditor zeigt die Liste den Zustand dagegen als Text: den Chip
  „kein Signalwort“ bzw. „keine Piktogramme“.
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
* **Textteil = unsichtbare Box mit absoluten Maßen.** Der ganze Textteil
  (Katalysator, Ausbaudatum, aus Ofen, Gruppe „ex Produktion“ + Zusatzzeilen)
  liegt in einer Box mit festen mm-Werten; sichtbar ist nur die Schrift:
  `--box-h` (Blockhöhe 14,3 mm), `--box-gap` (Luft 2,4 mm),
  `--box-w` (Klammerbreite 78 mm = Breite der Empfängerbox),
  `--box-lead` (Textbeginn 3,4 mm ab Strich) und `--box-bracket`
  (Bogenradius 0,6 mm). Die Gruppenhöhe ist `3 × --box-h + 2 × --box-gap`
  (47,7 mm). Weil alles in mm steht, ist die Geometrie zoom- und
  inhaltsunabhängig – Vorschau und Druck sind zwangsläufig gleich.
* Jede Zeile ist links mit einer **C-Klammer** eingefasst (0,8 mm, hellgrau):
  durchgehender Strich links, oben/unten je ein Bogen bis zum Textbeginn
  (`--box-lead`), am rechten Boxrand ein gespiegelter Bogen. Der waagerechte
  Strich reicht nie über den Textbeginn hinaus – **keine Linie läuft durch
  Text**. Unterstreichungen gibt es nicht.
* Unter „ex Produktion“ stehen drei Freitext-Zeilen (`.lrow__v` mit
  `data-f="extra1…extra3"`), befüllt über die drei Felder „Zusatzzeile 1–3“
  im Panel (ohne sichtbare Überschrift, nur `aria-label`). Im Etikett haben
  sie weder Beschriftung noch Unterstrich und keinen Platzhaltertext – leere
  Zeilen bleiben leer, Bildschirm und Druck sind identisch.
* „ex Produktion“ und die drei Zusatzzeilen bilden **eine** gemeinsame
  Klammer (`.lrow--group`); die Zeilen darin haben keine eigene. Die Gruppe
  hat eine **feste** Höhe (`--group-h`) und wächst nicht mit beschriebenen
  Zusatzzeilen.
* Oberer Versatz: `--box-top` (= `BOX_TOP_MM`, 6 mm) sitzt als `padding-top`
  **am Block** (`.label__fields`). Er wird nur verkleinert, wenn oben kein
  Platz mehr ist – die Blöcke bleiben dann vollständig sichtbar.
* Der Rahmen der Box ist `--fields-room` (→ `max-height`). Er gilt **ab der
  Box-Oberkante** und enthält damit den oberen Versatz: `--fields-room` =
  `--box-top` + Summe der Blockhöhen + `--box-gap` × Anzahl Abstände.
  Was nicht passt, wird mit `overflow:hidden` unten gekappt (nie gestaucht).
* `alignFieldsTop()` setzt genau zwei Werte, beide aus festen mm:
  `--box-top` (6 mm, bei Platznot kleiner) und daraus `--fields-room`.
  Der Platz dafür kommt aus der Etikettentiefe abzüglich 5-mm-Rand,
  Empfängerbox (`--recipient-h`, fest 31,5 mm) und `--data-gap` (2,4 mm).
  Es gibt **keine Rückkopplung** mehr zwischen Blockhöhe und Rahmen.
* Die Empfängerbox sitzt unten im Etikettenraum (`align-self:end` +
  `margin-top:auto`). Das Raster von `.label__right` hat **zwei** Zeilen
  (`auto minmax(0, 1fr)`): Datenzeile oben, Empfängerbox im Rest. Drei Zeilen
  bei zwei Kindern schoben die Box in eine leere Mittelzeile aus dem Etikett.
* `.label__left` und `.label__right` haben **kein** `height:100%` – mit dem
  5-mm-Rand wurde das Etikett dadurch höher als 148,5 mm; die Höhe kommt jetzt
  über `align-self:stretch` vom Etikett.
* Gemessen wird in CSS-Pixeln (`offsetHeight`, `clientHeight`) und in mm aus
  `getBoundingClientRect() / zoom` – der Vorschau-Zoom wird immer
  herausgerechnet. `scrollHeight` taugt für `.label__fields` nicht
  (`overflow:hidden` ⇒ `scrollHeight == clientHeight`).
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
| `behavior-check.js` | Ablauftests: Selects, Live-Updates, GHS-Limit, Editor (Anlegen ohne Überschreiben, Bearbeiten, Obergrenze 20), localStorage |
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
| `label-signal-check.js` | Signalwort-Regeln am Etikett: ohne Signalwort kein Rahmen/kein Text (Piktogramme bleiben), ohne Piktogramme bleibt die GHS-Stelle leer, Editorliste zeigt weiter den Hinweis – je Vorschau und Druck |
| `signal-check.js` | derselbe Ablauf über die echte Oberfläche (Editor: Profil anlegen, speichern, auswählen) per Chrome-CDP; `--shot` bereitet nur die Screenshot-Lage vor |
| `run-checks.js` | ruft ein Prüfskript auf und bricht nach einem Zeitlimit ab: `node .build/run-checks.js signal-check.js 8000` |
| `fix-encoding.js`, `repair-mojibake.js` | Encoding-Reparaturen (idempotent) |

Aufruf im Projektordner:

```powershell
node .build/ui-check.js
node .build/behavior-check.js
node .build/print-measure.js
node .build/file-check.js
node .build/label-signal-check.js
node .build/signal-check.js
```

`ui-check.js` legt `screen-1400.png`, `druck.pdf` und weitere Artefakte in
`.build/out/` ab.
