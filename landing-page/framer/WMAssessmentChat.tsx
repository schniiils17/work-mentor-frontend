import * as React from "react"

/**
 * WMAssessmentChat – Work Mentor Agent v3
 * Verschlankter Flow: Research → Assessment Items → Dashboard
 * Kein Clarify, keine Varianz, kein aktueller Job.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

// ─── Config ────────────────────────────────────────────────────
const AGENT_BASE_URL = "https://web-production-ad0c4.up.railway.app"
const SID_STORAGE_KEY = "wm_session_id"

// ─── Types ─────────────────────────────────────────────────────

type Option = { id: string; text: string }

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

type ResearchedSkill = {
    name: string
    kategorie: string
    gewichtung: number
    belege: string[]
    varianz: string
    varianz_erklaerung: string
}
type SkillResearchResult = {
    skills: ResearchedSkill[]
    varianz_fragen: unknown[]
    meta: Record<string, unknown>
}

type ChatBubble =
    | { kind: "agent"; text: string; id: string }
    | { kind: "user"; text: string; id: string }
    | { kind: "statement"; data: any; id: string }
    | { kind: "forced_choice"; data: any; id: string }
    | { kind: "typing"; id: string }
    | { kind: "dashboard"; data: Dashboard; id: string }

type Props = { maxWidth?: number }

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
function nextId(): string { return `b_${++bubbleCounter}_${Date.now()}` }
function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

// Score normalisieren: Backend liefert 0-100 ODER 0.0-1.0 — wir brauchen immer 0-100
function normalizeScore(score: number): number {
    if (score <= 1) return Math.round(score * 100)
    return Math.round(score)
}

const LOADING_MESSAGES = [
    "Verbinde mit dem Arbeitsmarkt...",
    "Durchsuche Stellenanzeigen...",
    "Analysiere Anforderungsprofile...",
    "Vergleiche Skill-Muster...",
    "Bereite dein Assessment vor...",
]

// ─── Component ─────────────────────────────────────────────────

export default function WMAssessmentChat({ maxWidth = 680 }: Props) {
    const isMobile = useIsMobile()

    // State
    const [bubbles, setBubbles] = React.useState<ChatBubble[]>([])
    const [sessionId, setSessionId] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [answered, setAnswered] = React.useState(false)
    const [startTime, setStartTime] = React.useState(0)
    const [loadingMsg, setLoadingMsg] = React.useState(LOADING_MESSAGES[0])
    const [loadingProgress, setLoadingProgress] = React.useState(0)
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Research + Assessment state
    const [researchResult, setResearchResult] = React.useState<SkillResearchResult | null>(null)
    const [assessmentItems, setAssessmentItems] = React.useState<any[]>([])
    const assessmentItemsRef = React.useRef<any[]>([])
    const currentItemIndexRef = React.useRef(0)
    const [currentItemIndex, setCurrentItemIndex] = React.useState(0)
    const [assessmentAnswers, setAssessmentAnswers] = React.useState<{ item_id: string; antwort: string; item_text: string }[]>([])
    const assessmentAnswersRef = React.useRef<{ item_id: string; antwort: string; item_text: string }[]>([])
    const [diagnostikStrategy, setDiagnostikStrategy] = React.useState<Record<string, unknown> | null>(null)

    const [jobData, setJobData] = React.useState({ zieljob: "" })

    // Auto-scroll
    React.useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }, [bubbles])

    // Keep-Alive
    React.useEffect(() => {
        const interval = setInterval(() => { fetch(`${AGENT_BASE_URL}/api/health`).catch(() => {}) }, 4 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    // ─── API Helper ────────────────────────────────────────────

    async function callAgent(endpoint: string, body: Record<string, unknown>, retries = 2): Promise<any> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 60000)
                const res = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)
                if (!res.ok) {
                    if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue }
                    throw new Error(`Agent error: ${res.status}`)
                }
                return res.json()
            } catch (err: any) {
                if (attempt < retries) { await sleep(1500 * (attempt + 1)); continue }
                throw new Error("Verbindung zum Agent hat zu lange gedauert. Bitte lade die Seite neu.")
            }
        }
    }

    // ─── Init: Direkt Research starten ─────────────────────────

    React.useEffect(() => {
        const sid = getSid()
        if (!sid) { setLoading(false); setError("Keine Session gefunden. Bitte starte von der Startseite."); return }
        setSessionId(sid)

        const zieljob = (typeof window !== "undefined" ? sessionStorage.getItem("targetPosition") : "") || ""
        setJobData({ zieljob })

        if (!zieljob) { setLoading(false); setError("Kein Zieljob gefunden. Bitte starte von der Startseite."); return }

        // Pre-warm
        fetch(`${AGENT_BASE_URL}/api/health`).catch(() => {})
        // Direkt Research starten — kein Clarify
        startResearch(zieljob)
    }, [])

    // ─── Research → Assessment ─────────────────────────────────

    async function startResearch(zieljob: string) {
        let msgIndex = 0
        const msgInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length
            setLoadingMsg(LOADING_MESSAGES[msgIndex])
        }, 2500)

        let prog = 0
        const progInterval = setInterval(() => {
            prog += Math.random() * 8 + 2
            if (prog > 90) prog = 90
            setLoadingProgress(prog)
        }, 500)

        try {
            // Research + Items PARALLEL laden (spart 3-5 Sekunden)
            const [researchRes, itemsRes] = await Promise.allSettled([
                callAgent("/api/skills/research", {
                    zieljob,
                    branche: "",
                    aktueller_job: "",
                    job_beschreibung: "",
                }, 3),
                callAgent("/api/assessment/items", { session_id: getSid() }, 2),
            ])

            clearInterval(msgInterval)
            clearInterval(progInterval)
            setLoadingProgress(100)

            if (researchRes.status !== "fulfilled") throw new Error("Skill-Research fehlgeschlagen")
            const result = researchRes.value as SkillResearchResult
            setResearchResult(result)

            // Items vormerken falls schon geladen
            let preloadedItems: any[] | null = null
            if (itemsRes.status === "fulfilled" && itemsRes.value?.items) {
                preloadedItems = itemsRes.value.items
            }

            await sleep(400)
            setLoading(false)
            await startAssessment(result, zieljob, preloadedItems)
        } catch (err: any) {
            clearInterval(msgInterval)
            clearInterval(progInterval)
            setLoading(false)
            setError(`Skill-Analyse fehlgeschlagen: ${err.message}`)
        }
    }

    async function startAssessment(research: SkillResearchResult, zieljob: string, preloadedItems: any[] | null = null) {
        // Intro: Was wir gefunden haben
        setBubbles([{ kind: "typing", id: nextId() }])
        await sleep(1200)

        const meta = research.meta as any
        const skillCount = research.skills.length
        setBubbles([{
            kind: "agent",
            text: `Ich hab mir angeschaut was "${zieljob}" braucht — ${meta?.stellenanzeigen_gefunden || skillCount} Stellenanzeigen analysiert, ${skillCount} relevante Skills gefunden.`,
            id: nextId()
        }])

        // Brücke: Warum die Fragen nichts mit Arbeit zu tun haben
        await sleep(1200)
        const bridgeTyping = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: bridgeTyping }])
        await sleep(1500)
        setBubbles(prev => {
            const filtered = prev.filter(b => b.id !== bridgeTyping)
            return [...filtered, {
                kind: "agent",
                text: "Jetzt will ich herausfinden wie DU tickst — dann kann ich vergleichen. Die nächsten Fragen haben absichtlich nichts mit Arbeit zu tun. Antworte einfach ehrlich.",
                id: nextId()
            }]
        })

        // Kurze Pause + "Erstelle Assessment" Message
        await sleep(1000)
        const prepTyping = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: prepTyping }])
        await sleep(1200)
        setBubbles(prev => {
            const filtered = prev.filter(b => b.id !== prepTyping)
            return [...filtered, {
                kind: "agent",
                text: "Gib mir einen kurzen Moment — ich stelle dein Assessment zusammen...",
                id: nextId()
            }]
        })

        await sleep(600)
        const typingId = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])

        // Items: vorgeladen oder jetzt laden. Diagnostik parallel.
        const needsItems = !preloadedItems
        const [itemsResult, diagResult] = await Promise.allSettled([
            needsItems
                ? callAgent("/api/assessment/items", { session_id: sessionId }, 2)
                : Promise.resolve({ items: preloadedItems }),
            callAgent("/api/skills/diagnostik", {
                zieljob: zieljob,
                branche: "",
                skills: research.skills.map(s => ({ name: s.name, kategorie: s.kategorie })),
                job_beschreibung: "",
            }, 1)
        ])

        let items: any[] = []
        if (preloadedItems) {
            items = preloadedItems
        } else if (itemsResult.status === "fulfilled" && itemsResult.value?.items) {
            items = itemsResult.value.items
        } else {
            setError("Assessment konnte nicht geladen werden. Bitte lade die Seite neu.")
            return
        }

        // IMMER Refs setzen — egal ob preloaded oder frisch geladen
        setAssessmentItems(items)
        setCurrentItemIndex(0)
        setAssessmentAnswers([])
        assessmentItemsRef.current = items
        assessmentAnswersRef.current = []
        currentItemIndexRef.current = 0

        if (diagResult.status === "fulfilled") setDiagnostikStrategy(diagResult.value)

        setBubbles(prev => {
            const filtered = prev.filter(b => b.id !== typingId)
            return [...filtered, {
                kind: "agent",
                text: "Es gibt kein richtig oder falsch. Los geht's!",
                id: nextId()
            }]
        })

        await sleep(600)
        showItem(0, items)
    }

    // ─── Assessment Items ──────────────────────────────────────

    function showItem(index: number, items: any[]) {
        if (index >= items.length) { finishAssessment(); return }

        const item = items[index]
        setCurrentItemIndex(index)
        currentItemIndexRef.current = index
        setAnswered(false)
        setStartTime(Date.now())

        if (item.typ === "statement") {
            setBubbles(prev => [...prev, { kind: "statement", data: item, id: nextId() }])
        } else if (item.typ === "forced_choice") {
            setBubbles(prev => [...prev, { kind: "forced_choice", data: item, id: nextId() }])
        }
    }

    async function handleItemAnswer(itemId: string, optionId: string, optionText: string, itemText: string) {
        if (answered) return
        setAnswered(true)

        const newAnswer = { item_id: itemId, antwort: optionId, item_text: itemText }
        assessmentAnswersRef.current = [...assessmentAnswersRef.current, newAnswer]
        setAssessmentAnswers(prev => [...prev, newAnswer])

        setBubbles(prev => [...prev, { kind: "user", text: optionText, id: nextId() }])
        await sleep(400)

        const nextIdx = currentItemIndexRef.current + 1
        if (nextIdx < assessmentItemsRef.current.length) {
            showItem(nextIdx, assessmentItemsRef.current)
        } else {
            finishAssessment()
        }
    }

    async function finishAssessment() {
        const typingId = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])

        try {
            const result = await callAgent("/api/assessment/evaluate", {
                session_id: sessionId,
                zieljob: jobData.zieljob,
                aktueller_job: "",
                branche: "",
                job_beschreibung: "",
                researched_skills: researchResult?.skills || [],
                varianz_antworten: [],
                diagnostik_strategy: diagnostikStrategy,
                dimension_scores: {},
                answers: assessmentAnswersRef.current,
            }, 2)

            setBubbles(prev => prev.filter(b => b.id !== typingId))

            if (result.messages) {
                for (const msg of result.messages) {
                    const tId = nextId()
                    setBubbles(prev => [...prev, { kind: "typing", id: tId }])
                    await sleep(msg.delay_ms)
                    setBubbles(prev => prev.filter(b => b.id !== tId).concat({ kind: "agent", text: msg.text, id: nextId() }))
                }
            }

            if (result.dashboard) {
                setBubbles(prev => [...prev, { kind: "dashboard", data: result.dashboard, id: nextId() }])
            }
        } catch (err: any) {
            setBubbles(prev => prev.filter(b => b.id !== typingId))
            setError(`Auswertung fehlgeschlagen: ${err.message}`)
        }
    }

    // ─── Styles ────────────────────────────────────────────────

    const containerStyle: React.CSSProperties = {
        width: "100%", maxWidth, margin: "0 auto", height: "100%",
        display: "flex", flexDirection: "column", background: "#f8fafc",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }
    const chatAreaStyle: React.CSSProperties = {
        flex: 1, overflowY: "auto", padding: isMobile ? "16px 12px" : "24px 20px",
        display: "flex", flexDirection: "column", gap: 12,
    }
    const agentBubbleStyle: React.CSSProperties = {
        maxWidth: "85%", padding: isMobile ? "12px 14px" : "14px 18px",
        background: "#fff", borderRadius: "18px 18px 18px 4px",
        border: "1px solid #e5e7eb", fontSize: isMobile ? 14 : 15,
        lineHeight: 1.5, color: "#1f2937", alignSelf: "flex-start",
    }
    const userBubbleStyle: React.CSSProperties = {
        maxWidth: "75%", padding: isMobile ? "10px 14px" : "12px 18px",
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        borderRadius: "18px 18px 4px 18px", fontSize: isMobile ? 14 : 15,
        lineHeight: 1.5, color: "#fff", alignSelf: "flex-end",
    }
    const typingStyle: React.CSSProperties = {
        ...agentBubbleStyle, display: "flex", gap: 4, padding: "14px 20px",
    }

    // ─── Loading Screen ────────────────────────────────────────

    if (loading) {
        return (
            <div style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "#f8fafc", padding: 20,
            }}>
                <div style={{
                    maxWidth: 400, width: "100%", textAlign: "center",
                    background: "#fff", borderRadius: 20, padding: "32px 24px",
                    border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "linear-gradient(135deg, #22d3ee, #10b981)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px", animation: "pulse 2s infinite",
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                        {jobData.zieljob ? `Analysiere "${jobData.zieljob}"...` : "Wird vorbereitet..."}
                    </h2>
                    <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
                        {loadingMsg}
                    </p>
                    <div style={{ width: "100%", height: 6, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
                        <div style={{
                            width: `${loadingProgress}%`, height: "100%", borderRadius: 99,
                            background: "linear-gradient(90deg, #22d3ee, #10b981)",
                            transition: "width 0.3s ease",
                        }} />
                    </div>
                    <div style={{ marginTop: 20, padding: 14, background: "#f0fdf4", borderRadius: 12 }}>
                        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                            💡 <strong>Tipp:</strong> Es gibt keine richtigen oder falschen Antworten. Antworte so wie du wirklich tickst.
                        </div>
                    </div>
                </div>
                <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
            </div>
        )
    }

    // ─── Error Screen ──────────────────────────────────────────

    if (error) {
        return (
            <div style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "#f8fafc", padding: 20,
            }}>
                <div style={{
                    maxWidth: 400, width: "100%", textAlign: "center",
                    background: "#fff", borderRadius: 20, padding: "32px 24px",
                    border: "1px solid #fecaca",
                }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#b91c1c", margin: "0 0 8px" }}>Etwas ist schiefgelaufen</h2>
                    <p style={{ fontSize: 14, color: "#7f1d1d", margin: "0 0 16px", lineHeight: 1.5 }}>{error}</p>
                    <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/" }} style={{
                        padding: "12px 24px", borderRadius: 12, border: "none",
                        background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}>
                        Zurück zur Startseite
                    </button>
                </div>
            </div>
        )
    }

    // ─── Chat Render ───────────────────────────────────────────

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{
                padding: isMobile ? "14px 16px" : "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                background: "#fff",
                display: "flex", alignItems: "center", gap: 10,
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #22d3ee, #10b981)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                }}>
                    🎯
                </div>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Work Mentor</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{jobData.zieljob || "Assessment"}</div>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} style={chatAreaStyle}>
                {bubbles.map((bubble) => {
                    switch (bubble.kind) {
                        case "agent":
                            return <div key={bubble.id} style={agentBubbleStyle}>{bubble.text}</div>

                        case "user":
                            return <div key={bubble.id} style={userBubbleStyle}>{bubble.text}</div>

                        case "typing":
                            return (
                                <div key={bubble.id} style={typingStyle}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: 8, height: 8, borderRadius: "50%",
                                            background: "#9ca3af",
                                            animation: `typing-dot 1.4s ${i * 0.2}s infinite ease-in-out`,
                                        }} />
                                    ))}
                                    <style>{`@keyframes typing-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
                                </div>
                            )

                        case "statement":
                            return (
                                <StatementBubble
                                    key={bubble.id}
                                    data={bubble.data}
                                    isMobile={isMobile}
                                    onAnswer={handleItemAnswer}
                                    totalItems={assessmentItemsRef.current.length}
                                />
                            )

                        case "forced_choice":
                            return (
                                <ForcedChoiceBubble
                                    key={bubble.id}
                                    data={bubble.data}
                                    isMobile={isMobile}
                                    onAnswer={handleItemAnswer}
                                    totalItems={assessmentItemsRef.current.length}
                                />
                            )

                        case "dashboard":
                            return <DashboardCard key={bubble.id} d={bubble.data} isMobile={isMobile} />

                        default:
                            return null
                    }
                })}
            </div>
        </div>
    )
}

// ─── Statement Bubble ──────────────────────────────────────────

function StatementBubble({ data, isMobile, onAnswer, totalItems }: {
    data: any; isMobile: boolean;
    onAnswer: (itemId: string, optionId: string, optionText: string, itemText: string) => void;
    totalItems: number;
}) {
    const [selected, setSelected] = React.useState<string | null>(null)
    const progress = data.progress ? Math.round((data.progress.current / totalItems) * 100) : 0

    return (
        <div style={{
            maxWidth: "90%", alignSelf: "flex-start",
            background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
            padding: isMobile ? "14px 16px" : "18px 20px", marginTop: 4,
        }}>
            {/* Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                    {data.progress?.current} / {totalItems}
                </span>
                <div style={{ flex: 1, marginLeft: 10, height: 4, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #22d3ee, #10b981)", transition: "width 0.3s" }} />
                </div>
            </div>

            {/* Statement text */}
            <p style={{ margin: "0 0 14px", fontSize: isMobile ? 15 : 16, fontWeight: 600, color: "#1f2937", lineHeight: 1.5 }}>
                {data.text}
            </p>

            {/* Options */}
            <div style={{ display: "flex", gap: 8 }}>
                {data.optionen.map((opt: Option) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            if (selected) return
                            setSelected(opt.id)
                            onAnswer(data.item_id, opt.id, opt.text, data.text)
                        }}
                        disabled={!!selected}
                        style={{
                            flex: 1, padding: "12px 8px", borderRadius: 12,
                            border: selected === opt.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
                            background: selected === opt.id ? "#eff6ff" : "#fff",
                            color: selected === opt.id ? "#2563eb" : "#374151",
                            fontSize: isMobile ? 13 : 14, fontWeight: 600,
                            cursor: selected ? "default" : "pointer",
                            opacity: selected && selected !== opt.id ? 0.4 : 1,
                            transition: "all 0.15s",
                        }}
                    >
                        {opt.text}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Forced Choice Bubble ──────────────────────────────────────

