import * as React from "react"

/**
 * WMAssessmentChat – Work Mentor Agent v2.1
 * Chat-basierte Assessment-Komponente für Framer.
 * NEU: Skill-Research + Varianz-Fragen VOR dem Assessment.
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

type Progress = { current: number; estimated_total: number; phase: string }

type AgentResponse =
    | { typ: "agent_message"; messages: AgentMessage[]; action?: { typ: string; buttons: ButtonAction[] } }
    | { typ: "frage"; frage_nr: number; perspektive: string; skill: string; frage: string; optionen: Option[]; progress?: Progress; _meta: Meta }
    | { typ: "praeferenz"; frage_nr: number; perspektive: string; dimension: string; frage: string; optionen: Option[]; progress?: Progress; _meta: Meta }
    | { typ: "magie_moment"; messages: AgentMessage[]; next: AgentResponse }
    | { typ: "abschluss"; messages: AgentMessage[]; dashboard: Dashboard }
    | { typ: "error"; code: string; message: string }

// Skill Research Types
type ResearchedSkill = {
    name: string
    kategorie: string
    gewichtung: number
    belege: string[]
    varianz: string
    varianz_erklaerung: string
}
type VarianzOption = { text: string; skill_anpassung: string }
type VarianzFrage = {
    frage: string
    grund: string
    beeinflusst_skills: string[]
    optionen: VarianzOption[]
}
type SkillResearchResult = {
    skills: ResearchedSkill[]
    varianz_fragen: VarianzFrage[]
    meta: Record<string, unknown>
}
type VarianzAntwort = { frage: string; antwort: string; skill_anpassung: string }

// Chat-Bubble types for rendering
type ChatBubble =
    | { kind: "agent"; text: string; id: string }
    | { kind: "user"; text: string; id: string }
    | { kind: "frage"; data: AgentResponse & { typ: "frage" | "praeferenz" }; id: string }
    | { kind: "buttons"; buttons: ButtonAction[]; id: string }
    | { kind: "typing"; id: string }
    | { kind: "dashboard"; data: Dashboard; id: string }
    | { kind: "varianz"; frage: VarianzFrage; index: number; id: string }

// App phases
type Phase = "research" | "varianz" | "assessment"

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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Loading Messages ─────────────────────────────────────────

const LOADING_MESSAGES = [
    "Durchsuche Stellenanzeigen...",
    "Analysiere Anforderungsprofile...",
    "Vergleiche Skill-Muster...",
    "Erkenne Varianz zwischen Positionen...",
    "Bereite dein Assessment vor...",
]

// ─── Component ────────────────────────────────────────────────

export default function WMAssessmentChat({ maxWidth = 680 }: Props) {
    const isMobile = useIsMobile()
    const [phase, setPhase] = React.useState<Phase>("research")
    const [bubbles, setBubbles] = React.useState<ChatBubble[]>([])
    const [sessionId, setSessionId] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [frageNr, setFrageNr] = React.useState(0)
    const [answered, setAnswered] = React.useState(false)
    const [startTime, setStartTime] = React.useState(0)
    const [progress, setProgress] = React.useState<Progress | null>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const processingRef = React.useRef(false)

    // Research state
    const [researchResult, setResearchResult] = React.useState<SkillResearchResult | null>(null)
    const [varianzAntworten, setVarianzAntworten] = React.useState<VarianzAntwort[]>([])
    const [currentVarianzIndex, setCurrentVarianzIndex] = React.useState(0)
    const [loadingMsg, setLoadingMsg] = React.useState(LOADING_MESSAGES[0])
    const [loadingProgress, setLoadingProgress] = React.useState(0)

    // Session data from sessionStorage
    const [jobData, setJobData] = React.useState({ zieljob: "", aktuellerJob: "", branche: "" })

    // Auto-scroll
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
    }, [bubbles])

    // ─── Agent API calls ───────────────────────────────────────

    async function callAgent(endpoint: string, body: Record<string, unknown>): Promise<any> {
        const res = await fetch(`${AGENT_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`Agent error: ${res.status}`)
        return res.json()
    }

    // ─── Phase 1: Skill Research ──────────────────────────────

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
        setJobData({ zieljob, aktuellerJob, branche })

        if (!zieljob) {
            setLoading(false)
            setError("Kein Zieljob gefunden. Bitte starte von der Startseite.")
            return
        }

        // Start Skill Research
        startResearch(zieljob, branche, aktuellerJob)
    }, [])

    async function startResearch(zieljob: string, branche: string, aktuellerJob: string) {
        // Animate loading messages
        let msgIndex = 0
        const msgInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length
            setLoadingMsg(LOADING_MESSAGES[msgIndex])
        }, 2500)

        // Animate progress bar
        let prog = 0
        const progInterval = setInterval(() => {
            prog += Math.random() * 8 + 2
            if (prog > 90) prog = 90
            setLoadingProgress(prog)
        }, 500)

        try {
            const result: SkillResearchResult = await callAgent("/api/skills/research", {
                zieljob,
                branche,
                aktueller_job: aktuellerJob,
            })

            clearInterval(msgInterval)
            clearInterval(progInterval)
            setLoadingProgress(100)
            setResearchResult(result)

            await sleep(600)

            // Wenn Varianz-Fragen vorhanden → Phase varianz
            if (result.varianz_fragen && result.varianz_fragen.length > 0) {
                setPhase("varianz")
                setLoading(false)
                // Zeige erste Varianz-Frage als Chat
                showVarianzIntro(result)
            } else {
                // Keine Varianz-Fragen → direkt zum Assessment
                setPhase("assessment")
                setLoading(false)
                startAssessment(result.skills, [])
            }
        } catch (err: any) {
            clearInterval(msgInterval)
            clearInterval(progInterval)
            setLoading(false)
            setError(`Skill-Analyse fehlgeschlagen: ${err.message}`)
        }
    }

    // ─── Phase 2: Varianz-Fragen ──────────────────────────────

    async function showVarianzIntro(result: SkillResearchResult) {
        const skillCount = result.skills.length
        const meta = result.meta as any

        // Agent intro messages
        const introId1 = nextId()
        setBubbles([{ kind: "typing", id: introId1 }])
        await sleep(1200)
        setBubbles([{
            kind: "agent",
            text: `Ich hab ${meta?.stellenanzeigen_gefunden || skillCount} Stellenanzeigen analysiert und ${skillCount} relevante Skills gefunden.`,
            id: nextId()
        }])

        await sleep(800)
        const introId2 = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: introId2 }])
        await sleep(1500)
        setBubbles(prev => {
            const filtered = prev.filter(b => b.id !== introId2)
            return [...filtered, {
                kind: "agent",
                text: "Aber bevor wir starten — ich muss ein paar Sachen wissen, weil die Stellenanzeigen sich bei manchen Punkten unterscheiden.",
                id: nextId()
            }]
        })

        await sleep(600)
        // Zeige erste Varianz-Frage
        showVarianzFrage(0, result.varianz_fragen)
    }

    function showVarianzFrage(index: number, fragen: VarianzFrage[]) {
        if (index >= fragen.length) {
            // Alle Varianz-Fragen beantwortet → Assessment starten
            transitionToAssessment()
            return
        }

        setCurrentVarianzIndex(index)
        setBubbles(prev => [...prev, {
            kind: "varianz",
            frage: fragen[index],
            index,
            id: nextId()
        }])
    }

    async function handleVarianzAnswer(frage: VarianzFrage, option: VarianzOption) {
        const antwort: VarianzAntwort = {
            frage: frage.frage,
            antwort: option.text,
            skill_anpassung: option.skill_anpassung,
        }

        // User-Antwort als Bubble
        setBubbles(prev => [...prev, { kind: "user", text: option.text, id: nextId() }])

        setVarianzAntworten(prev => {
            const updated = [...prev, antwort]
            return updated
        })

        await sleep(400)

        // Nächste Varianz-Frage oder Assessment
        const fragen = researchResult?.varianz_fragen || []
        const nextIndex = currentVarianzIndex + 1

        if (nextIndex < fragen.length) {
            // Kurzer Agent-Kommentar
            const typingId = nextId()
            setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
            await sleep(900)
            setBubbles(prev => {
                const filtered = prev.filter(b => b.id !== typingId)
                return [...filtered, {
                    kind: "agent",
                    text: "Gut, noch eine kurze Frage.",
                    id: nextId()
                }]
            })
            await sleep(400)
            showVarianzFrage(nextIndex, fragen)
        } else {
            transitionToAssessment()
        }
    }

    async function transitionToAssessment() {
        // Übergang zum Assessment
        const typingId = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
        await sleep(1200)
        setBubbles(prev => {
            const filtered = prev.filter(b => b.id !== typingId)
            return [...filtered, {
                kind: "agent",
                text: "Alles klar. Ich weiß jetzt genug über die Position. Jetzt schauen wir mal wie gut du dazu passt.",
                id: nextId()
            }]
        })

        await sleep(800)
        setPhase("assessment")
        // Verwende den aktuellen State für varianzAntworten
        startAssessment(researchResult?.skills || [], varianzAntworten)
    }

    // ─── Phase 3: Assessment ──────────────────────────────────

    async function startAssessment(skills: ResearchedSkill[], vAntworten: VarianzAntwort[]) {
        try {
            const response = await callAgent("/api/assessment/start", {
                session_id: sessionId,
                zieljob: jobData.zieljob,
                aktueller_job: jobData.aktuellerJob,
                branche: jobData.branche,
                researched_skills: skills,
                varianz_antworten: vAntworten.length > 0 ? vAntworten : undefined,
            })
            await processResponse(response)
        } catch (err: any) {
            setError(`Agent-Verbindung fehlgeschlagen: ${err.message}`)
        }
    }

    // ─── Process agent response ───────────────────────────────

    async function processResponse(response: AgentResponse) {
        if (processingRef.current) return
        processingRef.current = true

        try {
            switch (response.typ) {
                case "agent_message": {
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
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
                    if ('progress' in response && response.progress) {
                        setProgress(response.progress as Progress)
                    }
                    setBubbles(prev => [...prev, { kind: "frage", data: response, id: nextId() }])
                    break
                }

                case "magie_moment": {
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
                    if (response.next) {
                        await sleep(800)
                        processingRef.current = false
                        await processResponse(response.next as AgentResponse)
                        return
                    }
                    break
                }

                case "abschluss": {
                    for (const msg of response.messages) {
                        const typingId = nextId()
                        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])
                        await sleep(msg.delay_ms)
                        setBubbles(prev =>
                            prev.filter(b => b.id !== typingId).concat({ kind: "agent", text: msg.text, id: nextId() })
                        )
                    }
                    await sleep(500)
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

    // ─── Handle user actions ──────────────────────────────────

    async function handleButtonClick(buttonId: string) {
        setBubbles(prev => prev.filter(b => b.kind !== "buttons"))
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

        setBubbles(prev => [...prev, { kind: "user", text: optionText, id: nextId() }])

        const typingId = nextId()
        setBubbles(prev => [...prev, { kind: "typing", id: typingId }])

        try {
            const response = await callAgent("/api/assessment/answer", {
                session_id: sessionId,
                frage_nr: frageNr,
                antwort: optionId,
                reaction_time_ms: reactionTime,
            })
            setBubbles(prev => prev.filter(b => b.id !== typingId))
            await processResponse(response)
        } catch (err: any) {
            setBubbles(prev => prev.filter(b => b.id !== typingId))
            setError(`Fehler: ${err.message}`)
        }
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

    // ─── Phase 1: Research Loading Screen ─────────────────────

    if (loading && phase === "research") {
        return (
            <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
                <div style={{
                    textAlign: "center",
                    padding: isMobile ? "24px 20px" : "40px 32px",
                    maxWidth: 400,
                }}>
                    {/* Animated icon */}
                    <div style={{
                        fontSize: 48,
                        marginBottom: 20,
                        animation: "wmPulse 2s infinite ease-in-out",
                    }}>
                        🔍
                    </div>

                    {/* Title */}
                    <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#1f2937",
                        marginBottom: 8,
                    }}>
                        Analysiere den Arbeitsmarkt
                    </div>

                    {/* Subtitle with job */}
                    <div style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginBottom: 24,
                    }}>
                        {jobData.zieljob} {jobData.branche ? `in ${jobData.branche}` : ""}
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        width: "100%",
                        height: 6,
                        background: "#e5e7eb",
                        borderRadius: 3,
                        overflow: "hidden",
                        marginBottom: 16,
                    }}>
                        <div style={{
                            width: `${loadingProgress}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: "linear-gradient(90deg, #06b6d4, #2563eb)",
                            transition: "width 0.5s ease",
                        }} />
                    </div>

                    {/* Loading message */}
                    <div style={{
                        fontSize: 13,
                        color: "#2563eb",
                        fontWeight: 500,
                        minHeight: 20,
                        transition: "opacity 0.3s ease",
                    }}>
                        {loadingMsg}
                    </div>
                </div>

                <style>{`
                    @keyframes wmPulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                `}</style>
            </div>
        )
    }

    // ─── Error screen ─────────────────────────────────────────

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

    // ─── Generic loading ──────────────────────────────────────

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
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>Work Mentor</div>
                    <div style={{ fontSize: 11, color: "#10b981" }}>● Online</div>
                </div>
                {/* Progress in header during assessment */}
                {progress && phase === "assessment" && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "#f1f5f9",
                        borderRadius: 16,
                    }}>
                        <div style={{ width: 40, height: 3, borderRadius: 2, background: "#e2e8f0", overflow: "hidden" }}>
                            <div style={{
                                width: `${Math.round((progress.current / progress.estimated_total) * 100)}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, #06b6d4, #2563eb)",
                                transition: "width 0.3s ease",
                            }} />
                        </div>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>
                            {progress.current}/{progress.estimated_total}
                        </span>
                    </div>
                )}
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

                        case "varianz":
                            return (
                                <VarianzCard
                                    key={bubble.id}
                                    frage={bubble.frage}
                                    isMobile={isMobile}
                                    onAnswer={(option) => handleVarianzAnswer(bubble.frage, option)}
                                />
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

            {/* CSS for animations */}
            <style>{`
                @keyframes wmTypingDot {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

// ─── Varianz Card ────────────────────────────────────────────

function VarianzCard({
    frage,
    isMobile,
    onAnswer
}: {
    frage: VarianzFrage
    isMobile: boolean
    onAnswer: (option: VarianzOption) => void
}) {
    const [answered, setAnswered] = React.useState(false)

    return (
        <div style={{
            alignSelf: "flex-start",
            width: "100%",
            maxWidth: "95%",
        }}>
            {/* Frage als Agent-Bubble */}
            <div style={{
                maxWidth: "85%",
                padding: isMobile ? "12px 14px" : "14px 18px",
                background: "#fff",
                borderRadius: "18px 18px 18px 4px",
                border: "1px solid #e5e7eb",
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.5,
                color: "#1f2937",
                marginBottom: 10,
            }}>
                {frage.frage}
            </div>

            {/* Optionen als große Karten */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {frage.optionen.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (answered) return
                            setAnswered(true)
                            onAnswer(opt)
                        }}
                        disabled={answered}
                        style={{
                            width: "100%",
                            textAlign: "left",
                            padding: isMobile ? "14px 16px" : "16px 20px",
                            borderRadius: 14,
                            border: "2px solid #e5e7eb",
                            background: "#fff",
                            color: "#374151",
                            fontSize: isMobile ? 14 : 15,
                            lineHeight: 1.5,
                            cursor: answered ? "default" : "pointer",
                            opacity: answered ? 0.5 : 1,
                            transition: "all 0.2s ease",
                            boxSizing: "border-box",
                        }}
                        onMouseEnter={e => {
                            if (!answered) {
                                ;(e.target as HTMLButtonElement).style.borderColor = "#2563eb"
                                ;(e.target as HTMLButtonElement).style.background = "#f0f7ff"
                            }
                        }}
                        onMouseLeave={e => {
                            ;(e.target as HTMLButtonElement).style.borderColor = "#e5e7eb"
                            ;(e.target as HTMLButtonElement).style.background = "#fff"
                        }}
                    >
                        {opt.text}
                    </button>
                ))}
            </div>
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
