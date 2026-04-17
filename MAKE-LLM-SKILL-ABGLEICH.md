# Work Mentor – Make + LLM: Skill-Abgleich automatisieren

Konzept für die Automatisierung: User gibt Zielposition ein → Make orchestriert LLM-Calls → Skill-Gap-Analyse + Ressourcen-Empfehlungen → Ausgabe fürs Dashboard.

---

## Überblick: User Journey

1. **Landing:** User gibt Zielposition ein (z.B. „Senior Product Manager“) und klickt „Kostenlos starten“.
2. **Onboarding:** Optional: E-Mail erfassen, 13 situative Fragen beantworten (oder Kurz-CV/LinkedIn).
3. **Make-Szenario:**  
   - Zielposition + User-Antworten/CV als Input  
   - LLM 1: Skills für Zielposition aus „10k+ Job-Profile“ (oder LLM-generiert) ableiten  
   - LLM 2: Aktuelle Fähigkeiten aus Antworten/CV bewerten  
   - LLM 3: Gap identifizieren + priorisieren  
   - LLM 4: Pro Gap passende Ressource vorschlagen (Buch, Kurs, 1:1 Coaching)
4. **Output:** Strukturierte Daten (JSON) für Dashboard: Gaps, Level, empfohlene Ressourcen.

---

## Make-Szenario: Module grob

| Schritt | Modul / Aktion | Beschreibung |
|--------|-----------------|--------------|
| 1 | **Trigger** | Webhook (von Framer/Website) oder Form-Submit (z.B. Make Form). Payload: `Zielposition`, optional `email`, `antworten` (JSON der 13 Fragen) oder `cv_text`. |
| 2 | **Daten aufbereiten** | Zielposition normalisieren (z.B. LLM oder Lookup), User-Input als ein Textblock für nachfolgende LLM-Module bündeln. |
| 3 | **LLM: Ziel-Skills** | OpenAI/OpenRouter etc.: „Welche Skills und Kompetenzen sind für die Position [Zielposition] typisch? Liste mit Priorität und typischem Level (Junior/Mid/Senior).“ → strukturierte Liste (JSON). |
| 4 | **LLM: Ist-Skills** | Gleicher LLM-Dienst: „Bewerte anhand der folgenden Nutzerangaben die Fähigkeiten. Ausgabe: Skill-Name, geschätztes Level, Stärke (1–5).“ Input: User-Antworten oder CV. |
| 5 | **LLM: Gap-Analyse** | „Vergleiche Ziel-Skills (Schritt 3) mit Ist-Skills (Schritt 4). Für jede Lücke: Skill, Gap-Level, Priorität (high/medium/low), kurze Begründung.“ → JSON. |
| 6 | **LLM: Ressourcen** | Pro Gap (oder Top 5): „Empfehle eine konkrete Ressource (Buch, Online-Kurs, Zertifizierung, 1:1 Coaching) für [Skill]. Format: Titel, Typ, kurze Begründung, Link falls bekannt.“ → JSON. |
| 7 | **Aggregation** | Iterator über Gaps + Ressourcen, ein JSON-Objekt bauen: `{ "zielposition": "...", "gaps": [...], "ressourcen": [...] }`. |
| 8 | **Output** | Daten in Google Sheet / Airtable / Datenbank schreiben ODER per Webhook an deine App zurückgeben; E-Mail mit Link zum Dashboard optional. |

---

## LLM-Prompt-Beispiele (für Make „OpenAI“ / „HTTP“)

### Prompt 1: Ziel-Skills für Position
```
Du bist ein Karriere- und HR-Experte. Für die Position "[Zielposition]" (deutschsprachiger Markt):
1. Liste die 10–15 wichtigsten Skills/Kompetenzen auf.
2. Pro Skill: typisches Level (Junior / Mid / Senior) und Priorität (high/medium/low).
Antworte NUR mit einem JSON-Array: [{"skill": "...", "level": "...", "priority": "..."}, ...]
```

### Prompt 2: Ist-Skills aus User-Input
```
Bewerte die Fähigkeiten einer Person anhand der folgenden Angaben. Ausgabe nur valides JSON.
User-Angaben:
[User-Antworten oder CV-Text]

Format: [{"skill": "...", "level": "Junior|Mid|Senior", "strength": 1-5}, ...]
Maximal 15 relevante Skills. Kein Fließtext.
```

### Prompt 3: Gap-Analyse
```
Ziel-Skills (für [Zielposition]): [JSON aus Schritt 1]
Ist-Skills (User): [JSON aus Schritt 2]

Ermittle die Skill-Gaps (Lücken). Pro Gap: skill, current_level, target_level, priority (high/medium/low), reason (ein Satz).
Antworte NUR mit JSON-Array: [{"skill": "...", "current_level": "...", "target_level": "...", "priority": "...", "reason": "..."}, ...]
```

### Prompt 4: Ressource pro Gap
```
Für den Skill-Gap "[Skill]" (von [current_level] zu [target_level]): Empfehle EINE konkrete Ressource.
- Typ: Buch | Online-Kurs | Zertifizierung | 1:1 Coaching
- Titel, ggf. Anbieter, kurze Begründung (1 Satz), optional URL.
Nur JSON: {"skill": "...", "resource_type": "...", "title": "...", "provider": "...", "reason": "...", "url": "..."}
```

---

## Datenfluss Framer ↔ Make

- **Von Framer zu Make:** Beim Klick auf „Kostenlos starten“ entweder:
  - Weiterleitung zu einem Make-Formular (Zielposition + E-Mail + ggf. Fragen), das den Szenario-Trigger auslöst, **oder**
  - API-Call von Framer (Custom Code) auf einen Make-Webhook mit `{ "zielposition": "...", "email": "...", "antworten": {...} }`.
- **Make → Dashboard:** Make schreibt das Ergebnis in eine Tabelle (Sheet/Airtable/DB). Dein Dashboard (Framer-Embed, React, etc.) liest diese Daten per API oder per Make-Webhook-Callback und zeigt Gaps + Ressourcen an.

---

## Nächste Schritte

1. **Make-Szenario anlegen:** Trigger (Webhook/Form) → 4 LLM-Module wie oben → Aggregation → Speicher/Webhook.
2. **10k+ Job-Profile:** Entweder echte Datenbank/CSV mit Stellenanzeigen in Make pflegen und per „Search“ dem LLM als Kontext mitgeben, oder vorerst nur LLM-basierte „typische“ Skills pro Position (wie in Prompt 1).
3. **13 Fragen:** In Framer ein mehrseitiges Formular bauen; Antworten als JSON an Make senden und in Prompt 2 verwenden.
4. **Dashboard:** Eine einfache Ansicht (z.B. in Framer mit Code Component oder externe App), die Gaps und Ressourcen aus der von Make befüllten Datenquelle anzeigt.

Wenn du magst, können wir als Nächstes ein konkretes Make-Szenario (Modul für Modul) durchgehen oder die JSON-Struktur für Framer/Dashboard exakt festlegen.
