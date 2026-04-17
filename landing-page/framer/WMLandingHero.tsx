// WMLandingHero.tsx – Work Mentor Landing (Hero + Feature-Karussell)
// In Framer: Code Component einfügen, diesen Code einfügen.

import * as React from "react"
import { motion, useReducedMotion, useMotionValue, animate, AnimatePresence } from "framer-motion"

type Props = {
    maxWidth?: number
}

// Icons als Inline-SVG
const IconTarget = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
)
const IconBarChart = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
)
const IconBulb = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
)
const IconArrow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
)
const IconCheck = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)
const IconEdit = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)
const IconChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
)
const IconSpinner = () => (
    <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </motion.svg>
)

const FEATURES = [
    { id: "diagnostik", icon: IconTarget, iconColor: "#2563eb", title: "Nur für deinen Zieljob", description: "Keine Standard-Fragen. Wir generieren ein Assessment das speziell für deinen Zieljob und deine Situation erstellt wird." },
    { id: "gap", icon: IconBarChart, iconColor: "#059669", title: "Wie nah bist du schon dran?", description: "Du siehst schwarz auf weiß wo du heute stehst – und wie weit der nächste Schritt wirklich ist." },
    { id: "plan", icon: IconBulb, iconColor: "#ea580c", title: "Genau die eine Ressource", description: "Kein Kurs-Dschungel. Du bekommst genau die eine Empfehlung die deinen größten Hebel direkt adressiert – vom Buch bis zum Online-Kurs." },
]

type InfoCard =
    | { value: string; label: string }
    | { value: string; label: string; gradient: true }

const INFO_CARDS: InfoCard[] = [
    { value: "10 Fragen", label: "Realistische Szenarien" },
    { value: "< 10 Min", label: "Deine Analyse" },
]

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

const SLIDE_COUNT = 3
const SID_STORAGE_KEY = "wm_session_id"
const EXPECTED_ANALYSIS_LOADING_MS = 5 * 60 * 1000

type RawQuestionChoice = {
    option: string
    maps_to: string
}

type RawQuestionScenario = {
    situation: string
    choices: RawQuestionChoice[]
}

type RawQuestionDimensionBlock = {
    dimension_id: string
    scenarios: RawQuestionScenario[]
}

type QuestionsPayload = {
    sjt_test: RawQuestionDimensionBlock[]
}

type QuestionChoice = RawQuestionChoice & {
    choice_id: string
    dimension_id: string
    item_id: string
    index: number
}

type QuestionScenario = {
    dimension_id: string
    item_id: string
    situation: string
    choices: QuestionChoice[]
    index: number
}

function flattenQuestions(raw: QuestionsPayload): QuestionScenario[] {
    const flat: QuestionScenario[] = []
    let globalIndex = 0

    raw.sjt_test.forEach((block, dimIdx) => {
        const dimensionId = block.dimension_id || `D${dimIdx + 1}`

        block.scenarios.forEach((scenario, scenIdx) => {
            const itemId = `${dimensionId}_S${String(scenIdx + 1).padStart(2, "0")}`
            const choices = scenario.choices.map((choice, choiceIdx) => ({
                ...choice,
                choice_id: String.fromCharCode(65 + choiceIdx),
                dimension_id: dimensionId,
                item_id: itemId,
                index: choiceIdx,
            }))

            flat.push({
                dimension_id: dimensionId,
                item_id: itemId,
                situation: scenario.situation,
                choices,
                index: globalIndex,
            })
            globalIndex += 1
        })
    })

    return flat
}

function parseResponseJSON(rawText: string): unknown {
    if (!rawText || !rawText.trim()) return null
    try {
        return JSON.parse(rawText)
    } catch {
        return null
    }
}

