# Work Mentor – Landing Page

Landing Page basierend auf dem Figma-Design (Hero + Feature-Karussell).

## Starten

```bash
cd /Users/nils/WorkMentor/landing-page
npm install
npm run dev
```

Dann im Browser **http://localhost:5173** öffnen.

## Build für Produktion

```bash
npm run build
```

Die Dateien liegen danach in `dist/` und können z.B. bei Vercel oder Netlify deployt werden.

## Inhalt

- **Hero:** Tagline „KI-gestützte Karriereanalyse“, Headline mit farbigen Wörtern, Body-Text, Vertrauensindikatoren (5.000+ analysiert, 4.8/5), CTA-Karte mit Eingabefeld „Welche Position strebst du an?“ und Button „Kostenlos starten“.
- **Features:** Sektion „WAS DU BEKOMMST“ mit Karussell (3 Slides: Situative KI-Diagnostik, Strategische Gap-Analyse, Kuratierter Entwicklungsplan) und drei Infokarten pro Slide (13 Fragen, < 5 Min, KI-gestützt).

Der Button „Kostenlos starten“ führt aktuell nur ein `console.log` aus. Die Anbindung an Make (Webhook/Form) kannst du in `src/App.jsx` in `handleSubmit` ergänzen.