function ForcedChoiceBubble({ data, isMobile, onAnswer, totalItems }: {
    data: any; isMobile: boolean;
    onAnswer: (itemId: string, optionId: string, optionText: string, itemText: string) => void;
    totalItems: number;
}) {
    const [selected, setSelected] = React.useState<string | null>(null)
    const progress = data.progress ? Math.round((data.progress.current / totalItems) * 100) : 0

    return (
        <div style={{
            maxWidth: "90%", alignSelf: "flex-start",
            background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
            padding: isMobile ? "14px 16px" : "18px 20px", marginTop: 4,
        }}>
            {/* Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                    {data.progress?.current} / {totalItems}
                </span>
                <div style={{ flex: 1, marginLeft: 10, height: 4, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #22d3ee, #10b981)", transition: "width 0.3s" }} />
                </div>
            </div>

            {/* Question */}
            <p style={{ margin: "0 0 14px", fontSize: isMobile ? 14 : 15, fontWeight: 600, color: "#6b7280" }}>
                {data.frage}
            </p>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.optionen.map((opt: Option) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            if (selected) return
                            setSelected(opt.id)
                            onAnswer(data.item_id, opt.id, opt.text, data.frage)
                        }}
                        disabled={!!selected}
                        style={{
                            width: "100%", padding: "14px 16px", borderRadius: 12,
                            border: selected === opt.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
                            background: selected === opt.id ? "#eff6ff" : "#fff",
                            color: selected === opt.id ? "#2563eb" : "#374151",
                            fontSize: isMobile ? 14 : 15, fontWeight: 500,
                            textAlign: "left", cursor: selected ? "default" : "pointer",
                            opacity: selected && selected !== opt.id ? 0.4 : 1,
                            transition: "all 0.15s", lineHeight: 1.4,
                        }}
                    >
                        {opt.text}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Dashboard Card ────────────────────────────────────────────

function DashboardCard({ d, isMobile }: { d: any; isMobile: boolean }) {
    const scoreColor = d.match_score >= 80 ? "#059669" : d.match_score >= 70 ? "#2563eb" : d.match_score >= 60 ? "#d97706" : "#dc2626"

    // Bewertung → Farbe
    const bewertungColor = (b: string) => {
        if (!b) return "#d97706"
        const lower = b.toLowerCase()
        if (lower.includes("stark")) return "#059669"
        if (lower.includes("solide")) return "#2563eb"
        if (lower.includes("entwicklung")) return "#d97706"
        if (lower.includes("lücke")) return "#dc2626"
        return "#6b7280"
    }

    return (
        <div style={{
            width: "100%", maxWidth: 520, alignSelf: "center",
            background: "#fff", borderRadius: 20,
            border: "1px solid #e5e7eb", overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginTop: 8,
        }}>
            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, #1e293b, #334155)",
                padding: isMobile ? "24px 18px" : "32px 24px",
                textAlign: "center", color: "#fff",
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    border: `4px solid ${scoreColor}`, margin: "0 auto 12px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 800, color: scoreColor,
                    background: "rgba(255,255,255,0.1)",
                }}>
                    {d.match_score}%
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{d.match_label}</div>
            </div>

            {/* Body */}
            <div style={{ padding: isMobile ? "18px 16px" : "24px 20px" }}>
                {/* Dimensions */}
                {d.dimensions?.map((dim: any, i: number) => {
                    // Kompatibel mit altem (skill/score) UND neuem Format (label/user_score)
                    const label = dim.label || dim.skill || "?"
                    const score = normalizeScore(dim.user_score ?? dim.score ?? 50)
                    const color = bewertungColor(dim.bewertung)

                    // Tendenz-Label statt exakte Prozente
                    const tendenz = score >= 75 ? "Stark ausgeprägt" : score >= 55 ? "Ausgeglichen" : "Weniger ausgeprägt"
                    const tendenzColor = score >= 75 ? "#059669" : score >= 55 ? "#2563eb" : "#d97706"

                    return (
                        <div key={i} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, color: tendenzColor,
                                    background: `${tendenzColor}12`, padding: "3px 8px", borderRadius: 8,
                                }}>
                                    {dim.bewertung || tendenz}
                                </span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
                                <div style={{
                                    width: `${score}%`, height: "100%", borderRadius: 99,
                                    background: score >= 70
                                        ? "linear-gradient(90deg, #22d3ee, #10b981)"
                                        : score >= 50
                                            ? "linear-gradient(90deg, #60a5fa, #3b82f6)"
                                            : "linear-gradient(90deg, #fbbf24, #f59e0b)",
                                    transition: "width 0.5s",
                                }} />
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>{dim.insight}</div>
                        </div>
                    )
                })}

                {/* Stärken */}
                {d.staerken?.length > 0 && (
                    <div style={{ padding: 14, background: "#f0fdf4", borderRadius: 10, marginTop: 16, borderLeft: "3px solid #10b981" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>💪 Deine Stärken</div>
                        {d.staerken.map((s: any, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>
                                <strong>{s.dimension || s.skill || "?"}:</strong> {s.begruendung}
                            </div>
                        ))}
                    </div>
                )}

                {/* Hauptgap */}
                {d.hauptgap && (
                    <div style={{ padding: 14, background: "#fff7ed", borderRadius: 10, marginTop: 12, borderLeft: "3px solid #f59e0b" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#d97706" }}>🎯 Größter Hebel</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>
                            <strong>{d.hauptgap.label || d.hauptgap.skill || d.hauptgap.dimension || "?"}:</strong> {d.hauptgap.beschreibung || d.hauptgap.hauptluecke}
                        </div>
                    </div>
                )}

                {/* Bright vs Dark */}
                {d.bright_vs_dark?.beschreibung && (
                    <div style={{ padding: 14, background: "#eef2ff", borderRadius: 10, marginTop: 12, borderLeft: "3px solid #6366f1" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#4338ca" }}>🌗 Alltag vs. Druck</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.5 }}>{d.bright_vs_dark.beschreibung}</div>
                    </div>
                )}

                {/* Motive */}
                {d.motive && (
                    <div style={{ padding: 14, background: "#faf5ff", borderRadius: 10, marginTop: 12, borderLeft: "3px solid #a855f7" }}>
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
                    <div style={{ marginTop: 20, padding: 16, background: "#eff6ff", borderRadius: 12, textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>📚 Empfohlen für dich</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>{d.buchempfehlung.titel}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>von {d.buchempfehlung.autor}</div>
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 8, lineHeight: 1.5 }}>{d.buchempfehlung.begruendung}</div>
                        <a
                            href={`https://www.amazon.de/s?k=${encodeURIComponent(d.buchempfehlung.amazon_suchbegriff)}&tag=workmentor21-21`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-block", marginTop: 12, padding: "10px 24px",
                                background: "#f59e0b", color: "#fff", borderRadius: 24,
                                fontSize: 13, fontWeight: 600, textDecoration: "none",
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