function extractQuestionsPayload(candidate: unknown): QuestionsPayload | null {
    const visit = (node: unknown, depth = 0): QuestionsPayload | null => {
        if (depth > 8 || node == null) return null

        if (typeof node === "string") {
            const parsed = parseResponseJSON(node)
            if (parsed !== null) return visit(parsed, depth + 1)
            return null
        }

        if (Array.isArray(node)) {
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

        if (typeof obj.sjt_test === "string") {
            const parsed = parseResponseJSON(obj.sjt_test)
            if (parsed !== null) {
                const found = visit(parsed, depth + 1)
                if (found) return found
            }
        }

        for (const value of Object.values(obj)) {
            const found = visit(value, depth + 1)
            if (found) return found
        }
        return null
    }

    return visit(candidate)
}

// Branchen-Liste (erweitert, dedupliziert)
const INDUSTRIES = Array.from(new Set([
    "Automobil", "Banking", "Beratung", "Bildung", "Biotechnologie", "Chemie", "Dienstleistungen",
    "E-Commerce", "Elektronik", "Energie", "Ernährung & Getränke", "Finanzdienstleistungen", "Forschung & Entwicklung",
    "Gesundheitswesen", "Handel", "Immobilien", "Informationstechnologie", "Konsumgüter", "Kultur & Medien",
    "Landwirtschaft", "Lebensmittel", "Logistik", "Luftfahrt", "Maschinenbau", "Medizin", "Mode & Textilien",
    "Pharmazie", "Recht", "Retail", "Schifffahrt", "Sport & Freizeit", "Telekommunikation", "Tourismus",
    "Transport", "Umwelt & Nachhaltigkeit", "Versicherungen", "Werbeagentur", "Werbung & Marketing",
    "Aerospace", "Agrarwirtschaft", "Architektur", "Bauwesen", "Beauty & Kosmetik", "Bergbau", "Buchhaltung",
    "Chemie & Pharma", "Design", "E-Learning", "Elektrotechnik", "Event-Management", "Fahrzeugbau",
    "Fertigung", "Film & Fernsehen", "Fitness & Wellness", "Gaming", "Gastronomie", "Gemeinnützig",
    "Glas & Keramik", "Grafikdesign", "Großhandel", "Handwerk", "Hotellerie", "Human Resources",
    "Ingenieurwesen", "Investment", "Juwelier", "Kunst & Kultur", "Lebensmittelindustrie", "Luxusgüter",
    "Management", "Marketing", "Medizintechnik", "Möbel", "Musik", "Nachrichten & Medien", "Non-Profit",
    "Öffentlicher Sektor", "Öl & Gas", "Papier & Verpackung", "Personalwesen", "Pflege", "Produktion",
    "Public Relations", "Publishing", "Qualitätssicherung", "Rechnungswesen", "Recycling", "Rekrutierung",
    "Rohstoffe", "SaaS", "Sicherheit", "Software", "Spieleentwicklung", "Sport", "Steuerberatung",
    "Strategie", "Supply Chain", "Technologie", "Telekom", "Textilindustrie", "Transport & Logistik",
    "Unternehmensberatung", "Venture Capital", "Verbraucherdienstleistungen", "Vermögensverwaltung",
    "Verpackung", "Versand", "Vertrieb", "Wasserwirtschaft", "Werbung", "Werkstoffe", "Wirtschaftsprüfung",
    "Wissenschaft", "Zertifizierung", "Zulieferer", "Zweckverband", "Öffentliche Verwaltung", "Bildungsmanagement",
    "Coaching", "Content Creation", "Data Science", "Digital Marketing", "E-Health", "EdTech", "Energy Tech",
    "FinTech", "Food Tech", "Green Tech", "HealthTech", "HR Tech", "InsurTech", "Legal Tech", "MarTech",
    "MedTech", "PropTech", "Retail Tech", "Sales Tech", "Sports Tech", "Travel Tech", "AgTech", "CleanTech",
    "Cyber Security", "IoT", "Robotics", "AI & Machine Learning", "Blockchain", "Cloud Computing", "SaaS B2B",
    "SaaS B2C", "Marketplace", "Platform", "Hardware", "Semiconductor", "Telecommunications Equipment",
    "Network Equipment", "Consumer Electronics", "Industrial Equipment", "Medical Devices", "Automotive Parts",
    // Erweiterungen für bessere Wiedererkennung
    "Bau & Immobilienentwicklung", "Bauzulieferer", "Facility Management", "Gebäudetechnik", "Energiewirtschaft",
    "Erneuerbare Energien", "Solar", "Windkraft", "Wasserstoff", "Kreislaufwirtschaft", "Entsorgung", "Abfallwirtschaft",
    "ÖPNV", "Schienenverkehr", "Bahn", "Luft- und Raumfahrt", "Raumfahrt", "Seefracht", "Kurier-, Express- und Paketdienste",
    "Spedition", "Lagerlogistik", "Zoll & Außenhandel", "Import/Export", "Einzelhandel", "Groß- und Außenhandel",
    "Dropshipping", "Marktplatzhandel", "Apotheken", "Krankenhaus", "Telemedizin", "Pflegeeinrichtungen",
    "Diagnostik", "Labor", "Medienproduktion", "Social Media", "Influencer Marketing", "Performance Marketing",
    "SEO/SEA", "Kommunikation", "Branding", "Marktforschung", "Markenartikel", "FMCG", "Haushaltswaren",
    "Möbelindustrie", "Textil & Bekleidung", "Schmuck", "Uhren", "Kosmetikindustrie", "Haushaltsgeräte",
    "Bäckerei", "Nahrungsmittelproduktion", "Getränkeindustrie", "Agrartechnik", "Forstwirtschaft", "Fischerei",
    "Saatgut", "Düngemittel", "Tiergesundheit", "Veterinärwesen", "Banken", "Versicherungswirtschaft", "Rückversicherung",
    "Leasing", "Factoring", "Private Equity", "Asset Management", "Corporate Finance", "Steuerkanzlei",
    "Wirtschaftsrecht", "Compliance", "Revision", "Interne Revision", "Öffentliche Sicherheit", "Verteidigung",
    "Behörden", "Ministerien", "Kommunalverwaltung", "Sozialwesen", "Wohlfahrt", "Stiftungen", "Kirchliche Träger",
    "Personalvermittlung", "Zeitarbeit", "Organisationsentwicklung", "Lernplattformen", "Weiterbildung",
    "Universität", "Schule", "Kindertagesstätten", "Forschungseinrichtungen", "Industrie 4.0", "Automatisierung",
    "Anlagenbau", "Werkzeugbau", "Metallverarbeitung", "Kunststoffverarbeitung", "Halbleiterindustrie", "Mikroelektronik",
    "Messtechnik", "Prüftechnik", "Qualitätsmanagement", "Informationssicherheit", "IT-Services", "Systemintegration",
    "Managed Services", "Cloud Services", "Hosting", "Rechenzentrum", "Open Source", "Berufsverbände",
    "Verbände & Kammern", "Touristik", "Freizeitparks", "Eventtechnik", "Messebau", "Kongresswesen", "Filmproduktion",
    "Musikindustrie", "Verlagswesen", "Druckerei", "Papierindustrie", "Verpackungsindustrie", "Rohstoffhandel",
    "Edelmetalle", "Chemieindustrie", "Pharmaindustrie", "Medizinische Forschung", "Klinische Studien", "Intralogistik",
    "Produktfotografie", "UX/UI Design", "Produktmanagement", "Business Development", "Customer Success",
    "Technischer Vertrieb", "B2B SaaS", "B2C SaaS", "Inspektionsdienste", "Sicherheitsdienste"
]))

export default function WMLandingHero({ maxWidth = 720 }: Props) {
    const [step, setStep] = React.useState(1)
    const [targetRole, setTargetRole] = React.useState("")
    const [isLoadingStep, setIsLoadingStep] = React.useState(false)
    const [slideIndex, setSlideIndex] = React.useState(0)
    const reduceMotion = useReducedMotion()
    const isNarrow = useIsNarrow(480)
    const carouselRef = React.useRef<HTMLDivElement>(null)
    const [viewportWidth, setViewportWidth] = React.useState(0)
    const x = useMotionValue(0)
    const isDraggingRef = React.useRef(false)
    
    // Step 2 Form State
    const [currentTitle, setCurrentTitle] = React.useState("")
    const [industry, setIndustry] = React.useState("")
    const [role, setRole] = React.useState("")
    const [experienceLevel, setExperienceLevel] = React.useState("")
    const [companySize, setCompanySize] = React.useState("")
    const [availableRoles, setAvailableRoles] = React.useState<string[]>([])
    const [isLoadingRoles, setIsLoadingRoles] = React.useState(false)
    const [isAnalyzing, setIsAnalyzing] = React.useState(false)
    const [analysisProgress, setAnalysisProgress] = React.useState(0)
    const hasTriggeredRoleFieldsWebhook = React.useRef(false)
    const [generatedQuestions, setGeneratedQuestions] = React.useState<QuestionScenario[] | null>(null)
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
    const [questionAnswers, setQuestionAnswers] = React.useState<Record<string, string>>({})
    const [questionLoadError, setQuestionLoadError] = React.useState<string | null>(null)
    
    // Zielposition Fragen State
    const [isSameIndustry, setIsSameIndustry] = React.useState<boolean | null>(null)
    const [isSameRole, setIsSameRole] = React.useState<boolean | null>(null)
    const [targetIndustry, setTargetIndustry] = React.useState("")
    const [targetRoleField, setTargetRoleField] = React.useState("")
    const [isTargetSectionExpanded, setIsTargetSectionExpanded] = React.useState(false)
    
    // Branche Searchable Dropdown State
    const [industrySearchQuery, setIndustrySearchQuery] = React.useState("")
    const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = React.useState(false)
    const industryDropdownRef = React.useRef<HTMLDivElement>(null)
    
    // Ziel-Branche Dropdown State
    const [targetIndustrySearchQuery, setTargetIndustrySearchQuery] = React.useState("")
    const [isTargetIndustryDropdownOpen, setIsTargetIndustryDropdownOpen] = React.useState(false)
    
    // Filtered industries based on search
    const filteredIndustries = React.useMemo(() => {
        if (!industrySearchQuery.trim()) return INDUSTRIES.slice(0, 10) // Show first 10 when empty
        const query = industrySearchQuery.toLowerCase()
        return INDUSTRIES.filter(ind => ind.toLowerCase().includes(query)).slice(0, 10)
    }, [industrySearchQuery])
    
    // Filtered target industries based on search
    const filteredTargetIndustries = React.useMemo(() => {
        if (!targetIndustrySearchQuery.trim()) return INDUSTRIES.slice(0, 10) // Show first 10 when empty
        const query = targetIndustrySearchQuery.toLowerCase()
        return INDUSTRIES.filter(ind => ind.toLowerCase().includes(query)).slice(0, 10)
    }, [targetIndustrySearchQuery])
    
    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (industryDropdownRef.current && !industryDropdownRef.current.contains(event.target as Node)) {
                setIsIndustryDropdownOpen(false)
            }
        }
        if (isIndustryDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isIndustryDropdownOpen])

    const createNewSID = React.useCallback(() => {
        if (typeof window === "undefined") return null
        const sid = `wm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        sessionStorage.setItem(SID_STORAGE_KEY, sid)
        return sid
    }, [])

    const getOrCreateSID = React.useCallback(() => {
        if (typeof window === "undefined") return null
        let sid = sessionStorage.getItem(SID_STORAGE_KEY)
        if (!sid) {
            // Erstelle einmalige SID: timestamp + random string
            sid = `wm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
            sessionStorage.setItem(SID_STORAGE_KEY, sid)
        }
        return sid
    }, [])

    React.useEffect(() => {
        const el = carouselRef.current
        if (!el) return
        const update = () => setViewportWidth(el.offsetWidth)
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Automatischer Webhook-Trigger wenn currentTitle und industry ausgefüllt sind
    React.useEffect(() => {
        // Nur bei Step 2 und wenn noch nicht getriggert
        if (step !== 2 || hasTriggeredRoleFieldsWebhook.current) return
        
        const trimmedTitle = currentTitle.trim()
        const trimmedIndustry = industry.trim()
        
        // Beide Felder müssen ausgefüllt sein
        if (!trimmedTitle || !trimmedIndustry) return

        // Webhook nur einmal triggern
        hasTriggeredRoleFieldsWebhook.current = true

        // SID abrufen
        const sid = getOrCreateSID()
        if (!sid) {
            console.error("Konnte keine SID erstellen für Role Fields Webhook")
            return
        }

        // Webhook senden und Response abwarten
        setIsLoadingRoles(true)
        fetch("https://hook.eu2.make.com/eon1b8mjxpdp8qp9iy3r1qinfuhar8m7", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sid: sid,
                aktuelleBerufsbezeichnung: trimmedTitle,
                branche: trimmedIndustry,
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Webhook failed: ${response.status}`)
                }
                return response.json()
            })
            .then((data) => {
                // role_fields aus der Response extrahieren
                // Make sendet: { "role_fields": [...] } oder { "role_fields": "12. Result" }
                let roles: string[] = []
                
                if (data.role_fields) {
                    // Falls es ein Array ist
                    if (Array.isArray(data.role_fields)) {
                        roles = data.role_fields
                    }
                    // Falls es ein String ist (z.B. "12. Result" - dann sollte es eigentlich schon geparst sein)
                    else if (typeof data.role_fields === "string") {
                        try {
                            // Versuche JSON zu parsen falls es ein JSON-String ist
                            const parsed = JSON.parse(data.role_fields)
                            roles = Array.isArray(parsed) ? parsed : [data.role_fields]
                        } catch {
                            // Falls kein JSON, als einzelnes Item behandeln
                            roles = [data.role_fields]
                        }
                    }
                }
                
                // Rollen im State speichern
                setAvailableRoles(roles)
                setIsLoadingRoles(false)
            })
            .catch((error) => {
                console.error("Fehler beim Senden Role Fields Webhook:", error)
                setIsLoadingRoles(false)
                // Reset flag bei Fehler, damit Retry möglich ist
                hasTriggeredRoleFieldsWebhook.current = false
            })
    }, [step, currentTitle, industry, getOrCreateSID])

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

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Nur ausführen, wenn ein Job eingegeben wurde
        const trimmedRole = targetRole.trim()
        if (!trimmedRole) {
            return
        }

        // Save to sessionStorage
        if (typeof window !== "undefined") {
            sessionStorage.setItem("targetPosition", trimmedRole)
        }
        setGeneratedQuestions(null)
        setCurrentQuestionIndex(0)
        setQuestionAnswers({})
        setQuestionLoadError(null)

        // State update #1: Loading state
        setIsLoadingStep(true)

        // Bei jedem neuen Durchlauf bewusst eine frische SID erzeugen.
        const sid = createNewSID()
        if (sid) {
            try {
                await fetch("https://hook.eu2.make.com/brnlyom9isi8byszetqzv90ru4fo4xs7", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sid: sid,
                        wunschposition: trimmedRole,
                    }),
                })
            } catch (error) {
                console.error("Fehler beim Senden an Webhook:", error)
            }
        }

        // Delayed state update #2: Trigger Animation Chain
        setTimeout(() => {
            setIsLoadingStep(false)
            setStep(2)
        }, 1000)
    }

    const handleEditTargetPosition = () => {
        setStep(1)
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("targetPosition")
            if (saved) setTargetRole(saved)
        }
    }

    const targetPosition = React.useMemo(() => {
        if (typeof window === "undefined") return ""
        return sessionStorage.getItem("targetPosition") || targetRole.trim() || ""
    }, [targetRole, step])

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setQuestionLoadError(null)
        
        // Prüfen ob alle Pflichtfelder ausgefüllt sind
        if (!role || !experienceLevel || !companySize) {
            return
        }

        // SID abrufen
        const sid = getOrCreateSID()
        if (!sid) {
            console.error("Konnte keine SID erstellen für Step 2 Submit")
            return
        }

        // Loading-Overlay anzeigen - State sofort setzen
        setIsAnalyzing(true)
        setAnalysisProgress(0)
        const analysisStartedAt = Date.now()

        // Progress langsam aufbauen und bei 95% deckeln, bis die Fragen wirklich bereit sind.
        setTimeout(() => {
            const progressInterval = setInterval(() => {
                const elapsed = Date.now() - analysisStartedAt
                const progressByTime = Math.min(95, Math.floor((elapsed / EXPECTED_ANALYSIS_LOADING_MS) * 95))
                setAnalysisProgress((prev) => Math.max(prev, progressByTime))
            }, 250)
            
            // Cleanup-Funktion für Interval speichern
            ;(window as any).__wmProgressInterval = progressInterval
        }, 0)

        // Bestimme Ziel-Branche und Ziel-Rolle basierend auf Antworten
        // Wenn "Ja": verwende die aktuelle Branche/Rolle, wenn "Nein": verwende die ausgewählte Ziel-Branche/Rolle
        const finalTargetIndustry = isSameIndustry === true ? industry : targetIndustry
        const finalTargetRole = isSameRole === true ? role : targetRoleField
        
        // Payload für beide Webhooks
        const webhookPayload = {
            sid: sid,
            rolle: role,
            erfahrungslevel: experienceLevel,
            unternehmensgroesse: companySize,
            zielBranche: finalTargetIndustry,
            zielRolle: finalTargetRole,
            istGleicheBranche: isSameIndustry === true,
            istGleicheRolle: isSameRole === true,
        }

        const triggerStep2Webhooks = async (): Promise<void> => {
            const [response1, response2] = await Promise.all([
                fetch("https://hook.eu2.make.com/pfjzqtj197394h4l74hr8itp2gimhr7d", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(webhookPayload),
                }),
                fetch("https://hook.eu2.make.com/znydzl62pbdupbrihrl1lylw83qpgoxd", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(webhookPayload),
                }),
            ])

            if (!response1.ok || !response2.ok) {
                throw new Error(`Webhook failed: ${response1.status} / ${response2.status}`)
            }
        }
        
        // Beide Webhooks an Make senden
        try {
            await triggerStep2Webhooks()

            // Nach erfolgreichem Trigger auf Questions-Seite wechseln und SID übergeben.
            setTimeout(() => {
                if ((window as any).__wmProgressInterval) {
                    clearInterval((window as any).__wmProgressInterval)
                    delete (window as any).__wmProgressInterval
                }
                setAnalysisProgress(100)

                if (typeof window !== "undefined") {
                    // Store data for Agent v2 chat component
                    sessionStorage.setItem("currentTitle", currentTitle)
                    sessionStorage.setItem("industry", industry)

                    window.dispatchEvent(
                        new CustomEvent("wm-analysis-started", {
                            detail: { role, experienceLevel, companySize, sid },
                        })
                    )
                    // Navigate to Agent v2 assessment chat
                    const assessmentUrl = `/assessment?sid=${encodeURIComponent(sid)}`
                    window.location.assign(assessmentUrl)
                }
            }, 250)
        } catch (error) {
            console.error("Fehler beim Senden Step 2 Webhook:", error)
            if ((window as any).__wmProgressInterval) {
                clearInterval((window as any).__wmProgressInterval)
                delete (window as any).__wmProgressInterval
            }
            setIsAnalyzing(false)
            setAnalysisProgress(0)
            setQuestionLoadError("Die Fragen konnten nicht geladen werden. Bitte versuche es erneut.")
        }
    }

    const handleQuestionChoice = React.useCallback((scenario: QuestionScenario, choice: QuestionChoice) => {
        setQuestionAnswers((prev) => ({ ...prev, [scenario.item_id]: choice.choice_id }))
        setCurrentQuestionIndex((prev) => {
            if (!generatedQuestions) return prev
            return Math.min(prev + 1, generatedQuestions.length - 1)
        })
    }, [generatedQuestions])

    // Prüfen ob alle Pflichtfelder ausgefüllt sind
    const isFormComplete = React.useMemo(() => {
        const baseFieldsComplete = !!(role && experienceLevel && companySize)
        const industryQuestionComplete = isSameIndustry !== null
        const roleQuestionComplete = isSameRole !== null
        
        // Wenn Branche gleich: automatisch übernommen, sonst muss Ziel-Branche ausgewählt sein
        const targetIndustryComplete = isSameIndustry === true || (isSameIndustry === false && !!targetIndustry)
        
        // Wenn Rolle gleich: automatisch übernommen, sonst muss Ziel-Rolle ausgewählt sein
        const targetRoleComplete = isSameRole === true || (isSameRole === false && !!targetRoleField)
        
        return baseFieldsComplete && industryQuestionComplete && roleQuestionComplete && targetIndustryComplete && targetRoleComplete
    }, [role, experienceLevel, companySize, isSameIndustry, isSameRole, targetIndustry, targetRoleField])
    
    // Automatisch Ziel-Branche setzen wenn "Ja" gewählt
    React.useEffect(() => {
        if (isSameIndustry === true && industry) {
            setTargetIndustry(industry)
        } else if (isSameIndustry === false) {
            setTargetIndustry("") // Reset wenn auf "Nein" geändert
        }
    }, [isSameIndustry, industry])
    
    // Automatisch Ziel-Rolle setzen wenn "Ja" gewählt
    React.useEffect(() => {
        if (isSameRole === true && role) {
            setTargetRoleField(role)
        } else if (isSameRole === false) {
            setTargetRoleField("") // Reset wenn auf "Nein" geändert
        }
    }, [isSameRole, role])

    // Loading Overlay Component
    const LoadingOverlay = () => {
        const tasks = [
            { id: 1, text: "Analysiere Arbeitsmarktdaten", completed: analysisProgress >= 25 },
            { id: 2, text: "Verarbeite 10.000+ Stellenbeschreibungen", completed: analysisProgress >= 50 },
            { id: 3, text: "Identifiziere Kompetenzanforderungen", completed: analysisProgress >= 75 },
            { id: 4, text: "Generiere personalisierte Fragen", completed: analysisProgress >= 100 },
        ]

        return (
            <div
                key="loading-overlay"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "#ffffff",
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    willChange: "auto",
                }}
            >
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 24,
                        padding: "40px 32px",
                        maxWidth: 480,
                        width: "100%",
                        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                    }}
                >
                    {/* Icon */}
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #22d3ee, #10b981)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                        }}
                    >
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="12 2 15 9 22 10 17 15 18 22 12 18 6 22 7 15 2 10 9 9" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#1f2937",
                            textAlign: "center",
                            margin: "0 0 8px",
                        }}
                    >
                        KI analysiert dein Profil
                    </h2>

                    {/* Subtitle */}
                    <p
                        style={{
                            fontSize: 15,
                            color: "#6b7280",
                            textAlign: "center",
                            margin: "0 0 32px",
                            lineHeight: 1.5,
                        }}
                    >
                        Wir erstellen personalisierte Fragen basierend auf deiner Zielposition...
                    </p>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 16 }}>
                        <div
                            style={{
                                width: "100%",
                                height: 8,
                                borderRadius: 9999,
                                background: "#e5e7eb",
                                overflow: "hidden",
                                marginBottom: 8,
                            }}
                        >
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${Math.min(analysisProgress, 100)}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                style={{
                                    height: "100%",
                                    borderRadius: 9999,
                                    background: "linear-gradient(90deg, #22d3ee, #10b981)",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "#6b7280",
                                textAlign: "center",
                                fontWeight: 500,
                            }}
                        >
                            {Math.round(Math.min(analysisProgress, 100))}%
                        </div>
                    </div>

                    {/* Task List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    fontSize: 14,
                                    color: task.completed ? "#1f2937" : "#9ca3af",
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: task.completed ? "#2563eb" : "#e5e7eb",
                                        flexShrink: 0,
                                    }}
                                />
                                <span>{task.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Step 1 Compact Card Component
    const Step1CompactCard = () => (
        <motion.div
            key="step1-compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                background: "#f9fafb",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                marginBottom: 20,
            }}
        >
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <IconCheck />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Zielposition</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{targetPosition}</div>
            </div>
            <button
                type="button"
                onClick={handleEditTargetPosition}
                style={{
                    padding: 8,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                }}
                aria-label="Zielposition bearbeiten"
            >
                <IconEdit />
            </button>
        </motion.div>
    )

    // Step 2 Form Component - mit useCallback memoized um Fokus-Verlust zu vermeiden
    const renderStep2Form = React.useCallback(() => (
        <div
            style={{
                background: "#fff",
                borderRadius: 16,
                padding: "24px 20px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                border: "1px solid #e5e7eb",
            }}
        >
            <div
                style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    marginBottom: 16,
                }}
            >
                SCHRITT 2 VON 2
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                Super! Jetzt noch dein aktuelles Profil
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 24px" }}>
                Damit wir deine Skill-Lücken präzise analysieren können.
            </p>
            <form onSubmit={handleStep2Submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                        Aktuelle Berufsbezeichnung
                    </label>
                    <input
                        type="text"
                        placeholder="z.B. Product Manager"
                        value={currentTitle}
                        onChange={(e) => setCurrentTitle(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            fontSize: 16,
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            color: "#1f2937",
                            background: "#fff",
                            boxSizing: "border-box",
                        }}
                    />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: isNarrow ? 12 : 16 }}>
                    <div ref={industryDropdownRef} style={{ position: "relative" }}>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                            Branche
                        </label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <input
                                type="text"
                                value={isIndustryDropdownOpen ? industrySearchQuery : (industry || "")}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setIndustrySearchQuery(value)
                                    setIsIndustryDropdownOpen(true)
                                    setIndustry("") // Clear selection when typing
                                }}
                                onFocus={() => {
                                    setIsIndustryDropdownOpen(true)
                                    if (industry && !industrySearchQuery) {
                                        setIndustrySearchQuery(industry)
                                        setIndustry("") // Clear so user can search
                                    }
                                }}
                                onBlur={(e) => {
                                    // Delay closing to allow button click
                                    setTimeout(() => {
                                        if (!industry) {
                                            setIndustrySearchQuery("")
                                        }
                                        setIsIndustryDropdownOpen(false)
                                    }, 200)
                                }}
                                placeholder={industry ? industry : "Branche suchen..."}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    paddingRight: 40,
                                    fontSize: 16,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    color: industry && !isIndustryDropdownOpen ? "#1f2937" : "#1f2937",
                                    background: "#fff",
                                    boxSizing: "border-box",
                                    cursor: "text",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                    color: "#9ca3af",
                                }}
                            >
                                <IconChevronDown />
                            </div>
                        </div>
                        <AnimatePresence>
                            {isIndustryDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        marginTop: 4,
                                        background: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
                                        maxHeight: 240,
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                        zIndex: 1000,
                                        width: "100%",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    {filteredIndustries.length > 0 ? (
                                        filteredIndustries.map((ind) => (
                                            <button
                                                key={ind}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    // Prevent blur event
                                                    e.preventDefault()
                                                }}
                                                onClick={() => {
                                                    setIndustry(ind)
                                                    setIndustrySearchQuery("")
                                                    setIsIndustryDropdownOpen(false)
                                                }}
                                                style={{
                                                    width: "100%",
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: 15,
                                                    color: "#1f2937",
                                                    background: industry === ind ? "#eff6ff" : "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    transition: "background-color 0.15s",
                                                    lineHeight: 1.35,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    boxSizing: "border-box",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (industry !== ind) {
                                                        e.currentTarget.style.background = "#f9fafb"
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (industry !== ind) {
                                                        e.currentTarget.style.background = "transparent"
                                                    }
                                                }}
                                            >
                                                {ind}
                                            </button>
                                        ))
                                    ) : (
                                        <div style={{ padding: "12px 16px", fontSize: 14, color: "#6b7280", textAlign: "center" }}>
                                            Keine Ergebnisse gefunden
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                            Rolle
                        </label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={isLoadingRoles || availableRoles.length === 0}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    paddingRight: 40,
                                    fontSize: 16,
                                    border: isLoadingRoles ? "1px solid #dbeafe" : "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    color: role ? "#1f2937" : "#9ca3af",
                                    background: isLoadingRoles ? "#f0f9ff" : availableRoles.length === 0 ? "#f9fafb" : "#fff",
                                    appearance: "none",
                                    boxSizing: "border-box",
                                    cursor: isLoadingRoles || availableRoles.length === 0 ? "not-allowed" : "pointer",
                                }}
                            >
                                <option value="">Wählen</option>
                                {availableRoles.map((roleOption) => (
                                    <option key={roleOption} value={roleOption}>
                                        {roleOption}
                                    </option>
                                ))}
                            </select>
                            <div
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                    color: isLoadingRoles ? "#2563eb" : "#9ca3af",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                }}
                            >
                                {isLoadingRoles ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                        style={{ width: 16, height: 16 }}
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                    </motion.div>
                                ) : (
                                    <IconChevronDown />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                        Erfahrungslevel
                    </label>
                    <div style={{ position: "relative", width: "100%" }}>
                        <select
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                paddingRight: 40,
                                fontSize: 16,
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                color: experienceLevel ? "#1f2937" : "#9ca3af",
                                background: "#fff",
                                appearance: "none",
                                boxSizing: "border-box",
                            }}
                        >
                            <option value="">Wähle dein Erfahrungslevel</option>
                            <option value="junior">Junior (0-2 Jahre)</option>
                            <option value="mid">Mid-Level (3-5 Jahre)</option>
                            <option value="senior">Senior (6-10 Jahre)</option>
                            <option value="lead">Lead (10+ Jahre)</option>
                        </select>
                        <div
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: "#9ca3af",
                            }}
                        >
                            <IconChevronDown />
                        </div>
                    </div>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                        Unternehmensgröße
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                        {[
                            { value: "startup", label: "Startup (1-50)" },
                            { value: "small", label: "Klein (51-200)" },
                            { value: "medium", label: "Mittel (201-1000)" },
                            { value: "large", label: "Groß (1000+)" },
                        ].map((size) => (
                            <button
                                key={size.value}
                                type="button"
                                onClick={() => setCompanySize(size.value)}
                                style={{
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    border: `1px solid ${companySize === size.value ? "#2563eb" : "#e5e7eb"}`,
                                    borderRadius: 12,
                                    color: companySize === size.value ? "#2563eb" : "#1f2937",
                                    background: companySize === size.value ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Zielposition Fragen - Aufklappbar */}
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
                    <button
                        type="button"
                        onClick={() => setIsTargetSectionExpanded(!isTargetSectionExpanded)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            marginBottom: isTargetSectionExpanded ? 20 : 0,
                        }}
                    >
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1f2937", marginBottom: 4 }}>
                                Eine kurze Rückfrage zu deiner Zielposition
                            </h3>
                            {!isTargetSectionExpanded && (
                                <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                                    Um deine Skill-Lücken noch präziser zu analysieren, benötigen wir noch ein paar Informationen zu deiner Wunschposition.
                                </p>
                            )}
                        </div>
                        <motion.div
                            animate={{ rotate: isTargetSectionExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                marginLeft: 16,
                                flexShrink: 0,
                                color: "#6b7280",
                            }}
                        >
                            <IconChevronDown />
                        </motion.div>
                    </button>
                    
                    <AnimatePresence>
                        {isTargetSectionExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                            >
                                <div style={{ paddingTop: 20 }}>
                                    <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
                                        Um deine Skill-Lücken noch präziser zu analysieren, benötigen wir noch ein paar Informationen zu deiner Wunschposition.
                                    </p>
                                    
                                    {/* Branche Frage */}
                                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                            Ist deine Zielposition in der gleichen Branche wie deine aktuelle Position?
                        </label>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <button
                                type="button"
                                onClick={() => setIsSameIndustry(true)}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    border: `1px solid ${isSameIndustry === true ? "#2563eb" : "#e5e7eb"}`,
                                    borderRadius: 12,
                                    color: isSameIndustry === true ? "#2563eb" : "#1f2937",
                                    background: isSameIndustry === true ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                Ja
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSameIndustry(false)}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    border: `1px solid ${isSameIndustry === false ? "#2563eb" : "#e5e7eb"}`,
                                    borderRadius: 12,
                                    color: isSameIndustry === false ? "#2563eb" : "#1f2937",
                                    background: isSameIndustry === false ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                Nein
                            </button>
                        </div>
                        
                        {/* Ziel-Branche Dropdown wenn "Nein" */}
                        {isSameIndustry === false && (
                            <div style={{ marginTop: 12, position: "relative" }}>
                                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                                    Ziel-Branche
                                </label>
                                <div style={{ position: "relative", width: "100%" }}>
                                    <input
                                        type="text"
                                        value={isTargetIndustryDropdownOpen ? targetIndustrySearchQuery : targetIndustry}
                                        onChange={(e) => {
                                            setTargetIndustrySearchQuery(e.target.value)
                                            setIsTargetIndustryDropdownOpen(true)
                                        }}
                                        onFocus={() => {
                                            setIsTargetIndustryDropdownOpen(true)
                                            if (!targetIndustry) {
                                                setTargetIndustrySearchQuery("")
                                            } else {
                                                setTargetIndustrySearchQuery(targetIndustry)
                                                setTargetIndustry("") // Clear so user can search
                                            }
                                        }}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                if (!targetIndustry) {
                                                    setTargetIndustrySearchQuery("")
                                                }
                                                setIsTargetIndustryDropdownOpen(false)
                                            }, 200)
                                        }}
                                        placeholder={targetIndustry ? targetIndustry : "Branche suchen..."}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            paddingRight: 40,
                                            fontSize: 16,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 12,
                                            color: targetIndustry && !isTargetIndustryDropdownOpen ? "#1f2937" : "#1f2937",
                                            background: "#fff",
                                            boxSizing: "border-box",
                                            cursor: "text",
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: 12,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            pointerEvents: "none",
                                            color: "#9ca3af",
                                        }}
                                    >
                                        <IconChevronDown />
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {isTargetIndustryDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                position: "absolute",
                                                top: "100%",
                                                left: 0,
                                                right: 0,
                                                marginTop: 4,
                                                background: "#fff",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
                                                maxHeight: 240,
                                                overflowY: "auto",
                                                overflowX: "hidden",
                                                zIndex: 1000,
                                                width: "100%",
                                                boxSizing: "border-box",
                                            }}
                                        >
                                            {filteredTargetIndustries.length > 0 ? (
                                                filteredTargetIndustries.map((ind) => (
                                                    <button
                                                        key={ind}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                        }}
                                                        onClick={() => {
                                                            setTargetIndustry(ind)
                                                            setTargetIndustrySearchQuery("")
                                                            setIsTargetIndustryDropdownOpen(false)
                                                        }}
                                                        style={{
                                                            width: "100%",
                                                            padding: "12px 16px",
                                                            textAlign: "left",
                                                            fontSize: 15,
                                                            color: "#1f2937",
                                                            background: targetIndustry === ind ? "#eff6ff" : "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            transition: "background-color 0.15s",
                                                            lineHeight: 1.35,
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                            boxSizing: "border-box",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (targetIndustry !== ind) {
                                                                e.currentTarget.style.background = "#f9fafb"
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (targetIndustry !== ind) {
                                                                e.currentTarget.style.background = "transparent"
                                                            }
                                                        }}
                                                    >
                                                        {ind}
                                                    </button>
                                                ))
                                            ) : (
                                                <div style={{ padding: "12px 16px", fontSize: 14, color: "#6b7280", textAlign: "center" }}>
                                                    Keine Ergebnisse gefunden
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                    
                    {/* Rolle Frage */}
                    <div>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                            Ist deine Zielposition im gleichen Berufsfeld wie deine aktuelle Position?
                        </label>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <button
                                type="button"
                                onClick={() => setIsSameRole(true)}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    border: `1px solid ${isSameRole === true ? "#2563eb" : "#e5e7eb"}`,
                                    borderRadius: 12,
                                    color: isSameRole === true ? "#2563eb" : "#1f2937",
                                    background: isSameRole === true ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                Ja
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSameRole(false)}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    border: `1px solid ${isSameRole === false ? "#2563eb" : "#e5e7eb"}`,
                                    borderRadius: 12,
                                    color: isSameRole === false ? "#2563eb" : "#1f2937",
                                    background: isSameRole === false ? "#eff6ff" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                Nein
                            </button>
                        </div>
                        
                        {/* Ziel-Rolle Dropdown wenn "Nein" */}
                        {isSameRole === false && (
                            <div style={{ marginTop: 12 }}>
                                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 8 }}>
                                    Ziel-Rolle
                                </label>
                                <div style={{ position: "relative", width: "100%" }}>
                                    <select
                                        value={targetRoleField}
                                        onChange={(e) => setTargetRoleField(e.target.value)}
                                        disabled={isLoadingRoles || availableRoles.length === 0}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            paddingRight: 40,
                                            fontSize: 16,
                                            border: isLoadingRoles ? "1px solid #dbeafe" : "1px solid #e5e7eb",
                                            borderRadius: 12,
                                            color: targetRoleField ? "#1f2937" : "#9ca3af",
                                            background: isLoadingRoles ? "#f0f9ff" : availableRoles.length === 0 ? "#f9fafb" : "#fff",
                                            appearance: "none",
                                            boxSizing: "border-box",
                                            cursor: isLoadingRoles || availableRoles.length === 0 ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        <option value="">Wählen</option>
                                        {availableRoles.map((roleOption) => (
                                            <option key={roleOption} value={roleOption}>
                                                {roleOption}
                                            </option>
                                        ))}
                                    </select>
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: 12,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            pointerEvents: "none",
                                            color: isLoadingRoles ? "#2563eb" : "#9ca3af",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 20,
                                            height: 20,
                                        }}
                                    >
                                        {isLoadingRoles ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                                style={{ width: 16, height: 16 }}
                                            >
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                </svg>
                                            </motion.div>
                                        ) : (
                                            <IconChevronDown />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                <button
                    type="submit"
                    disabled={!isFormComplete}
                    style={{
                        width: "100%",
                        padding: "14px 20px",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#fff",
                        background: isFormComplete ? "#2563eb" : "#818cf8",
                        border: "none",
                        borderRadius: 12,
                        cursor: isFormComplete ? "pointer" : "not-allowed",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 24,
                        transition: "background-color 0.2s ease",
                        opacity: isFormComplete ? 1 : 0.7,
                    }}
                >
                    Analyse starten
                    <IconArrow />
                </button>
                {questionLoadError && (
                    <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
                        {questionLoadError}
                    </p>
                )}
            </form>
        </div>
    ), [
        currentTitle,
        industry,
        industrySearchQuery,
        isIndustryDropdownOpen,
        filteredIndustries,
        role,
        experienceLevel,
        companySize,
        availableRoles,
        isLoadingRoles,
        isFormComplete,
        analysisProgress,
        handleStep2Submit,
        setIndustry,
        setIndustrySearchQuery,
        setIsIndustryDropdownOpen,
        role,
        experienceLevel,
        companySize,
        isSameIndustry,
        isSameRole,
        targetIndustry,
        targetIndustrySearchQuery,
        isTargetIndustryDropdownOpen,
        filteredTargetIndustries,
        setTargetIndustry,
        setTargetIndustrySearchQuery,
        setIsTargetIndustryDropdownOpen,
        targetRoleField,
        setTargetRoleField,
        availableRoles,
        isLoadingRoles,
        isFormComplete,
        setIsSameIndustry,
        setIsSameRole,
        isTargetSectionExpanded,
        setIsTargetSectionExpanded,
        questionLoadError,
    ])

    const renderQuestionsStep = React.useCallback(() => {
        if (!generatedQuestions || generatedQuestions.length === 0) {
            return (
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 16,
                        padding: "24px 20px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                    }}
                >
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                        Fragen werden vorbereitet
                    </h2>
                    <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>
                        {questionLoadError || "Bitte starte die Analyse erneut."}
                    </p>
                </div>
            )
        }

        const totalQuestions = generatedQuestions.length
        const answeredCount = Object.keys(questionAnswers).length

        if (answeredCount >= totalQuestions) {
            return (
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 16,
                        padding: "24px 20px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                        textAlign: "center",
                    }}
                >
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                        Danke, deine Antworten sind erfasst
                    </h2>
                    <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>
                        Du hast alle Fragen beantwortet.
                    </p>
                </div>
            )
        }

        const currentScenario = generatedQuestions[Math.min(currentQuestionIndex, totalQuestions - 1)]
        const progress = totalQuestions > 0 ? ((answeredCount + 1) / totalQuestions) * 100 : 0

        return (
            <div
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "24px 20px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                }}
            >
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#2563eb", marginBottom: 12 }}>
                    SCHRITT 3 VON 3
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                    Realitaetscheck-Quiz
                </h2>
                <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 16px" }}>
                    Frage {currentScenario.index + 1} von {totalQuestions}
                </p>

                <div
                    style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 9999,
                        background: "#e5e7eb",
                        overflow: "hidden",
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            width: `${Math.min(progress, 100)}%`,
                            height: "100%",
                            borderRadius: 9999,
                            background: "linear-gradient(90deg, #22d3ee, #10b981)",
                            transition: "width 0.25s ease",
                        }}
                    />
                </div>

                <div
                    style={{
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        padding: "16px 14px",
                        marginBottom: 14,
                    }}
                >
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#1f2937", margin: "0 0 8px", whiteSpace: "pre-line" }}>
                        {currentScenario.situation}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", margin: 0 }}>
                        Was wuerdest du priorisieren?
                    </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {currentScenario.choices.map((choice) => (
                        <button
                            key={choice.choice_id}
                            type="button"
                            onClick={() => handleQuestionChoice(currentScenario, choice)}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "12px 14px",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                color: "#1f2937",
                                fontSize: 15,
                                lineHeight: 1.5,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {choice.option}
                        </button>
                    ))}
                </div>
            </div>
        )
    }, [generatedQuestions, currentQuestionIndex, questionAnswers, questionLoadError, handleQuestionChoice])

    // Render Logic mit AnimatePresence
    return (
        <div
            style={{
                width: "100%",
                maxWidth,
                margin: "0 auto",
                padding: "24px 20px 40px",
                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            {/* Step 1 Compact Card (nur bei Step 2) */}
            <AnimatePresence mode="wait">
                {step === 2 && <Step1CompactCard />}
            </AnimatePresence>

            {/* Step 1 Content (Hero + Features) - nur bei Step 1 */}
            <AnimatePresence>
                {step === 1 && (
                    <motion.div
                        key="hero-content"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {renderStep1Content()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step 2 Form - nur bei Step 2 */}
            <AnimatePresence mode="wait">
                {step === 2 && (
                    <motion.div
                        key="step2-form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {renderStep2Form()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step 3 Questions - nur bei Step 3 */}
            <AnimatePresence mode="wait">
                {step === 3 && (
                    <motion.div
                        key="step3-questions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {renderQuestionsStep()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay - komplettes Overlay - immer im DOM für sofortiges Rendering */}
            <div style={{ display: isAnalyzing ? "block" : "none" }}>
                <LoadingOverlay />
            </div>
        </div>
    )

    function renderStep1Content() {
        return (
            <>
                {/* Hero */}
                <header style={{ textAlign: "center", paddingTop: 8 }}>
                    <h1
                        style={{
                            fontSize: "clamp(2.1rem, 6vw, 4rem)",
                            fontWeight: 800,
                            lineHeight: 1.08,
                            margin: 0,
                            color: "#111827",
                        }}
                    >
                        Bist du wirklich ready
                        <span
                            style={{
                                display: "block",
                                marginTop: 4,
                                background: "linear-gradient(90deg, #4F46E5, #2563EB, #22C55E)",
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                color: "transparent",
                            }}
                        >
                            für deinen nächsten Job?
                        </span>
                    </h1>
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1-full"
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    width: "100%",
                                    maxWidth: 900,
                                    margin: "28px auto 0",
                                    padding: isNarrow ? "20px 16px 22px" : "34px 40px 34px",
                                    background: "#fff",
                                    borderRadius: 34,
                                    boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
                                    border: "1px solid #e5e7eb",
                                    boxSizing: "border-box",
                                }}
                            >
                                <h2 style={{ fontSize: isNarrow ? 16 : 18, fontWeight: 600, color: "#374151", margin: "0 0 16px", textAlign: "left", lineHeight: 1.2 }}>
                                    Welche Position strebst du an?
                                </h2>
                                <form onSubmit={handleStep1Submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                                        <input
                                            type="text"
                                            placeholder="z.B. Senior Product Manager"
                                            value={targetRole}
                                            onChange={(e) => setTargetRole(e.target.value)}
                                            aria-label="Zielposition"
                                            style={{
                                                width: "100%",
                                                padding: isNarrow ? "14px 18px" : "20px 22px",
                                                fontSize: 16,
                                                border: "2px solid #d1d5db",
                                                borderRadius: 30,
                                                color: "#1f2937",
                                                background: "#fff",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                        <p
                                            style={{
                                                fontSize: 11,
                                                color: "#9ca3af",
                                                marginTop: 4,
                                                marginBottom: 0,
                                                lineHeight: 1.35,
                                            }}
                                        >
                                            Tipp: Nutze den Jobtitel so wie ihn jeder versteht – nicht deinen internen Titel.
                                            z.B. "Vertriebstrainer" statt "Experte für Vertriebstelefonie"
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!targetRole.trim() || isLoadingStep}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 8,
                                            padding: isNarrow ? "16px 20px" : "20px 24px",
                                            fontSize: isNarrow ? 18 : 20,
                                            fontWeight: 600,
                                            color: targetRole.trim() ? "#fff" : "#9ca3af",
                                            background: targetRole.trim()
                                                ? "linear-gradient(135deg, #4f46e5 0%, #2563eb 55%, #1d4ed8 100%)"
                                                : "#e5e7eb",
                                            border: "none",
                                            borderRadius: 22,
                                            cursor: targetRole.trim() && !isLoadingStep ? "pointer" : "default",
                                            transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
                                            boxShadow: targetRole.trim()
                                                ? "0 10px 28px rgba(37, 99, 235, 0.38)"
                                                : "none",
                                            opacity: isLoadingStep ? 0.88 : 1,
                                        }}
                                    >
                                        {isLoadingStep ? (
                                            <>
                                                <IconSpinner />
                                                <span>Lädt...</span>
                                            </>
                                        ) : (
                                            <>
                                                Weiter
                                                <span style={{ display: "flex" }}><IconArrow /></span>
                                            </>
                                        )}
                                    </button>
                                    <p
                                        style={{
                                            fontSize: 11,
                                            color: "#9ca3af",
                                            textAlign: "center",
                                            marginTop: 8,
                                            lineHeight: 1.5,
                                            maxWidth: 320,
                                            marginLeft: "auto",
                                            marginRight: "auto",
                                            marginBottom: 0,
                                        }}
                                    >
                                        Mit dem Start stimmst du der Verarbeitung deiner Eingaben zur Erstellung deiner Analyse zu. Mehr dazu in unserer{" "}
                                        <a
                                            href="/datenschutz"
                                            style={{
                                                color: "#9ca3af",
                                                textDecoration: "underline",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Datenschutzerklärung
                                        </a>
                                        .
                                    </p>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <p
                        style={{
                            fontSize: isNarrow ? 16 : 17,
                            color: "#4b5563",
                            margin: "26px 0 0",
                            maxWidth: 900,
                            marginLeft: "auto",
                            marginRight: "auto",
                            lineHeight: 1.55,
                            textAlign: "center",
                        }}
                    >
                        Der kürzeste Weg von deinem heutigen Job zu dem Job den du willst. Wir zeigen dir wo du heute stehst – und welche eine Ressource dich am schnellsten dorthin bringt.
                    </p>
                </header>

                {/* Features */}
                <motion.section
                    key="features-section"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ marginTop: 48 }}
                    aria-labelledby="wm-features-heading"
                >
                    <h2
                        id="wm-features-heading"
                        style={{
                            fontSize: isNarrow ? 12 : 16,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: "#6b7280",
                            textAlign: "left",
                            margin: "0 0 20px",
                        }}
                    >
                        WAS DU BEKOMMST
                    </h2>
                    <div
                        ref={carouselRef}
                        style={{
                            width: "100%",
                            overflow: "hidden",
                            borderRadius: 16,
                            minHeight: 260,
                            touchAction: "pan-y pinch-zoom",
                        }}
                    >
                        <motion.div
                            drag={viewportWidth > 0 ? "x" : false}
                            dragConstraints={
                                viewportWidth > 0
                                    ? { left: -(viewportWidth * (SLIDE_COUNT - 1)), right: 0 }
                                    : undefined
                            }
                            dragElastic={0.15}
                            onDragStart={() => { isDraggingRef.current = true }}
                            onDragEnd={handleDragEnd}
                            style={{
                                display: "flex",
                                width: `${SLIDE_COUNT * 100}%`,
                                x,
                                cursor: viewportWidth > 0 ? "grab" : "default",
                                touchAction: "none",
                            }}
                            whileTap={viewportWidth > 0 ? { cursor: "grabbing" } : undefined}
                        >
                            {FEATURES.map((feature) => (
                                <div
                                    key={feature.id}
                                    style={{
                                        flex: `0 0 ${100 / SLIDE_COUNT}%`,
                                        width: `${100 / SLIDE_COUNT}%`,
                                        maxWidth: `${100 / SLIDE_COUNT}%`,
                                        padding: "0 6px",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "100%",
                                            maxWidth: "100%",
                                            padding: "24px 20px",
                                            background: "#f9fafb",
                                            borderRadius: 16,
                                            border: "1px solid #e5e7eb",
                                            textAlign: "center",
                                            boxSizing: "border-box",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: feature.iconColor }}>
                                            <feature.icon />
                                        </div>
                                        <h3 style={{ fontSize: isNarrow ? 18 : 22, fontWeight: 700, color: "#1f2937", margin: "0 0 8px", lineHeight: 1.25 }}>
                                            {feature.title}
                                        </h3>
                                        <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                        {FEATURES.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSlideIndex(i)}
                                aria-label={`Slide ${i + 1}`}
                                aria-current={i === slideIndex}
                                style={{
                                    width: slideIndex === i ? 24 : 8,
                                    height: 8,
                                    padding: 0,
                                    border: "none",
                                    borderRadius: 9999,
                                    background: slideIndex === i ? "#2563eb" : "#e5e7eb",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 10,
                            width: "100%",
                            marginTop: 16,
                        }}
                    >
                        {INFO_CARDS.map((card) => (
                            <div
                                key={card.label}
                                style={{
                                    padding: 14,
                                    background: "#f9fafb",
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    textAlign: "center",
                                    boxSizing: "border-box",
                                    minWidth: 0,
                                }}
                            >
                                <span
                                    style={{
                                        display: "block",
                                        fontSize: 16,
                                        fontWeight: 700,
                                        marginBottom: 4,
                                        color: "#1f2937",
                                        ...("gradient" in card && card.gradient
                                            ? {
                                                  background: "linear-gradient(90deg, #4F46E5, #2563EB, #22C55E)",
                                                  WebkitBackgroundClip: "text",
                                                  backgroundClip: "text",
                                                  color: "transparent",
                                              }
                                            : {}),
                                    }}
                                >
                                    {card.value}
                                </span>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>{card.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.section>
            </>
        )
    }
}
