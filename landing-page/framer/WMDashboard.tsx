import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

type GapIntensity = "low" | "medium" | "high"
type Bewertung = "Stärke" | "Solide" | "Entwicklungsfeld" | "Klare Lücke"

type Dimension = {
    id?: string
    skill: string
    punkte: number
    bewertung: Bewertung
    insight: string
    verhaltensmuster?: string
}

type Staerke = {
    skill: string
    begruendung: string
}

type Hauptgap = {
    skill: string
    hauptluecke: string
    verhaltensmuster: string
    gap_intensity: "medium" | "high"
}

type Analysis = {
    overall_match_percentage: number
    dimensions: Dimension[]
    staerken: Staerke[]
    hauptgap: Hauptgap
    main_potential: string
    main_risk: string
}

type RootPayload = {
    session_id: string
    analysis: Analysis
    sent_at?: string
}

type Props = {
    /** Optional: Analyse direkt übergeben (z. B. für Preview); sonst wird per Webhook mit sid abgerufen */
    analysisJson?: string
    analysis?: Analysis
    targetRole?: string
    maxWidth?: number
}

const CARD_BORDER = "1px solid #e5e7eb"
const CARD_RADIUS = 18
const CARD_SHADOW = "0 18px 40px rgba(15,23,42,0.08)"
const SID_STORAGE_KEY = "wm_session_id"
const DASHBOARD_WEBHOOK_URL = "https://hook.eu2.make.com/qoawecueizpwusutbdpgct1a7p558w65"
// NOTE: Dieser Webhook liefert im Erfolgsfall das Buch (siehe Screenshot: { status, data: { book_title, amazon_url } }).
const GROWTH_BOOK_RESPOND_WEBHOOK_URL = "https://hook.eu2.make.com/38ussyo211adqjcrhtm4plte5drasu3s"

const GROWTH_BOOK_CACHE_PREFIX = "wm_growth_book_v1"
const GROWTH_BOOK_FETCHING_TTL_MS = 2 * 60 * 1000
const GROWTH_BOOK_FETCHING_PREFIX = "wm_growth_book_fetching_v1"

function bewertungToGapIntensity(bewertung: Bewertung): GapIntensity {
    if (bewertung === "Stärke" || bewertung === "Solide") return "low"
    if (bewertung === "Entwicklungsfeld") return "medium"
    return "high"
}

function punkteToScoreActual(punkte: number): number {
    // Mapping laut Prompt (jeweils "random in Range", aber per Cache stabil)
    if (punkte === 4) return Math.floor(Math.random() * 11) + 85 // 85-95
    if (punkte === 3) return Math.floor(Math.random() * 11) + 65 // 65-75
    if (punkte === 2) return Math.floor(Math.random() * 11) + 45 // 45-55
    if (punkte === 1) return Math.floor(Math.random() * 11) + 25 // 25-35
    if (punkte === -1) return Math.floor(Math.random() * 11) + 10 // 10-20
    return Math.floor(Math.random() * 11) + 10 // Fallback: 10-20
}

const scoreCache = new Map<string, number>()
function getStableScore(skill: string, punkte: number): number {
    const cacheKey = `${skill}:${punkte}`
    if (scoreCache.has(cacheKey)) return scoreCache.get(cacheKey) as number
    const score = punkteToScoreActual(punkte)
    scoreCache.set(cacheKey, score)
    return score
}

function parseAnalysis(input?: string): Analysis | null {
    if (!input) return null
    try {
        const parsed = JSON.parse(input) as RootPayload | Analysis
        if ("analysis" in parsed) return (parsed as RootPayload).analysis
        return parsed as Analysis
    } catch {
        return null
    }
}

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = React.useState(
        typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
    )
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [breakpoint])
    return isMobile
}

