import * as React from "react"

/**
 * WMAssessmentChat – Work Mentor Agent v2.0
 * Chat-basierte Assessment-Komponente für Framer.
 * Ersetzt WMQuestions.tsx — spricht den Agent-Server direkt an.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

// ─── Config ────────────────────────────────────────────────────
const AGENT_BASE_URL = "https://web-production-ad0c4.up.railway.app"
const SID_STORAGE_KEY = "wm_session_id"

// ─── Types ─────────────────────────────────────────────────────

type AgentMessage = { text: string; delay_ms: number }
type ButtonAction = { id: string; text: string }
type Option = { id: string; text: string }
type Meta = { optionen_ranking?: Record<string, number>; kontextfalle?: boolean; mapping?: Record<string, string> }

type DashboardDimension = {
    skill: string
    score: number
    zieljob_score: number
    bewertung: string
    insight: string
}
type DashboardStaerke = { skill: string; begruendung: string }
type DashboardGap = { skill: string; hauptluecke: string; gap_intensity: string }
type DashboardBrightDark = { unterschied: boolean; beschreibung: string }
type DashboardMotive = { profil: string; job_fit: string }
type DashboardBuch = { titel: string; autor: string; begruendung: string; amazon_suchbegriff: string }
type Dashboard = {
    match_score: number
    match_label: string
    dimensions: DashboardDimension[]
    staerken: DashboardStaerke[]
    hauptgap: DashboardGap
    bright_vs_dark: DashboardBrightDark
    motive: DashboardMotive
    main_potential: string
    main_risk: string
    buchempfehlung?: DashboardBuch
    naechster_schritt?: string
}

type AgentResponse =
    | { typ: "agent_message"; messages: AgentMessage[]; action?: { typ: string; buttons: ButtonAction[] } }
    | { typ: "frage"; frage_nr: number; perspektive: string; skill: string; frage: string; optionen: Option[]; _meta: Meta }
    | { typ: "praeferenz"; frage_nr: number; perspektive: string; dimension: string; frage: string; optionen: Option[]; _meta: Meta }
    | { typ: "magie_moment"; messages: AgentMessage[]; next: AgentResponse }
    | { typ: "abschluss"; messages: AgentMessage[]; dashboard: Dashboard }
    | { typ: "error"; code: string; message: string }

// Chat-Bubble types for rendering
type ChatBubble =
    | { kind: "agent"; text: string; id: string }
    | { kind: "user"; text: string; id: string }
    | { kind: "frage"; data: AgentResponse & { typ: "frage" | "praeferenz" }; id: string }
    | { kind: "buttons"; buttons: ButtonAction[]; id: string }
    | { kind: "typing"; id: string }
    | { kind: "dashboard"; data: Dashboard; id: string }

type Props = {
    maxWidth?: number
}

// ─── Helpers ───────────────────────────────────────────────────

function useIsMobile(breakpoint = 640) {
    const [m, setM] = React.useState(typeof window !== "undefined" ? window.innerWidth <= breakpoint : false)
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const h = () => setM(window.innerWidth <= breakpoint)
        window.addEventListener("resize", h)
        return () => window.removeEventListener("resize", h)
    }, [breakpoint])
    return m
}

function getSid(): string {
    if (typeof window === "undefined") return ""
    return sessionStorage.getItem(SID_STORAGE_KEY) || ""
}

let bubbleCounter = 0
function nextId(): string {
    return `b_${++bubbleCounter}_${Date.now()}`
}

// ─── Component ────────────────────────────────────────────────

export default function WMAssessmentChat({ maxWidth = 680 }: Props) {
    const isMobile = useIsMobile()
    const [bubbles, setBubbles] = React.useState<ChatBubble[]>([])
    const [sessionId, setSessionId] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [frageNr, setFrageNr] = React.useState(0)
    const [answered, setAnswered] = React.useState(false)
    const [startTime, setStartTime] = React.useState(0)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const processingRef = React.useRef(false)

    // Auto-scroll
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
    }, [bubbles])

    // ─── Agent API calls ───────────────────────────────────────

    async function callAgent(endpoint: string, body: Record<string, unknown>): Promise<AgentResponse> {
        const res = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`Agent error: ${res.status}`)
        return res.json()
    }

    // ─── Process agent response ───────────────────────────────

    async function processResponse(response: AgentResponse) {
        if (processingRef.current) return
        processingRef.current = true

        try {
            switch (response.typ) {
                case "agent_message": {
                    // Show typing, then each message with delay
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
                    // Show buttons if present
                    if (response.action?.buttons) {
                        setBubbles(prev => [...prev, { kind: "buttons", buttons: response.action!.buttons, id: nextId() }])
                    }
                    break
                }

                case "frage":
                case "praeferenz": {
                    setFrageNr(response.frage_nr)
                    setAnswered(false)
                    setStartTime(Date.now())
                    setBubbles(prev => [...prev, { kind: "frage", data: response, id: nextId() }])
                    break
                }

                case "magie_moment": {
                    // Show magie messages
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
                    // Then show the next question
                    if (response.next) {
                        await sleep(800)
                        processingRef.current = false
                        await processResponse(response.next as AgentResponse)
                        return
                    }
                    break
                }

                case "abschluss": {
                    // Show closing messages
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
                    await sleep(500)
                    // Show dashboard
                    setBubbles(prev => [...prev, { kind: "dashboard", data: response.dashboard, id: nextId() }])
                    break
                }

                case "error": {
                    setError(response.message)
                    break
                }
            }
        } finally {
            processingRef.current = false
        }
    }

    // ─── Start session ─────────────────────────────────────────

    React.useEffect(() => {
        const sid = getSid()
        if (!sid) {
            setLoading(false)
            setError("Keine Session gefunden. Bitte starte von der Startseite.")
            return
        }
        setSessionId(sid)

        const zieljob = sessionStorage.getItem("targetPosition") || ""
        const aktuellerJob = sessionStorage.getItem("currentTitle") || ""
        const branche = sessionStorage.getItem("industry") || ""

        if (!zieljob) {
            setLoading(false)
            setError("Kein Zieljob gefunden. Bitte starte von der Startseite.")
            return
        }

        callAgent("/api/assessment/start", {
            session_id: sid,
            zieljob,
            aktueller_job: aktuellerJob,
            branche,
        })
            .then(response => {
                setLoading(false)
                processResponse(response)
            })
            .catch(err => {
                setLoading(false)
                setError(`Verbindung zum Agent fehlgeschlagen: ${err.message}`)
            })
    }, [])

    // ─── Handle user actions ──────────────────────────────────

    async function handleButtonClick(buttonId: string) {
        // Remove buttons from chat
        setBubbles(prev => prev.filter(b => b.kind !== "buttons"))
        // Add user bubble
        setBubbles(prev => [...prev, { kind: "user", text: "Los geht's", id: nextId() }])

        try {
            const response = await callAgent("/api/assessment/answer", {
                session_id: sessionId,
                antwort: buttonId,
            })
            await processResponse(response)
        } catch (err: any) {
            setError(`Fehler: ${err.message}`)
        }
    }

    async function handleOptionClick(optionId: string, optionText: string) {
        if (answered) return
        setAnswered(true)
        const reactionTime = Date.now() - startTime

        // Add user answer as bubble
        setBubbles(prev => {
            // Remove the question card
            const withoutLastFrage = [...prev]
            const lastFrageIdx = withoutLastFrage.findLastIndex(b => b.kind === "frage")
            if (lastFrageIdx >= 0) {
                // Keep the frage but mark it as answered (we'll grey it out)
            }
            return [...prev, { kind: "user", text: optionText, id: nextId() }]
        })

        // Show typing
        const typingId = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])

        try {
            const response = await callAgent("/api/assessment/answer", {
                session_id: sessionId,
                frage_nr: frageNr,
                antwort: optionId,
                reaction_time_ms: reactionTime,
            })
            // Remove typing
            setBubbles(prev => prev.filter(b => b.id !== typingId))
            await processResponse(response)
        } catch (err: any) {
            setBubbles(prev => prev.filter(b => b.id !== typingId))
            setError(`Fehler: ${err.message}`)
        }
    }

    // ─── Render helpers ───────────────────────────────────────

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // ─── Styles ───────────────────────────────────────────────

    const containerStyle: React.CSSProperties = {
        width: "100%",
        maxWidth,
        margin: "0 auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }

    const chatAreaStyle: React.CSSProperties = {
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "16px 12px" : "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
    }

    const agentBubbleStyle: React.CSSProperties = {
        maxWidth: "85%",
        padding: isMobile ? "12px 14px" : "14px 18px",
        background: "#fff",
        borderRadius: "18px 18px 18px 4px",
        border: "1px solid #e5e7eb",
        fontSize: isMobile ? 14 : 15,
        lineHeight: 1.5,
        color: "#1f2937",
        alignSelf: "flex-start",
    }

    const userBubbleStyle: React.CSSProperties = {
        maxWidth: "75%",
        padding: isMobile ? "10px 14px" : "12px 18px",
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        borderRadius: "18px 18px 4px 18px",
        fontSize: isMobile ? 14 : 15,
        lineHeight: 1.5,
        color: "#fff",
        alignSelf: "flex-end",
    }

    const typingStyle: React.CSSProperties = {
        ...agentBubbleStyle,
        display: "flex",
        gap: 4,
        padding: "14px 20px",
    }

    // ─── Loading ──────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
                    <div style={{ fontSize: 15, color: "#6b7280" }}>Agent wird verbunden...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", padding: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
                    <div style={{ fontSize: 15, color: "#b91c1c" }}>{error}</div>
                </div>
            </div>
        )
    }

    // ─── Main Chat UI ─────────────────────────────────────────

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div
                style={{
                    padding: isMobile ? "14px 16px" : "16px 20px",
                    borderBottom: "1px solid #e5e7eb",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                    }}
                >
                    🤖
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>Work Mentor</div>
                    <div style={{ fontSize: 11, color: "#10b981" }}>● Online</div>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} style={chatAreaStyle}>
                {bubbles.map(bubble => {
                    switch (bubble.kind) {
                        case "agent":
                            return (
                                <div key={bubble.id} style={agentBubbleStyle}>
                                    {bubble.text}
                                </div>
                            )

                        case "user":
                            return (
                                <div key={bubble.id} style={userBubbleStyle}>
                                    {bubble.text}
                                </div>
                            )

                        case "typing":
                            return (
                                <div key={bubble.id} style={typingStyle}>
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: "#9ca3af",
                                                animation: `wmTypingDot 1.4s infinite ease-in-out both`,
                                                animationDelay: `${i * 0.16}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )

                        case "buttons":
                            return (
                                <div key={bubble.id} style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                                    {bubble.buttons.map(btn => (
                                        <button
                                            key={btn.id}
                                            onClick={() => handleButtonClick(btn.id)}
                                            style={{
                                                padding: "10px 24px",
                                                borderRadius: 24,
                                                border: "none",
                                                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                                color: "#fff",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {btn.text}
                                        </button>
                                    ))}
                                </div>
                            )

                        case "frage":
                            return (
                                <div key={bubble.id} style={{ alignSelf: "flex-start", width: "100%", maxWidth: "95%" }}>
                                    {/* Question text as agent bubble */}
                                    <div style={{ ...agentBubbleStyle, marginBottom: 10, maxWidth: "100%" }}>
                                        {bubble.data.frage}
                                    </div>
                                    {/* Option cards */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {bubble.data.optionen.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionClick(opt.id, opt.text)}
                                                disabled={answered}
                                                style={{
                                                    width: "100%",
                                                    textAlign: "left",
                                                    padding: isMobile ? "12px 14px" : "14px 18px",
                                                    borderRadius: 12,
                                                    border: "1px solid #e5e7eb",
                                                    borderLeft: "4px solid #e5e7eb",
                                                    background: "#fff",
                                                    color: "#374151",
                                                    fontSize: isMobile ? 14 : 15,
                                                    lineHeight: 1.45,
                                                    cursor: answered ? "default" : "pointer",
                                                    opacity: answered ? 0.6 : 1,
                                                    transition: "all 0.15s ease",
                                                    boxSizing: "border-box",
                                                }}
                                                onMouseEnter={e => {
                                                    if (!answered) {
                                                        ;(e.target as HTMLButtonElement).style.borderLeftColor = "#2563eb"
                                                        ;(e.target as HTMLButtonElement).style.background = "#f0f7ff"
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    ;(e.target as HTMLButtonElement).style.borderLeftColor = "#e5e7eb"
                                                    ;(e.target as HTMLButtonElement).style.background = "#fff"
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: 22,
                                                        height: 22,
                                                        lineHeight: "22px",
                                                        textAlign: "center",
                                                        borderRadius: 6,
                                                        background: "#f1f5f9",
                                                        color: "#64748b",
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        marginRight: 10,
                                                        verticalAlign: "middle",
                                                    }}
                                                >
                                                    {opt.id}
                                                </span>
                                                {opt.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )

                        case "dashboard":
                            return <DashboardCard key={bubble.id} dashboard={bubble.data} isMobile={isMobile} />

                        default:
                            return null
                    }
                })}
            </div>

            {/* CSS for typing animation */}
            <style>{`
                @keyframes wmTypingDot {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

// ─── Dashboard Card ──────────────────────────────────────────

function DashboardCard({ dashboard, isMobile }: { dashboard: Dashboard; isMobile: boolean }) {
    const d = dashboard

    return (
        <div
            style={{
                width: "100%",
                background: "#fff",
                borderRadius: 18,
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                overflow: "hidden",
                alignSelf: "flex-start",
            }}
        >
            {/* Match Score Header */}
            <div
                style={{
                    padding: isMobile ? "24px 16px" : "32px 24px",
                    background: "linear-gradient(135deg, #0f172a, #1e293b)",
                    color: "#fff",
                    textAlign: "center",
                }}
            >
                <div style={{ fontSize: 48, fontWeight: 800 }}>{d.match_score}%</div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>{d.match_label}</div>
            </div>

            <div style={{ padding: isMobile ? "16px" : "24px" }}>
                {/* Skills */}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: "0 0 12px" }}>Deine Skills</h3>
                {d.dimensions.map((dim, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{dim.skill}</span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    background:
                                        dim.bewertung === "Stärke" ? "#dcfce7"
                                            : dim.bewertung === "Solide" ? "#dbeafe"
                                                : dim.bewertung === "Entwicklungsfeld" ? "#fef3c7"
                                                    : "#fee2e2",
                                    color:
                                        dim.bewertung === "Stärke" ? "#166534"
                                            : dim.bewertung === "Solide" ? "#1e40af"
                                                : dim.bewertung === "Entwicklungsfeld" ? "#92400e"
                                                    : "#991b1b",
                                }}
                            >
                                {dim.bewertung}
                            </span>
                        </div>
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div
                                style={{
                                    width: `${dim.score}%`,
                                    height: "100%",
                                    borderRadius: 3,
                                    background:
                                        dim.bewertung === "Stärke" ? "#22c55e"
                                            : dim.bewertung === "Solide" ? "#3b82f6"
                                                : dim.bewertung === "Entwicklungsfeld" ? "#f59e0b"
                                                    : "#ef4444",
                                }}
                            />
                        </div>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.4 }}>{dim.insight}</p>
                    </div>
                ))}

                {/* Stärken */}
                {d.staerken.length > 0 && (
                    <>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: "20px 0 8px" }}>💪 Deine Stärken</h3>
                        {d.staerken.map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: 12,
                                    background: "#f0fdf4",
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    borderLeft: "3px solid #22c55e",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>{s.skill}</div>
                                <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>{s.begruendung}</div>
                            </div>
                        ))}
                    </>
                )}

                {/* Hauptgap */}
                <div
                    style={{
                        padding: 14,
                        background: "#fffbeb",
                        borderRadius: 10,
                        marginTop: 16,
                        borderLeft: "3px solid #f59e0b",
                    }}
                >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>🎯 Dein größter Hebel: {d.hauptgap.skill}</div>
                    <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>{d.hauptgap.hauptluecke}</div>
                </div>

                {/* Bright vs Dark */}
                {d.bright_vs_dark?.unterschied && (
                    <div
                        style={{
                            padding: 14,
                            background: "#f8fafc",
                            borderRadius: 10,
                            marginTop: 12,
                            borderLeft: "3px solid #6366f1",
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#4338ca" }}>🌗 Alltag vs. Druck</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>
                            {d.bright_vs_dark.beschreibung}
                        </div>
                    </div>
                )}

                {/* Motive */}
                {d.motive && (
                    <div
                        style={{
                            padding: 14,
                            background: "#faf5ff",
                            borderRadius: 10,
                            marginTop: 12,
                            borderLeft: "3px solid #a855f7",
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#7e22ce" }}>💡 Was dich antreibt</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>{d.motive.profil}</div>
                    </div>
                )}

                {/* Potenzial + Risiko */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <div style={{ flex: 1, padding: 12, background: "#f0fdf4", borderRadius: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#166534", marginBottom: 4 }}>Größtes Pfund</div>
                        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{d.main_potential}</div>
                    </div>
                    <div style={{ flex: 1, padding: 12, background: "#fff7ed", borderRadius: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#9a3412", marginBottom: 4 }}>Größter Hebel</div>
                        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{d.main_risk}</div>
                    </div>
                </div>

                {/* Buchempfehlung */}
                {d.buchempfehlung && (
                    <div
                        style={{
                            marginTop: 20,
                            padding: 16,
                            background: "#eff6ff",
                            borderRadius: 12,
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>
                            📚 Empfohlen für dich
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{d.buchempfehlung.titel}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>von {d.buchempfehlung.autor}</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 8, lineHeight: 1.5 }}>
                            {d.buchempfehlung.begruendung}
                        </div>
                        <a
                            href={`https://www.amazon.de/s?k=${encodeURIComponent(d.buchempfehlung.amazon_suchbegriff)}&tag=workmentor21-21`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-block",
                                marginTop: 12,
                                padding: "10px 24px",
                                background: "#f59e0b",
                                color: "#fff",
                                borderRadius: 24,
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            Auf Amazon ansehen
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
