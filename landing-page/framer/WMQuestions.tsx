import * as React from "react"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

type RawChoice = {
    option?: string
    maps_to?: string
    id?: string
    text?: string
    wort_check?: number
    meta?: {
        dimension?: string
        richtung?: string
        experten_rang?: number
        readiness?: {
            level?: number
            bedeutung?: string
        }
    }
}

type RawScenario = {
    situation?: string
    choices?: RawChoice[]
    frage_id?: string
    typ?: string
    skill?: string
    frage?: string
    szenario?: string
    optionen?: RawChoice[]
}

type RawDimensionBlock = {
    dimension_id: string
    scenarios: RawScenario[]
}

type QuestionsPayload = {
    sjt_test?: RawDimensionBlock[]
}

type NewQuestionItem = {
    frage_id: string
    typ: string
    skill?: string
    frage?: string
    szenario?: string
    optionen: RawChoice[]
}

type FlatChoice = RawChoice & {
    choice_id: string
    dimension_id: string
    item_id: string
    option_text: string
    source_option_id: string
}

type FlatScenario = {
    dimension_id: string
    item_id: string
    question_type: string
    skill: string
    prompt: string
    choices: FlatChoice[]
    index: number
}

type Props = {
    maxWidth?: number
}

const SID_STORAGE_KEY = "wm_session_id"
const QUESTIONS_FETCH_URL = "https://hook.eu2.make.com/siik8luxcwdjc4b13u1tfaw5tw3d9v28"
const QUESTIONS_SUBMIT_URL = "https://hook.eu2.make.com/7ja5wly1xocjrlrpv8gyuyrwmd1fy44a"
const RETRY_INTERVAL_MS = 5000
const MAX_RETRIES = 60

const JSON_UTF8_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json",
}

function readResponseBodyAsUtf8(res: Response): Promise<string> {
    return res.arrayBuffer().then((buf) => new TextDecoder("utf-8", { fatal: false }).decode(buf))
}

/** Fragetext aus verschiedenen API-Feldnamen (inkl. Varianten). */
function pickQuestionTextFromRecord(rec: Record<string, unknown>): string {
    const keys = [
        "frage",
        "szenario",
        "question_text",
        "question",
        "title",
        "situation",
        "Frage",
        "Szenario",
        "frage_text",
        "questionText",
    ] as const
    for (const k of keys) {
        const v = rec[k]
        if (typeof v === "string" && v.trim()) return v.trim()
    }
    return ""
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

function parseResponseJSON(rawText: string): unknown {
    if (!rawText || !rawText.trim()) return null

    const trimmed = rawText.trim()

    // 1) Direkter JSON-Body
    const direct = tryParseJSON(trimmed)
    if (direct !== null) return direct

    // 2) Markdown-Codeblock ```json ... ```
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch?.[1]) {
        const fenced = tryParseJSON(fenceMatch[1].trim())
        if (fenced !== null) return fenced
    }

    // 3) JSON als Teil eines Textes (z.B. "result: { ... }")
    const firstCurly = trimmed.indexOf("{")
    const lastCurly = trimmed.lastIndexOf("}")
    if (firstCurly >= 0 && lastCurly > firstCurly) {
        const objectSlice = trimmed.slice(firstCurly, lastCurly + 1)
        const objectParsed = tryParseJSON(objectSlice)
        if (objectParsed !== null) return objectParsed
    }

    const firstBracket = trimmed.indexOf("[")
    const lastBracket = trimmed.lastIndexOf("]")
    if (firstBracket >= 0 && lastBracket > firstBracket) {
        const arraySlice = trimmed.slice(firstBracket, lastBracket + 1)
        const arrayParsed = tryParseJSON(arraySlice)
        if (arrayParsed !== null) return arrayParsed
    }

    return null
}