function tryParseJSON(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function parseWebhookTextToObject(raw: string): unknown {
    const trimmed = raw.trim()

    // 1) Direkter JSON-Body
    const direct = tryParseJSON(trimmed)
    if (direct !== null) return direct

    // 2) Markdown-Codeblock ```json ... ```
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch?.[1]) {
        const fenced = tryParseJSON(fenceMatch[1].trim())
        if (fenced !== null) return fenced
    }

    // 3) JSON-Objektteil zwischen erstem '{' und letztem '}'
    const firstCurly = trimmed.indexOf("{")
    const lastCurly = trimmed.lastIndexOf("}")
    if (firstCurly >= 0 && lastCurly > firstCurly) {
        const slice = trimmed.slice(firstCurly, lastCurly + 1)
        const obj = tryParseJSON(slice)
        if (obj !== null) return obj
    }

    return null
}

function getSidFromLocation(): string {
    if (typeof window === "undefined") return ""
    const querySid = new URLSearchParams(window.location.search).get("sid")
    const storedSid = window.sessionStorage.getItem(SID_STORAGE_KEY)
    const sid = querySid || storedSid || ""
    if (sid) {
        try {
            window.sessionStorage.setItem(SID_STORAGE_KEY, sid)
        } catch {
            // ignore
        }
    }
    return sid
}

function parseDashboardResponse(data: unknown): Analysis | null {
    if (!data || typeof data !== "object") return null
    const obj = data as Record<string, unknown>

    // Support both wrapped ({ analysis: {...} }) and unwrapped format
    const raw = obj.analysis && typeof obj.analysis === "object" ? obj.analysis : obj
    const a = raw as Record<string, unknown>
    if (Array.isArray(a.dimensions) && a.dimensions.length > 0) {
        return raw as Analysis
    }
    return null
}

export default function WMDashboard(
    { analysisJson, analysis: analysisProp, targetRole, maxWidth = 420 }: Props
) {
    const isMobile = useIsMobile()
    const effectiveMaxWidth = 420
    const [sid, setSid] = React.useState("")
    const [analysis, setAnalysis] = React.useState<Analysis | null>(analysisProp || parseAnalysis(analysisJson))
    const [loading, setLoading] = React.useState(!analysisProp && !analysisJson)
    const [loadError, setLoadError] = React.useState<string | null>(null)

    React.useEffect(() => {
        setSid(getSidFromLocation())
    }, [])

    React.useEffect(() => {
        if (analysisProp || analysisJson) {
            setAnalysis(analysisProp || parseAnalysis(analysisJson))
            setLoading(false)
            return
        }
        if (!sid || typeof window === "undefined") {
            setLoading(false)
            setLoadError("Keine Session-ID (sid) gefunden.")
            return
        }

        let cancelled = false
        setLoading(true)
        setLoadError(null)

        fetch(DASHBOARD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ session_id: sid }),
        })
            .then(async (res) => {
                const raw = await res.text()
                const data = raw ? parseWebhookTextToObject(raw) : null
                if (!data) {
                    console.warn("WMDashboard – Response ist kein valides JSON", {
                        status: res.status,
                        preview: raw.slice(0, 400),
                    })
                    throw new Error("Response ist kein valides JSON")
                }

                if (cancelled) return
                const received = parseDashboardResponse(data)
                if (received) {
                    setAnalysis(received)
                } else {
                    setLoadError("Keine gültigen Analyse-Daten in der Antwort.")
                }
            })
            .catch((err) => {
                if (cancelled) return
                console.error("WMDashboard – Webhook Error:", err)
                setLoadError("Analyse konnte nicht geladen werden.")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [sid, analysisProp, analysisJson])

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    maxWidth: effectiveMaxWidth,
                    margin: "0 auto",
                    padding: isMobile ? "20px 14px" : "32px 24px",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 280,
                    color: "#6b7280",
                    fontSize: 14,
                }}
            >
                Lade deine Karriereanalyse …
            </div>
        )
    }

    if (loadError || !analysis) {
        return (
            <div
                style={{
                    width: "100%",
                    maxWidth: effectiveMaxWidth,
                    margin: "0 auto",
                    padding: isMobile ? "20px 14px" : "32px 24px",
                    boxSizing: "border-box",
                    overflowX: "hidden",
                    color: "#4b5563",
                    fontSize: 14,
                }}
            >
                {loadError || "Keine Analyse-Daten vorhanden."}
            </div>
        )
    }

    const strongCount = analysis.dimensions.filter(
        (d) => d.bewertung === "Stärke" || d.bewertung === "Solide"
    ).length
    const growthCount = analysis.dimensions.filter(
        (d) => d.bewertung === "Entwicklungsfeld" || d.bewertung === "Klare Lücke"
    ).length
    const sumPunkte = analysis.dimensions.reduce((sum, d) => sum + (d.punkte || 0), 0)
    const calculatedScore = Math.min(100, Math.max(50, Math.round(((sumPunkte + 10) / 30) * 100)))

    return (
        <div
            style={{
                width: "100%",
                maxWidth: effectiveMaxWidth,
                margin: "0 auto",
                padding: isMobile ? "20px 14px 32px" : "32px 24px 40px",
                boxSizing: "border-box",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? 16 : 20,
                wordBreak: "break-word",
            }}
        >
            <HeaderCard analysis={analysis} targetRole={targetRole} />
            <MatchScoreCard
                overall={calculatedScore}
                strongCount={strongCount}
                growthCount={growthCount}
            />
            <RadarCard dimensions={analysis.dimensions} />
            <GrowthPathSection sid={sid} />
        </div>
    )
}

