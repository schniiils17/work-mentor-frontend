import * as React from "react"
import WMFooter from "./WMFooter"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function DatenschutzPage() {
    const sectionTitleStyle: React.CSSProperties = {
        fontSize: 13,
        fontWeight: 600,
        color: "#6b7280",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 8,
    }

    const sectionTextStyle: React.CSSProperties = {
        fontSize: 15,
        color: "#374151",
        lineHeight: 1.8,
        margin: 0,
        whiteSpace: "pre-line",
    }

    const sectionBoxStyle: React.CSSProperties = {
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 24,
        marginBottom: 24,
    }

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff" }}>
            <div
                style={{
                    width: "100%",
                    maxWidth: 600,
                    margin: "0 auto",
                    padding: "40px 20px",
                    boxSizing: "border-box",
                    flex: 1,
                }}
            >
                <button
                    onClick={() => window.history.back()}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#6b7280",
                        padding: 0,
                        marginBottom: "24px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                >
                    ← Zurück
                </button>

                <h1
                    style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#111827",
                        margin: "0 0 32px",
                    }}
                >
                    Datenschutzerklärung
                </h1>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>VERANTWORTLICHER</h2>
                    <p style={sectionTextStyle}>
                        {"Nils Bauer\nKolpingstraße 30\n08058 Zwickau\nE-Mail: nils@work-mentor.com"}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>WELCHE DATEN WIR VERARBEITEN</h2>
                    <p style={sectionTextStyle}>
                        {"Wenn du Work Mentor nutzt, verarbeiten wir folgende Eingaben von dir:\n\n- Deine aktuelle und angestrebte Berufsposition\n- Deine Antworten auf die Assessment-Fragen\n- Eine anonyme Session-ID zur technischen Zuordnung deiner Ergebnisse\n\nEs werden keine Namen, E-Mail-Adressen oder andere direkt personenbezogene Daten erhoben."}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>ZWECK DER VERARBEITUNG</h2>
                    <p style={sectionTextStyle}>
                        {"Deine Eingaben werden ausschließlich genutzt um:\n\n- Eine personalisierte Karriereanalyse zu erstellen\n- Passende Entwicklungsressourcen zu empfehlen\n\nDie Verarbeitung erfolgt auf Basis deiner aktiven Einwilligung beim Start des Assessments (Art. 6 Abs. 1 lit. a DSGVO)."}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>WEITERGABE AN DRITTE</h2>
                    <p style={sectionTextStyle}>
                        {"Zur Erbringung des Services werden deine Eingaben an folgende Drittanbieter übermittelt:\n\n- Anthropic (Claude API)\n  Zweck: Generierung der Fragen und Auswertung\n  Sitz: USA\n  Datenschutz: anthropic.com/privacy\n\n- Perplexity AI\n  Zweck: Recherche der Buchempfehlung\n  Sitz: USA\n  Datenschutz: perplexity.ai/privacy\n\n- Make.com\n  Zweck: Technische Verarbeitung und Weiterleitung der Daten\n  Sitz: EU (Tschechien)\n  Datenschutz: make.com/privacy\n\n- Google Sheets (Google LLC)\n  Zweck: Temporäre Speicherung der Analyseergebnisse\n  Sitz: USA\n  Datenschutz: policies.google.com/privacy\n\nDie Übermittlung in die USA erfolgt auf Basis der Standardvertragsklauseln der EU-Kommission."}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>SPEICHERDAUER</h2>
                    <p style={sectionTextStyle}>
                        {"Deine Daten werden ausschließlich für die Dauer deiner Session gespeichert und danach nicht weiter verwendet. Eine dauerhafte Speicherung personenbezogener Daten findet nicht statt."}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>DEINE RECHTE</h2>
                    <p style={sectionTextStyle}>
                        {"Du hast jederzeit das Recht auf:\n\n- Auskunft über deine gespeicherten Daten\n- Berichtigung unrichtiger Daten\n- Löschung deiner Daten\n- Widerruf deiner Einwilligung\n\nFür alle Anfragen wende dich an:\nnils@work-mentor.com"}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>KEINE COOKIES / KEIN TRACKING</h2>
                    <p style={sectionTextStyle}>
                        {"Work Mentor verwendet keine Cookies und kein Tracking. Es werden keine Analysetools wie Google Analytics eingesetzt. Die einzige technische Speicherung erfolgt über den Session Storage deines Browsers - dieser wird automatisch gelöscht wenn du den Browser schließt."}
                    </p>
                </section>

                <section style={sectionBoxStyle}>
                    <h2 style={sectionTitleStyle}>BESCHWERDERECHT</h2>
                    <p style={sectionTextStyle}>
                        {"Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Die zuständige Behörde für Sachsen ist:\n\nSächsischer Datenschutzbeauftragter\nDevrientstraße 5\n01067 Dresden\nwww.datenschutz.sachsen.de"}
                    </p>
                </section>
            </div>

            <WMFooter />
        </div>
    )
}
