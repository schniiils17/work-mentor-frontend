// WMLandingHero.tsx – Work Mentor Landing (Hero + Feature-Karussell)
// v3: Verschlankter Einstieg — nur Zieljob, direkt zum Assessment.
// In Framer: Code Component einfügen, diesen Code einfügen.

import * as React from "react"
import { motion, useReducedMotion, useMotionValue, animate } from "framer-motion"

type Props = {
    maxWidth?: number
}

// ─── Icons ─────────────────────────────────────────────────────

const IconTarget = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
)
const IconBarChart = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
)
const IconBulb = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" /><path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
)
const IconArrow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
)

// ─── Config ────────────────────────────────────────────────────

const SID_STORAGE_KEY = "wm_session_id"
const SLIDE_COUNT = 3

const FEATURES = [
    { id: "diagnostik", icon: IconTarget, iconColor: "#2563eb", title: "Nur für deinen Zieljob", description: "Keine Standard-Fragen. Dein Assessment wird speziell für deinen Zieljob erstellt." },
    { id: "gap", icon: IconBarChart, iconColor: "#059669", title: "Wie nah bist du dran?", description: "Du siehst wo du stehst — und was der wichtigste nächste Schritt ist." },
    { id: "plan", icon: IconBulb, iconColor: "#ea580c", title: "Genau die eine Empfehlung", description: "Kein Kurs-Dschungel. Du bekommst die eine Ressource die deinen größten Hebel adressiert." },
]

const INFO_CARDS = [
    { value: "16 Fragen", label: "Persönlichkeit & Verhalten" },
    { value: "< 8 Min", label: "Deine Analyse" },
]

// ─── Hooks ─────────────────────────────────────────────────────

function useIsNarrow(breakpoint = 480) {
    const [isNarrow, setIsNarrow] = React.useState(
        typeof window !== "undefined" ? window.innerWidth < breakpoint : false
    )
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const w = () => setIsNarrow(window.innerWidth < breakpoint)
        window.addEventListener("resize", w)
        return () => window.removeEventListener("resize", w)
    }, [breakpoint])
    return isNarrow
}