function HeaderCard({ analysis, targetRole }: { analysis: Analysis; targetRole?: string }) {
    const isMobile = useIsMobile()
    const padding = isMobile ? "16px 14px 14px" : "20px 20px 18px"
    const gap = isMobile ? 12 : 16
    const iconSize = isMobile ? 46 : 52
    const iconInner = isMobile ? 24 : 28

    return (
        <div
            style={{
                width: "100%",
                background: "#fff",
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                boxShadow: CARD_SHADOW,
                padding,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "center" : "center",
                gap,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    width: iconSize,
                    height: iconSize,
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #e0f2fe, #d1fae5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg width={iconInner} height={iconInner} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
                    <path d="M5 4h2v2a2 2 0 0 1-2-2Z" />
                    <path d="M19 4h-2v2a2 2 0 0 0 2-2Z" />
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>
                    Deine Karriereanalyse
                </div>
                <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: "#111827", marginBottom: 2, lineHeight: 1.25 }}>
                    Basierend auf deinen Antworten
                </div>
                <div style={{ fontSize: isMobile ? 13 : 14, color: "#6b7280" }}>
                    {targetRole ? (
                        <>
                            für{" "}
                            <span style={{ fontWeight: 600, color: "#111827" }}>
                                {targetRole}
                            </span>
                        </>
                    ) : (
                        "für deine aktuelle Zielposition."
                    )}
                </div>
            </div>
        </div>
    )
}

function MatchScoreCard({ overall, strongCount, growthCount }: { overall: number; strongCount: number; growthCount: number }) {
    const isMobile = useIsMobile()
    const percentage = Math.max(0, Math.min(100, overall || 0))
    const size = isMobile ? 132 : 140
    const stroke = isMobile ? 9 : 10
    const r = (size - stroke) / 2
    const circumference = 2 * Math.PI * r
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div
            style={{
                width: "100%",
                background: "#fff",
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                boxShadow: CARD_SHADOW,
                padding: isMobile ? "16px 14px 14px" : "20px 20px 18px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 16,
            }}
        >
            <div
                style={{
                    fontSize: isMobile ? 11 : 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#374151",
                    fontWeight: 600,
                }}
            >
                Karriere-Match-Score
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: size, height: size }}>
                    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                        <defs>
                            <linearGradient id="wm-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4A90E2" />
                                <stop offset="100%" stopColor="#50E3C2" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="#E8F4FC"
                            stroke="#e5e7eb"
                            strokeWidth={stroke}
                        />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke="url(#wm-score-gradient)"
                            strokeWidth={stroke}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                        />
                    </svg>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                        }}
                    >
                        <span style={{ fontSize: isMobile ? 34 : 36, fontWeight: 800, color: "#4A90E2", lineHeight: 1 }}>
                            {percentage}
                            <span style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: "#50E3C2", marginLeft: 1 }}>%</span>
                        </span>
                    </div>
                </div>
                <div style={{ fontSize: isMobile ? 14 : 15, color: "#666", textAlign: "center" }}>
                    Du bist auf einem guten Weg zur Zielposition.
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: isMobile ? 10 : 12,
                }}
            >
                <div
                    style={{
                        borderRadius: 16,
                        background: "#E8F0FE",
                        padding: isMobile ? "12px 12px" : "14px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        border: "1px solid #C2D9FA",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#4A90E2", display: "flex" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                        <span style={{ fontSize: isMobile ? 12 : 13, color: "#4A90E2", fontWeight: 600 }}>Starke Bereiche</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 700, color: "#333", lineHeight: 1 }}>{strongCount}</div>
                </div>
                <div
                    style={{
                        borderRadius: 16,
                        background: "#E6F8EE",
                        padding: isMobile ? "12px 12px" : "14px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        border: "1px solid #A7F3D0",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#50E3C2", display: "flex" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#50E3C2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5" />
                                <polyline points="5 12 12 5 19 12" />
                            </svg>
                        </span>
                        <span style={{ fontSize: isMobile ? 12 : 13, color: "#50E3C2", fontWeight: 600, whiteSpace: "nowrap" }}>Wachstum</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 700, color: "#333", lineHeight: 1 }}>{growthCount}</div>
                </div>
            </div>
        </div>
    )
}

