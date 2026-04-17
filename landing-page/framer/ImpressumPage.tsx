import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function ImpressumPage() {
    return (
        <div style={{ minHeight: "100vh", background: "#ffffff" }}>
            <div
                style={{
                    width: "100%",
                    maxWidth: 600,
                    margin: "0 auto",
                    padding: "40px 20px",
                    boxSizing: "border-box",
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
                        margin: "24px 0 32px",
                    }}
                >
                    Impressum
                </h1>

                <section style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            margin: "0 0 8px",
                        }}
                    >
                        ANGABEN GEMÄß § 5 TMG
                    </h2>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                        {"Nils Bauer\nKolpingstraße 30\n08058 Zwickau"}
                    </p>
                </section>

                <section style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            margin: "0 0 8px",
                        }}
                    >
                        KONTAKT
                    </h2>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.8 }}>
                        E-Mail: nils@work-mentor.com
                    </p>
                </section>

                <section style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            margin: "0 0 8px",
                        }}
                    >
                        HOSTING
                    </h2>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                        {"Diese Website wird gehostet bei:\nIONOS SE\nElgendorfer Str. 57\n56410 Montabaur"}
                    </p>
                </section>

                <section style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            margin: "0 0 8px",
                        }}
                    >
                        HINWEIS
                    </h2>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.8 }}>
                        Work Mentor ist ein privates Orientierungstool in der Beta-Phase. Die Inhalte dienen ausschließlich der Selbstreflexion und stellen keine psychologische Beratung oder Berufsberatung dar. Alle Ergebnisse sind unverbindlich.
                    </p>
                </section>

                <section style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            margin: "0 0 8px",
                        }}
                    >
                        STREITSCHLICHTUNG
                    </h2>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                        {"Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:\nhttps://ec.europa.eu/consumers/odr\n\nWir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."}
                    </p>
                </section>
            </div>
        </div>
    )
}