// ─── Component ─────────────────────────────────────────────────

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function WMLandingHero({ maxWidth = 720 }: Props) {
    const [targetRole, setTargetRole] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [slideIndex, setSlideIndex] = React.useState(0)
    const reduceMotion = useReducedMotion()
    const isNarrow = useIsNarrow(480)
    const carouselRef = React.useRef<HTMLDivElement>(null)
    const [viewportWidth, setViewportWidth] = React.useState(0)
    const x = useMotionValue(0)
    const isDraggingRef = React.useRef(false)

    // ─── Carousel logic ────────────────────────────────────────

    React.useEffect(() => {
        const el = carouselRef.current
        if (!el) return
        const update = () => setViewportWidth(el.offsetWidth)
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    React.useEffect(() => {
        if (viewportWidth <= 0 || isDraggingRef.current) return
        const targetX = -slideIndex * viewportWidth
        const stop = animate(x, targetX, {
            duration: reduceMotion ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
        })
        return () => stop.stop()
    }, [slideIndex, viewportWidth, reduceMotion, x])

    const handleDragEnd = React.useCallback(
        (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
            isDraggingRef.current = false
            if (viewportWidth <= 0) return
            const threshold = viewportWidth * 0.15
            const v = info.velocity.x
            const o = info.offset.x
            let next = slideIndex
            if (o < -threshold || v < -200) next = Math.min(SLIDE_COUNT - 1, slideIndex + 1)
            else if (o > threshold || v > 200) next = Math.max(0, slideIndex - 1)
            setSlideIndex(next)
        },
        [slideIndex, viewportWidth]
    )

    // ─── Submit: Zieljob → direkt zum Assessment ───────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedRole = targetRole.trim()
        if (!trimmedRole) return

        setIsLoading(true)

        // Neue SID erstellen
        const sid = `wm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

        if (typeof window !== "undefined") {
            sessionStorage.setItem(SID_STORAGE_KEY, sid)
            sessionStorage.setItem("targetPosition", trimmedRole)
            // Leere Werte für Felder die wir nicht mehr abfragen
            sessionStorage.setItem("currentTitle", "")
            sessionStorage.setItem("industry", "")
        }

        // Kurze Verzögerung für UX-Feedback
        await new Promise(r => setTimeout(r, 600))

        // Direkt zum Assessment navigieren
        if (typeof window !== "undefined") {
            const assessmentUrl = `/assessment?sid=${encodeURIComponent(sid)}`
            window.location.assign(assessmentUrl)
        }
    }

    // ─── Styles ────────────────────────────────────────────────

    const outerStyle: React.CSSProperties = {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isNarrow ? "32px 16px 40px" : "48px 24px 56px",
        boxSizing: "border-box",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }

    const innerStyle: React.CSSProperties = {
        width: "100%",
        maxWidth,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    }

    const inputStyle: React.CSSProperties = {
        width: "100%",
        height: 56,
        border: "2px solid #e5e7eb",
        borderRadius: 14,
        padding: "0 18px",
        fontSize: 16,
        color: "#1f2937",
        background: "#fff",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    }

    const buttonStyle: React.CSSProperties = {
        width: "100%",
        height: 56,
        border: "none",
        borderRadius: 14,
        background: "linear-gradient(135deg, #22d3ee, #10b981)",
        color: "#fff",
        fontSize: 16,
        fontWeight: 700,
        cursor: isLoading ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: !targetRole.trim() ? 0.5 : 1,
        transition: "opacity 0.2s, transform 0.1s",
    }

    // ─── Render ────────────────────────────────────────────────

    return (
        <div style={outerStyle}>
            <div style={innerStyle}>
                {/* Hero */}
                <motion.section
                    initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: "100%", textAlign: "center", marginBottom: 32 }}
                >
                    <h1 style={{
                        fontSize: isNarrow ? 28 : 36,
                        fontWeight: 800,
                        lineHeight: 1.15,
                        color: "#1f2937",
                        margin: "0 0 12px",
                    }}>
                        Bist du bereit für deinen{" "}
                        <span style={{
                            background: "linear-gradient(90deg, #22d3ee, #10b981)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                        }}>
                            nächsten Karriereschritt?
                        </span>
                    </h1>
                    <p style={{
                        fontSize: isNarrow ? 15 : 17,
                        color: "#6b7280",
                        lineHeight: 1.6,
                        margin: "0 auto",
                        maxWidth: 520,
                    }}>
                        Finde in unter 8 Minuten heraus wo du stehst — und was dein wichtigster nächster Schritt ist.
                    </p>
                </motion.section>

                {/* Form: Nur Zieljob */}
                <motion.section
                    initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    style={{
                        width: "100%",
                        maxWidth: 480,
                        background: "#fff",
                        borderRadius: 20,
                        border: "1px solid #e5e7eb",
                        padding: isNarrow ? "24px 18px" : "32px 28px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                        marginBottom: 32,
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <label style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                            Welchen Job willst du als nächstes?
                        </label>
                        <input
                            type="text"
                            placeholder="z.B. Vertriebsleiter, Projektmanager, Teamleiter..."
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "#22d3ee" }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb" }}
                            autoFocus
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!targetRole.trim() || isLoading}
                            style={buttonStyle}
                        >
                            {isLoading ? (
                                <motion.svg
                                    width="20" height="20" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </motion.svg>
                            ) : (
                                <>Los geht's <IconArrow /></>
                            )}
                        </button>
                    </form>
                </motion.section>

                {/* Feature Carousel */}
                <motion.section
                    initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    style={{ width: "100%", maxWidth: 480, overflow: "hidden" }}
                >
                    <div
                        ref={carouselRef}
                        style={{ width: "100%", overflow: "hidden", touchAction: "pan-y" }}
                    >
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: -(SLIDE_COUNT - 1) * viewportWidth, right: 0 }}
                            dragElastic={0.12}
                            onDragStart={() => { isDraggingRef.current = true }}
                            onDragEnd={handleDragEnd}
                            style={{ display: "flex", x, width: viewportWidth * SLIDE_COUNT || "300%" }}
                        >
                            {FEATURES.map((feature) => (
                                <div
                                    key={feature.id}
                                    style={{
                                        width: viewportWidth || "33.33%",
                                        flexShrink: 0,
                                        padding: "0 8px",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <div style={{
                                        background: "#fff",
                                        borderRadius: 16,
                                        border: "1px solid #e5e7eb",
                                        padding: isNarrow ? "20px 16px" : "24px 20px",
                                        textAlign: "center",
                                    }}>
                                        <div style={{
                                            width: 64, height: 64, borderRadius: "50%",
                                            background: `${feature.iconColor}12`,
                                            color: feature.iconColor,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            margin: "0 auto 14px",
                                        }}>
                                            <feature.icon />
                                        </div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                                            {feature.title}
                                        </h3>
                                        <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Dots */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                        {FEATURES.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSlideIndex(i)}
                                aria-label={`Slide ${i + 1}`}
                                style={{
                                    width: slideIndex === i ? 24 : 8,
                                    height: 8,
                                    padding: 0,
                                    border: "none",
                                    borderRadius: 9999,
                                    background: slideIndex === i ? "#2563eb" : "#e5e7eb",
                                    cursor: "pointer",
                                    transition: "width 0.2s, background 0.2s",
                                }}
                            />
                        ))}
                    </div>

                    {/* Info Cards */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                        width: "100%",
                        marginTop: 16,
                    }}>
                        {INFO_CARDS.map((card) => (
                            <div key={card.label} style={{
                                padding: 14,
                                background: "#f9fafb",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                textAlign: "center",
                            }}>
                                <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>
                                    {card.value}
                                </span>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>{card.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.section>
            </div>
        </div>
    )
}