function RadarCard({ dimensions }: { dimensions: Dimension[] }) {
    const isMobile = useIsMobile()
    if (!dimensions || dimensions.length === 0) return null

    const normalized = dimensions.map((d) => ({
        label: d.skill,
        current: Math.max(0, Math.min(100, getStableScore(d.skill, d.punkte))),
        target: 100,
    }))

    const radius = isMobile ? 78 : 90
    const center = 110
    const pointFor = (value: number, index: number, total: number) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2
        const r = (value / 100) * radius
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        }
    }

    const buildPolygon = (key: "current" | "target") =>
        normalized
            .map((dim, idx) => {
                const p = pointFor(dim[key], idx, normalized.length)
                return `${p.x},${p.y}`
            })
            .join(" ")

    const currentPolygon = buildPolygon("current")
    const targetPolygon = buildPolygon("target")

    return (
        <div
            style={{
                width: "100%",
                background: "#fff",
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                boxShadow: CARD_SHADOW,
                padding: isMobile ? "16px 14px 16px" : "18px 18px 20px",
                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    marginBottom: 4,
                }}
            >
                Skill-Vergleich
            </div>
            <div style={{ fontSize: isMobile ? 13 : 14, color: "#4b5563", marginBottom: isMobile ? 12 : 14 }}>
                Aktuelles Profil vs. Zielposition
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <svg
                        width={isMobile ? 200 : 220}
                        height={isMobile ? 200 : 220}
                        viewBox="0 0 220 220"
                        style={{ maxWidth: "100%" }}
                    >
                    <circle cx={center} cy={center} r={radius} fill="#f9fafb" stroke="#e5e7eb" strokeWidth={1} />
                    {[1, 2, 3, 4].map((ring) => (
                        <circle
                            key={ring}
                            cx={center}
                            cy={center}
                            r={(radius * ring) / 4}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth={1}
                        />
                    ))}
                    {normalized.map((dim, idx) => {
                        const outer = pointFor(100, idx, normalized.length)
                        return (
                            <line
                                key={`axis-${dim.label}`}
                                x1={center}
                                y1={center}
                                x2={outer.x}
                                y2={outer.y}
                                stroke="#e5e7eb"
                                strokeWidth={1}
                            />
                        )
                    })}
                    <polygon points={targetPolygon} fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth={1.4} />
                    <polygon points={currentPolygon} fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth={1.8} />
                </svg>
            </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 2, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4b5563" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#2563eb", display: "inline-block" }} />
                        <span>Aktuell</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4b5563" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#10b981", display: "inline-block" }} />
                        <span>Ziel</span>
                    </div>
                </div>
                <ul
                    style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                    }}
                >
                    {normalized.map((dim) => (
                        <li
                            key={dim.label}
                            style={{
                                    fontSize: isMobile ? 12 : 13,
                                color: "#4b5563",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                            }}
                        >
                            <span
                                style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {dim.label}
                            </span>
                            <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                {dim.current} / {dim.target}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

type GrowthBook = {
    title: string
    url: string
}

function extractBookFromWebhookPayload(data: unknown): GrowthBook | null {
    if (!data || typeof data !== "object") return null
    const obj = data as Record<string, unknown>

    const dataObj =
        (obj.data && typeof obj.data === "object" && obj.data) ||
        (obj.payload && typeof obj.payload === "object" && obj.payload) ||
        null
    const nested = dataObj ? (dataObj as Record<string, unknown>) : null

    const nestedBook =
        (obj.book && typeof obj.book === "object" && obj.book) ||
        (obj.resource && typeof obj.resource === "object" && obj.resource) ||
        (obj.payload && typeof obj.payload === "object" && obj.payload) ||
        null
    const nestedBookObj = nestedBook ? (nestedBook as Record<string, unknown>) : null

    const titleCandidate =
        (typeof obj.title === "string" && obj.title) ||
        (typeof obj.book_title === "string" && obj.book_title) ||
        (typeof obj.bookTitle === "string" && obj.bookTitle) ||
        (typeof obj.bookName === "string" && obj.bookName) ||
        (typeof obj.bookTitel === "string" && obj.bookTitel) ||
        (nested && typeof nested.title === "string" && nested.title) ||
        (nested && typeof nested.book_title === "string" && nested.book_title) ||
        (nested && typeof nested.bookTitle === "string" && nested.bookTitle) ||
        (nestedBookObj && typeof nestedBookObj.book_title === "string" && nestedBookObj.book_title) ||
        (nestedBookObj && typeof nestedBookObj.title === "string" && nestedBookObj.title) ||
        null

    const urlCandidate =
        (typeof obj.url === "string" && obj.url) ||
        (typeof obj.link === "string" && obj.link) ||
        (typeof obj.book_url === "string" && obj.book_url) ||
        (typeof obj.bookUrl === "string" && obj.bookUrl) ||
        (typeof obj.bookLink === "string" && obj.bookLink) ||
        (typeof obj.href === "string" && obj.href) ||
        (nested && typeof nested.url === "string" && nested.url) ||
        (nested && typeof nested.link === "string" && nested.link) ||
        (nested && typeof nested.book_url === "string" && nested.book_url) ||
        (nested && typeof nested.bookUrl === "string" && nested.bookUrl) ||
        (nested && typeof nested.bookLink === "string" && nested.bookLink) ||
        // Screenshot-Felder
        (nested && typeof nested.amazon_url === "string" && nested.amazon_url) ||
        (nestedBookObj && typeof nestedBookObj.amazon_url === "string" && nestedBookObj.amazon_url) ||
        null

    if (!titleCandidate || !urlCandidate) return null
    return { title: titleCandidate, url: urlCandidate }
}

function getGrowthBookCacheKey(sid: string) {
    return `${GROWTH_BOOK_CACHE_PREFIX}:${sid}`
}

function getGrowthBookFetchingKey(sid: string) {
    return `${GROWTH_BOOK_FETCHING_PREFIX}:${sid}`
}

function GrowthPathSection({ sid }: { sid: string }) {
    const isMobile = useIsMobile()
    const sliderRef = React.useRef<HTMLDivElement | null>(null)
    const [activeIndex, setActiveIndex] = React.useState(0)

    const fetchedSidRef = React.useRef<string>("")
    const [book, setBook] = React.useState<GrowthBook | null>(null)
    const [bookLoading, setBookLoading] = React.useState(false)

    React.useEffect(() => {
        if (!sid) return
        if (fetchedSidRef.current === sid) return
        fetchedSidRef.current = sid

        // 1) Erst Cache checken (damit Refresh die Buch-Daten behält)
        try {
            const cacheRaw = window.sessionStorage.getItem(getGrowthBookCacheKey(sid))
            if (cacheRaw) {
                const parsed = JSON.parse(cacheRaw) as Partial<GrowthBook> | null
                if (parsed && typeof parsed.title === "string" && parsed.title && typeof parsed.url === "string" && parsed.url) {
                    setBook({ title: parsed.title, url: parsed.url })
                    setBookLoading(false)
                    return
                }
            }
        } catch {
            // ignore cache errors
        }

        if (!GROWTH_BOOK_RESPOND_WEBHOOK_URL) {
            // Ohne URL nur Platzhalter anzeigen (UI vorhanden).
            setBook(null)
            return
        }

        // 2) Fetch läuft schon? (React StrictMode / Remount-Doppelausführung vermeiden)
        try {
            const fetchingRaw = window.sessionStorage.getItem(getGrowthBookFetchingKey(sid))
            if (fetchingRaw) {
                const ts = Number(fetchingRaw)
                const age = Number.isFinite(ts) ? Date.now() - ts : Infinity
                if (age >= 0 && age < GROWTH_BOOK_FETCHING_TTL_MS) {
                    // Wir haben keinen frischen Cache => zeige placeholder bis fetch fertig ist
                    setBookLoading(true)
                    return
                }
            }
        } catch {
            // ignore
        }

        // 3) Markiere "fetching" sofort vor dem Request.
        try {
            window.sessionStorage.setItem(getGrowthBookFetchingKey(sid), String(Date.now()))
        } catch {
            // ignore
        }

        setBookLoading(true)
        fetch(GROWTH_BOOK_RESPOND_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ session_id: sid }),
        })
            .then(async (res) => {
                const raw = await res.text()
                const parsed = raw ? parseWebhookTextToObject(raw) : null
                if (!res.ok) {
                    console.warn("GrowthPathSection – Book webhook failed", { status: res.status, preview: raw.slice(0, 400) })
                }
                return parsed
            })
            .then((parsed) => {
                const extracted = extractBookFromWebhookPayload(parsed)
                setBook(extracted)
                if (extracted?.title && extracted?.url) {
                    try {
                        window.sessionStorage.setItem(getGrowthBookCacheKey(sid), JSON.stringify(extracted))
                        window.sessionStorage.removeItem(getGrowthBookFetchingKey(sid))
                    } catch {
                        // ignore storage errors
                    }
                }
            })
            .catch((err) => {
                console.warn("GrowthPathSection – Book webhook error", err)
                setBook(null)
                try {
                    window.sessionStorage.removeItem(getGrowthBookFetchingKey(sid))
                } catch {
                    // ignore
                }
            })
            .finally(() => setBookLoading(false))
    }, [sid])

    const items = React.useMemo(
        () => [
            {
                id: "book",
                kind: "book" as const,
                title: bookLoading ? "Buch wird geladen …" : book?.title || "Dein Buch",
                subtitle: "Spezifisch ausgewählt für deine Zielposition",
                url: book?.url || "",
                iconBg: "linear-gradient(135deg, #3B82F6, #06B6D4)",
                iconColor: "#fff",
                badgeColor: "#2563eb",
                ctaDisabled: !book?.url,
            },
            {
                id: "course",
                kind: "course" as const,
                title: "Kurse",
                subtitle: "Online-Kurse von Top-Plattformen (Platzhalter)",
                url: "",
                iconBg: "linear-gradient(135deg, #22c55e, #16a34a)",
                iconColor: "#fff",
                badgeColor: "#16a34a",
                ctaDisabled: true,
            },
            {
                id: "mentoring",
                kind: "mentoring" as const,
                title: "1:1 Mentoring",
                subtitle: "Persönliche Begleitung durch Experten (Platzhalter)",
                url: "",
                iconBg: "linear-gradient(135deg, #f97316, #ef4444)",
                iconColor: "#fff",
                badgeColor: "#ea580c",
                ctaDisabled: true,
            },
        ],
        [bookLoading, book]
    )

    const onScroll = () => {
        const el = sliderRef.current
        if (!el) return
        const w = el.clientWidth
        if (w <= 0) return
        const idx = Math.round(el.scrollLeft / w)
        setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)))
    }

    return (
        <div
            style={{
                width: "100%",
                background: "transparent",
                paddingTop: isMobile ? 2 : 4,
                maxWidth: 420,
                margin: "0 auto",
                boxSizing: "border-box",
                overflowX: "hidden",
            }}
        >
            <div style={{ marginBottom: isMobile ? 10 : 12 }}>
                <div
                    style={{
                        fontSize: isMobile ? 22 : 30,
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                        color: "#111827",
                        textAlign: "left",
                        lineHeight: 1.15,
                    }}
                >
                    Dein personalisierter Wachstums-pfad
                </div>
                <div style={{ fontSize: isMobile ? 14 : 16, color: "#6b7280", textAlign: "left", marginTop: 2, lineHeight: 1.35 }}>
                    Wähle deinen nächsten Schritt – swipe für mehr
                </div>
            </div>

            <div
                style={{
                    background: "#fff",
                    borderRadius: CARD_RADIUS,
                    boxShadow: CARD_SHADOW,
                    border: CARD_BORDER,
                    padding: isMobile ? "16px 14px 14px" : "20px 18px 16px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    width: "100%",
                }}
            >
                <style>{` .wm-growth-slider { scrollbar-width: none; } .wm-growth-slider::-webkit-scrollbar { width: 0; height: 0; }`}</style>
                <style>{`.wm-growth-slider::-webkit-scrollbar{display:none}`}</style>

                <div
                    ref={sliderRef}
                    className="wm-growth-slider"
                    onScroll={onScroll}
                    style={{
                        display: "flex",
                        overflowX: "auto",
                        scrollSnapType: "x mandatory",
                        scrollBehavior: "smooth",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 10,
                        width: "100%",
                    }}
                >
                    {items.map((it) => (
                        <div
                            key={it.id}
                            style={{
                                minWidth: "100%",
                                scrollSnapAlign: "center",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: "100%",
                                    boxSizing: "border-box",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    gap: 12,
                                    padding: isMobile ? "0 4px" : 0,
                                }}
                            >
                                <div
                                    style={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: 26,
                                        background: it.iconBg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 16px 30px rgba(0,0,0,0.08)",
                                    }}
                                >
                                    {it.kind === "book" && (
                                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 19.5z" />
                                        </svg>
                                    )}
                                    {it.kind === "course" && (
                                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M15 10.5V6a3 3 0 0 0-3-3H6" />
                                            <path d="M7 18l-2 2" />
                                            <path d="M12 16a4 4 0 0 0 4-4V8" />
                                            <rect x="10" y="14" width="8" height="8" rx="2" />
                                        </svg>
                                    )}
                                    {it.kind === "mentoring" && (
                                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 20H9a3 3 0 0 1-3-3v-2a4 4 0 0 1 4-4h7a3 3 0 0 1 3 3v6z" />
                                            <circle cx="15" cy="10" r="3" />
                                            <path d="M8 3h2" />
                                            <path d="M14 3h2" />
                                        </svg>
                                    )}
                                </div>

                                <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, color: "#111827", lineHeight: 1.08, maxWidth: "95%", wordBreak: "break-word" }}>
                                    {it.title}
                                </div>
                                <div style={{ fontSize: isMobile ? 14 : 16, color: "#6b7280", lineHeight: 1.35, maxWidth: "90%", wordBreak: "break-word" }}>
                                    {it.subtitle}
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    {it.url && !it.ctaDisabled ? (
                                        <a
                                            href={it.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "12px 18px",
                                                borderRadius: 16,
                                                background: "#eff6ff",
                                                color: "#2563eb",
                                                textDecoration: "none",
                                                fontWeight: 800,
                                                boxShadow: "0 10px 20px rgba(37,99,235,0.12)",
                                            }}
                                        >
                                            <span>Jetzt entdecken</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 3h6v6" />
                                                <path d="M10 14 21 3" />
                                                <path d="M21 14v6h-6" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "12px 18px",
                                                borderRadius: 16,
                                                background: "#f1f5f9",
                                                color: "#94a3b8",
                                                textDecoration: "none",
                                                fontWeight: 800,
                                                border: "1px solid #e5e7eb",
                                                cursor: "not-allowed",
                                            }}
                                        >
                                            <span>Jetzt entdecken</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 3h6v6" />
                                                <path d="M10 14 21 3" />
                                                <path d="M21 14v6h-6" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 4 }}>
                    {items.map((it, i) => (
                        <div
                            key={it.id}
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: 9999,
                                background: i === activeIndex ? "#2563eb" : "#d1d5db",
                                boxShadow: i === activeIndex ? "0 8px 18px rgba(37,99,235,0.25)" : "none",
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

