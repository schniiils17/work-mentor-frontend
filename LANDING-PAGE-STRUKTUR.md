# Work Mentor – Landing Page Struktur (Framer)

Basierend auf deinem Figma-Design. Nutze diese Struktur in Framer für Hero und Feature-Karussell.

---

## 1. Hero-Bereich (oberer Teil)

### Tagline (Pill-Button)
- **Text:** „KI-gestützte Karriereanalyse“
- **Style:** Hellblauer Hintergrund, blauer Rahmen, abgerundet (Pill), kleines Stern-/Funken-Icon links

### Hauptüberschrift (2 Zeilen)
- **Zeile 1:** „Erkenne die Skills die dich“
- **Zeile 2:** „**wirklich** weiterbringen“
  - „wirklich“ → **Blau**
  - „weiterbringen“ → **Grün**

### Body-Text
„Wir spiegeln dein aktuelles Skillset an der Realität von +10.000 aktuellen Stellenausschreibungen. Erfahre exakt, auf welchem Level du stehst, und erhalte deine persönlichen Entwicklungsempfehlungen, um deine Zielposition sicher zu erreichen.“

### Vertrauensindikatoren (2 Statistiken)
| Icon        | Text           |
|------------|----------------|
| 2 Personen | 5.000+ analysiert |
| Aufwärtskurve | 4.8/5 Rating   |

### CTA-Box (weiße Karte, Schatten, abgerundet)
- **Frage:** „Welche Position strebst du an?“
- **Eingabefeld:** Platzhalter „z.B. Senior Product Manager“
- **Button:** „Kostenlos starten“ (Lila/Lavendel, weißer Text, Pfeil rechts)

---

## 2. Feature-Bereich: „WAS DU BEKOMMST“

Überschrift: **WAS DU BEKOMMST** (Großbuchstaben, dunkleres Grau)

### Karussell – 3 Feature-Karten

Jede Karte hat:
- eine große weiße/hellgraue Karte mit Icon, Titel, Beschreibung
- darunter **3 gleiche Infokarten** (auf allen Slides):
  - **13 Fragen** → Situative Szenarien
  - **< 5 Min** → Schnelle Analyse
  - **KI-gestützt** (Blau/Grün) → 10k+ Job-Profile
- Karussell-Punkte (3 Dots), aktiver Punkt blau

---

#### Slide 1: Situative KI-Diagnostik
- **Icon:** Zielscheibe (konzentrische Kreise), blau
- **Titel:** Situative KI-Diagnostik
- **Beschreibung:** „Keine Selbsteinschätzung – wir messen deine Fähigkeiten durch realistische Job-Szenarien und vergleichen dich mit Marktanforderungen.“

---

#### Slide 2: Strategische Gap-Analyse
- **Icon:** Balken-/Säulendiagramm (2 Balken), grün
- **Titel:** Strategische Gap-Analyse
- **Beschreibung:** „Wir decken die unsichtbaren Lücken zwischen deinem Level und deiner Zielposition auf – mit visueller Darstellung deiner Stärken und Potenziale.“

---

#### Slide 3: Kuratierter Entwicklungsplan
- **Icon:** Glühbirne, orange Umrandung/Schimmer
- **Titel:** Kuratierter Entwicklungsplan
- **Beschreibung:** „Schluss mit endloser Kurssuche – du erhältst exakt auf deine Gaps zugeschnittene Ressourcen vom Buch bis zum 1:1 Coaching.“

---

## Framer-Tipps

- **Karussell:** In Framer mit „Slider“ oder „Carousel“-Komponente umsetzen; pro Slide eine Gruppe mit Feature-Karte + den 3 Infokarten.
- **CTA:** Eingabefeld und Button mit Framer-Form oder „Button“-Link zu deiner nächsten Seite (z.B. Onboarding/Registrierung), wo die Zielposition an Make übergeben wird.
- **Farben:** Blau/Grün für Highlights wie in den Bildern beibehalten für Wiedererkennung.

Wenn du willst, können wir als Nächstes die **Make-Automatisierung** (LLM-Skill-Abgleich) durchgehen oder konkrete Framer-Code-Snippets für das Karussell formulieren.