function extractQuestionsPayload(candidate: unknown): QuestionsPayload | NewQuestionItem[] | null {
    const visit = (node: unknown, depth = 0): QuestionsPayload | NewQuestionItem[] | null => {
        if (depth > 8 || node == null) return null

        if (typeof node === "string") {
            const parsed = parseResponseJSON(node)
            if (parsed !== null) return visit(parsed, depth + 1)
            return null
        }

        if (Array.isArray(node)) {
            const arr = node as Array<Record<string, unknown>>
            const looksLikeNew = arr.length > 0 && typeof arr[0]?.frage_id === "string" && Array.isArray(arr[0]?.optionen)
            if (looksLikeNew) {
                return node as NewQuestionItem[]
            }
            for (const entry of node) {
                const found = visit(entry, depth + 1)
                if (found) return found
            }
            return null
        }

        if (typeof node !== "object") return null
        const obj = node as Record<string, unknown>

        if (Array.isArray(obj.sjt_test)) {
            return obj as unknown as QuestionsPayload
        }

        for (const value of Object.values(obj)) {
            const found = visit(value, depth + 1)
            if (found) return found
        }
        return null
    }

    return visit(candidate)
}

function flattenQuestions(raw: QuestionsPayload | NewQuestionItem[]): FlatScenario[] {
    // Neues Format
    if (Array.isArray(raw)) {
        return raw.map((item, idx) => {
            const record = item as unknown as Record<string, unknown>
            const questionId = (typeof record.frage_id === "string" && record.frage_id) || `Q${idx + 1}`
            const options = Array.isArray(item.optionen) ? item.optionen : []
            const prompt = pickQuestionTextFromRecord(record)
            const questionType = (typeof record.typ === "string" && record.typ) || "sjt"

            const choices: FlatChoice[] = options.map((choice, choiceIdx) => {
                const sourceOptionId = (choice.id || String.fromCharCode(65 + choiceIdx)).trim()
                return {
                    ...choice,
                    choice_id: sourceOptionId,
                    source_option_id: sourceOptionId,
                    option_text: (choice.text || choice.option || "").trim(),
                    dimension_id: item.skill || "",
                    item_id: questionId,
                }
            })

            return {
                dimension_id: item.skill || "",
                item_id: questionId,
                question_type: questionType,
                skill: item.skill || "",
                prompt,
                choices,
                index: idx,
            }
        })
    }

    // Altes Format (sjt_test-Blöcke)
    const flat: FlatScenario[] = []
    let globalIndex = 0

    ;(raw.sjt_test || []).forEach((block, dimIdx) => {
        const dimensionId = block.dimension_id || `D${dimIdx + 1}`
        ;(block.scenarios || []).forEach((scenario, scenIdx) => {
            const itemId = `${dimensionId}_S${String(scenIdx + 1).padStart(2, "0")}`
            const oldChoices = Array.isArray(scenario.choices) ? scenario.choices : []
            const scenarioRec = scenario as unknown as Record<string, unknown>
            const situationText =
                pickQuestionTextFromRecord(scenarioRec) || (typeof scenario.situation === "string" ? scenario.situation : "")
            const choices = oldChoices.map((choice, choiceIdx) => {
                const cid = String.fromCharCode(65 + choiceIdx)
                return {
                    ...choice,
                    choice_id: cid,
                    source_option_id: cid,
                    option_text: choice.option || "",
                    dimension_id: dimensionId,
                    item_id: itemId,
                }
            })

            flat.push({
                dimension_id: dimensionId,
                item_id: itemId,
                question_type: "sjt",
                skill: dimensionId,
                prompt: situationText,
                choices,
                index: globalIndex,
            })
            globalIndex += 1
        })
    })

    return flat
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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function WMQuestions({ maxWidth = 680 }: Props) {
    const isMobile = useIsMobile()
    const [sid, setSid] = React.useState("")
    const [scenarios, setScenarios] = React.useState<FlatScenario[] | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [loadingMessage, setLoadingMessage] = React.useState("Wir bereiten deine Fragen vor ...")
    const [loadError, setLoadError] = React.useState<string | null>(null)
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const [answers, setAnswers] = React.useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [submitError, setSubmitError] = React.useState<string | null>(null)
    const [hoveredChoiceId, setHoveredChoiceId] = React.useState<string | null>(null)
    const [secondsLeft, setSecondsLeft] = React.useState(300)
    const hasSubmittedRef = React.useRef(false)
    const retryCountRef = React.useRef(0)
    const cancelledRef = React.useRef(false)
    const scenariosRef = React.useRef<FlatScenario[] | null>(null)
    const answersRef = React.useRef<Record<string, string>>({})

    scenariosRef.current = scenarios
    answersRef.current = answers

    React.useEffect(() => {
        setHoveredChoiceId(null)
    }, [currentIndex])

    React.useEffect(() => {
        if (!loading) {
            setSecondsLeft(300)
            return
        }
        const timer = window.setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => window.clearInterval(timer)
    }, [loading])

    React.useEffect(() => {
        if (typeof document === "undefined") return
        const existing = document.querySelector('meta[charset]')
        if (existing) {
            try {
                existing.setAttribute("charset", "UTF-8")
            } catch {
                /* ignore */
            }
            return
        }
        const meta = document.createElement("meta")
        meta.setAttribute("charset", "UTF-8")
        const head = document.head
        if (head.firstChild) head.insertBefore(meta, head.firstChild)
        else head.appendChild(meta)
    }, [])

    React.useEffect(() => {
        setSid(getSidFromLocation())
    }, [])

    React.useEffect(() => {
        if (!sid) {
            setLoading(false)
            setLoadError("Keine gueltige SID gefunden.")
            return
        }

        cancelledRef.current = false
        retryCountRef.current = 0

        const fetchQuestionsOnce = async (): Promise<QuestionsPayload | NewQuestionItem[] | null> => {
            try {
                const res = await fetch(QUESTIONS_FETCH_URL, {
                    method: "POST",
                    headers: JSON_UTF8_HEADERS,
                    body: JSON.stringify({ sid }),
                })

                const rawText = await readResponseBodyAsUtf8(res)
                const parsed = parseResponseJSON(rawText)

                const isValidArrayResponse = (() => {
                    if (res.status !== 200) return false
                    if (!Array.isArray(parsed) || parsed.length === 0) return false
                    const first = parsed[0] as Record<string, unknown>
                    return typeof first?.frage === "string" || typeof first?.frage_text === "string"
                })()

                if (!isValidArrayResponse) {
                    if (rawText.trim()) {
                        console.warn("WMQuestions: Ungültige Frage-Response, retry folgt", {
                            status: res.status,
                            preview: rawText.slice(0, 500),
                        })
                    }
                    return null
                }

                const extracted = extractQuestionsPayload(parsed)
                if (!extracted) return null
                return extracted
            } catch (error) {
                console.warn("WMQuestions: Fetch error, retry folgt", error)
                return null
            }
        }

        const poll = async () => {
            setLoading(true)
            setLoadError(null)

            try {
                while (!cancelledRef.current && retryCountRef.current < MAX_RETRIES) {
                    retryCountRef.current += 1
                    setLoadingMessage(`Wir bereiten deine Fragen vor ... (${retryCountRef.current}/${MAX_RETRIES})`)

                    const payload = await fetchQuestionsOnce()
                    if (payload) {
                        const flat = flattenQuestions(payload)
                        if (flat.length > 0) {
                            if (cancelledRef.current) return
                            setScenarios(flat)
                            setCurrentIndex(0)
                            setAnswers({})
                            setLoading(false)
                            return
                        }
                    }

                    if (retryCountRef.current >= MAX_RETRIES || cancelledRef.current) break
                    await sleep(RETRY_INTERVAL_MS)
                }

                if (!cancelledRef.current) {
                    setLoading(false)
                    setLoadError("Etwas hat nicht geklappt. Bitte lade die Seite neu.")
                }
            } catch (error) {
                if (cancelledRef.current) return
                console.error("WMQuestions - Polling Error:", error)
                setLoading(false)
                setLoadError("Die Fragen konnten nicht geladen werden.")
            }
        }

        poll()

        return () => {
            cancelledRef.current = true
        }
    }, [sid])

    const answeredCount = React.useMemo(() => Object.keys(answers).length, [answers])

    // Beim Abschluss (alle Fragen beantwortet) einmalig an Submit-Webhook senden – Daten aus Refs, damit alle Antworten sicher dabei sind
    React.useEffect(() => {
        if (!sid || !scenarios || scenarios.length === 0 || answeredCount < scenarios.length || hasSubmittedRef.current) return

        hasSubmittedRef.current = true
        setIsSubmitting(true)
        setSubmitError(null)

        const timer = setTimeout(() => {
            const scs = scenariosRef.current
            const ans = answersRef.current
            if (!scs || scs.length === 0) {
                setIsSubmitting(false)
                hasSubmittedRef.current = false
                return
            }

            const responses: Array<{
                session_id: string
                dimension_id: string
                item_id: string
                question_index: number
                question_type: string
                skill: string
                question_text: string
                all_choices: Array<{
                    choice_id: string
                    option: string
                    maps_to?: string
                    wort_check?: number
                    meta?: RawChoice["meta"]
                }>
                selected_choice_id: string
                selected_maps_to?: string
                selected_option: string
                selected_meta?: RawChoice["meta"]
                timestamp: string
            }> = []

            for (let i = 0; i < scs.length; i++) {
                const sc = scs[i]
                const choiceId = ans[sc.item_id]
                const selectedChoice = sc.choices.find((c) => c.choice_id === choiceId)
                const currentAnswer = {
                    session_id: sid,
                    dimension_id: sc.dimension_id,
                    item_id: sc.item_id,
                    question_index: sc.index + 1,
                    question_type: sc.question_type,
                    skill: sc.skill,
                    question_text: sc.prompt,
                    all_choices: sc.choices.map((c) => ({
                        choice_id: c.choice_id,
                        option: c.option_text || c.option || c.text || "",
                        maps_to: c.maps_to,
                        wort_check: c.wort_check,
                        meta: c.meta,
                    })),
                    selected_choice_id: choiceId ?? "",
                    selected_maps_to: selectedChoice?.maps_to ?? "",
                    selected_option: selectedChoice?.option_text || selectedChoice?.option || selectedChoice?.text || "",
                    selected_meta: selectedChoice?.meta,
                    timestamp: new Date().toISOString(),
                }

                // TODO: Debug entfernen
                console.log("selected_meta check:", {
                    frage_id: currentAnswer.item_id,
                    selected_choice_id: currentAnswer.selected_choice_id,
                    selected_meta: currentAnswer.selected_meta,
                    hat_experten_rang: currentAnswer.selected_meta?.experten_rang !== undefined,
                    hat_richtung: currentAnswer.selected_meta?.richtung !== undefined,
                    hat_readiness: currentAnswer.selected_meta?.readiness !== undefined,
                })

                if (!currentAnswer.selected_meta?.experten_rang) {
                    console.warn("WARNUNG: experten_rang fehlt in selected_meta", currentAnswer)
                }

                responses.push(currentAnswer)
            }

            if (responses.length !== scs.length) {
                console.error("WMQuestions Submit: response count mismatch", responses.length, scs.length)
                setSubmitError("Nicht alle Antworten konnten gesendet werden.")
                hasSubmittedRef.current = false
                setIsSubmitting(false)
                return
            }

            const payload = {
                session_id: sid,
                completed_at: new Date().toISOString(),
                total_questions: scs.length,
                response_count: responses.length,
                responses,
            }

            fetch(QUESTIONS_SUBMIT_URL, {
                method: "POST",
                headers: JSON_UTF8_HEADERS,
                body: JSON.stringify(payload),
            })
                .then((res) => {
                    if (!res.ok) throw new Error(`Submit failed: HTTP ${res.status}`)
                    if (typeof window !== "undefined") {
                        const url = `/dashboard?sid=${encodeURIComponent(sid)}`
                        window.location.assign(url)
                    }
                })
                .catch((err) => {
                    console.error("WMQuestions - Submit Error:", err)
                    setSubmitError("Antworten konnten nicht gesendet werden.")
                    hasSubmittedRef.current = false
                })
                .finally(() => {
                    setIsSubmitting(false)
                })
        }, 150)

        return () => clearTimeout(timer)
    }, [sid, scenarios, answers, answeredCount])


    const handleChoice = React.useCallback(
        (scenario: FlatScenario, choice: FlatChoice) => {
            setAnswers((prev) => ({ ...prev, [scenario.item_id]: choice.choice_id }))
            setCurrentIndex((prev) => {
                if (!scenarios) return prev
                return Math.min(prev + 1, scenarios.length - 1)
            })
        },
        [scenarios]
    )

    const quizActive =
        !loading &&
        !loadError &&
        Boolean(scenarios && scenarios.length > 0 && answeredCount < scenarios.length)

    const currentScenarioForShuffle =
        quizActive && scenarios ? scenarios[Math.min(currentIndex, scenarios.length - 1)] : null

    const shuffledChoices = React.useMemo(() => {
        const ch = currentScenarioForShuffle?.choices
        if (!ch?.length) return [] as FlatChoice[]
        const copy = [...ch]
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const t = copy[i] as FlatChoice
            copy[i] = copy[j] as FlatChoice
            copy[j] = t
        }
        return copy
    }, [currentScenarioForShuffle?.item_id])

    if (loading) {
        const radius = 37
        const strokeWidth = 6
        const size = 80
        const circumference = 2 * Math.PI * radius
        const offset = circumference - (secondsLeft / 300) * circumference
        const mm = Math.floor(secondsLeft / 60)
        const ss = secondsLeft % 60
        const timeText = `${mm}:${String(ss).padStart(2, "0")}`
        const isOverdue = secondsLeft === 0

        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    padding: isMobile ? "20px 14px 28px" : "28px 20px 40px",
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: isMobile ? "100%" : 520,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: isMobile ? 14 : 16,
                        padding: isMobile ? "18px 14px" : "24px 20px",
                        textAlign: "center",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ position: "relative", width: size, height: size }}>
                            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                                <defs>
                                    <linearGradient id="wm-countdown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4A90E2" />
                                        <stop offset="100%" stopColor="#50E3C2" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth={strokeWidth}
                                />
                                <circle
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke="url(#wm-countdown-gradient)"
                                    strokeWidth={strokeWidth}
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
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#4A90E2",
                                }}
                            >
                                {timeText}
                            </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
                            wird vorbereitet...
                        </div>

                        <div
                            style={{
                                marginTop: 24,
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                borderRadius: 12,
                                padding: 16,
                                maxWidth: 340,
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "center" }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: "#1e40af" }}>
                                Kein Test - ein Spiegel.
                            </div>
                            <div style={{ marginTop: 6, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                                Es gibt keine richtigen oder falschen Antworten. Das System erkennt Muster - keine Ideallösungen. Antworte so wie du wirklich tickst, nicht wie du sein möchtest.
                            </div>
                        </div>

                        {isOverdue && (
                            <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                                Dauert etwas länger - fast fertig...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (loadError) {
        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    padding: isMobile ? "20px 14px 28px" : "28px 20px 40px",
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: isMobile ? "100%" : 520,
                        background: "#fff",
                        border: "1px solid #fecaca",
                        borderRadius: isMobile ? 14 : 16,
                        padding: isMobile ? "18px 14px" : "24px 20px",
                        textAlign: "center",
                    }}
                >
                    <h2 style={{ margin: "0 0 8px", fontSize: isMobile ? 20 : 22, color: "#b91c1c" }}>Laden fehlgeschlagen</h2>
                    <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: "#7f1d1d", lineHeight: 1.5 }}>{loadError}</p>
                </div>
            </div>
        )
    }

    if (!scenarios || scenarios.length === 0) {
        return null
    }

    if (answeredCount >= scenarios.length) {
        return (
            <div
                style={{
                    width: "100%",
                    minHeight: "100%",
                    background: "transparent",
                    padding: isMobile ? "20px 14px 28px" : "28px 20px 40px",
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: isMobile ? "100%" : 520,
                        margin: "0 auto",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: isMobile ? 14 : 16,
                        padding: isMobile ? "18px 14px" : "24px 20px",
                        textAlign: "center",
                    }}
                >
                    <h2 style={{ margin: "0 0 8px", fontSize: isMobile ? 22 : 24, color: "#1f2937" }}>Danke!</h2>
                    <p style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: "#6b7280" }}>
                        {isSubmitting ? "Deine Antworten werden gesendet …" : "Du hast alle Fragen beantwortet."}
                    </p>
                    {submitError && (
                        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#b91c1c" }}>{submitError}</p>
                    )}
                </div>
            </div>
        )
    }

    const scenario = currentScenarioForShuffle!
    const progress = ((answeredCount + 1) / scenarios.length) * 100

    return (
        <div
            style={{
                width: "100%",
                maxWidth,
                margin: "0 auto",
                minHeight: "100%",
                background: "transparent",
                padding: isMobile ? "16px 12px 96px" : "24px 20px 40px",
                boxSizing: "border-box",
            }}
        >
            <div style={{ fontSize: isMobile ? 10 : 11, color: "#2563eb", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
                SCHRITT 3 VON 3
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: isMobile ? 22 : 26, lineHeight: 1.2, color: "#1f2937" }}>Realitätscheck-Quiz</h1>
            <p style={{ margin: "0 0 14px", fontSize: isMobile ? 13 : 14, color: "#6b7280" }}>
                Frage {scenario.index + 1} von {scenarios.length}
            </p>

            <div style={{ width: "100%", height: isMobile ? 5 : 6, borderRadius: 9999, background: "#e5e7eb", overflow: "hidden", marginBottom: isMobile ? 14 : 18 }}>
                <div
                    style={{
                        width: `${Math.min(progress, 100)}%`,
                        height: "100%",
                        borderRadius: 9999,
                        background: "linear-gradient(90deg, #22d3ee, #10b981)",
                    }}
                />
            </div>

            <div
                style={{
                    background: "#f8fafc",
                    borderRadius: isMobile ? 12 : 14,
                    padding: isMobile ? "4px 4px 4px 0" : "6px 8px 6px 0",
                    marginBottom: 24,
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#6b7280",
                        marginBottom: 8,
                    }}
                >
                    {scenario.question_type === "sjt" ? "DEINE SITUATION" : "FRAGE"}
                </div>
                {scenario.prompt ? (
                    <p
                        style={{
                            margin: 0,
                            fontSize: isMobile ? 18 : 20,
                            fontWeight: 700,
                            lineHeight: 1.45,
                            color: "#111827",
                            whiteSpace: "pre-line",
                            overflowWrap: "anywhere",
                        }}
                    >
                        {scenario.prompt}
                    </p>
                ) : (
                    <p style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, lineHeight: 1.45, color: "#b45309" }}>
                        Fragetext konnte nicht geladen werden (bitte JSON-Feld &quot;frage&quot; / &quot;szenario&quot; prüfen).
                    </p>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {shuffledChoices.map((choice) => {
                    const isSelected = answers[scenario.item_id] === choice.choice_id
                    const isHovered = hoveredChoiceId === choice.choice_id
                    const accentLeft = isHovered || isSelected
                    const edgeColor = isSelected ? "#2563eb" : "#e5e7eb"
                    const leftBarColor = accentLeft ? "#2563eb" : "#e5e7eb"
                    return (
                        <button
                            key={choice.choice_id}
                            type="button"
                            onClick={() => handleChoice(scenario, choice)}
                            onMouseEnter={() => setHoveredChoiceId(choice.choice_id)}
                            onMouseLeave={() => setHoveredChoiceId((id) => (id === choice.choice_id ? null : id))}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: 16,
                                borderRadius: isMobile ? 10 : 12,
                                borderTop: `1px solid ${edgeColor}`,
                                borderRight: `1px solid ${edgeColor}`,
                                borderBottom: `1px solid ${edgeColor}`,
                                borderLeft: `4px solid ${leftBarColor}`,
                                background: isSelected ? "#eff6ff" : "#fff",
                                color: "#374151",
                                fontSize: isMobile ? 15 : 16,
                                fontWeight: 400,
                                lineHeight: 1.45,
                                cursor: "pointer",
                                overflowWrap: "anywhere",
                                transition: "border-color 0.15s ease, background-color 0.15s ease",
                                boxSizing: "border-box",
                            }}
                        >
                            {choice.option_text || choice.option || choice.text}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
