import { useState } from 'react'
import './App.css'

// Icons as inline SVG
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polygon points="12 2 15 9 22 10 17 15 18 22 12 18 6 22 7 15 2 10 9 9" />
  </svg>
)
const IconPeople = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconChart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
const IconTarget = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)
const IconBarChart = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
)
const IconBulb = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
)
const IconArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const FEATURES = [
  {
    id: 'diagnostik',
    icon: IconTarget,
    iconColor: 'var(--color-blue)',
    title: 'Situative KI-Diagnostik',
    description: 'Keine Selbsteinschätzung – wir messen deine Fähigkeiten durch realistische Job-Szenarien und vergleichen dich mit Marktanforderungen.',
  },
  {
    id: 'gap',
    icon: IconBarChart,
    iconColor: 'var(--color-green)',
    title: 'Strategische Gap-Analyse',
    description: 'Wir decken die unsichtbaren Lücken zwischen deinem Level und deiner Zielposition auf – mit visueller Darstellung deiner Stärken und Potenziale.',
  },
  {
    id: 'plan',
    icon: IconBulb,
    iconColor: '#ea580c',
    title: 'Kuratierter Entwicklungsplan',
    description: 'Schluss mit endloser Kurssuche – du erhältst exakt auf deine Gaps zugeschnittene Ressourcen vom Buch bis zum 1:1 Coaching.',
  },
]

const INFO_CARDS = [
  { value: '13 Fragen', label: 'Situative Szenarien' },
  { value: '< 5 Min', label: 'Schnelle Analyse' },
  { value: null, label: '10k+ Job-Profile', highlightValue: true }, // KI blau, gestützt grün
]

export default function App() {
  const [targetRole, setTargetRole] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Hier später: Weiterleitung oder API-Call an Make
    console.log('Zielposition:', targetRole)
  }

  return (
    <div className="app">
      {/* Hero */}
      <header className="hero">
        <div className="hero-inner">
          <div className="tagline">
            <span className="tagline-icon"><IconStar /></span>
            <span>KI-gestützte Karriereanalyse</span>
          </div>
          <h1 className="headline">
            Erkenne die Skills die dich{' '}
            <span className="headline-blue">wirklich</span>{' '}
            <span className="headline-green">weiterbringen</span>
          </h1>
          <p className="body">
            Wir spiegeln dein aktuelles Skillset an der Realität von +10.000 aktuellen Stellenausschreibungen. Erfahre exakt, auf welchem Level du stehst, und erhalte deine persönlichen Entwicklungsempfehlungen, um deine Zielposition sicher zu erreichen.
          </p>
          <div className="trust">
            <div className="trust-item">
              <span className="trust-icon"><IconPeople /></span>
              <span>5.000+ analysiert</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon"><IconChart /></span>
              <span>4.8/5 Rating</span>
            </div>
          </div>
          <div className="cta-card">
            <h2 className="cta-title">Welche Position strebst du an?</h2>
            <form onSubmit={handleSubmit} className="cta-form">
              <input
                type="text"
                className="cta-input"
                placeholder="z.B. Senior Product Manager"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                aria-label="Zielposition"
              />
              <button type="submit" className="cta-button">
                Kostenlos starten
                <span className="cta-button-icon"><IconArrow /></span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Features Carousel */}
      <section className="features" aria-labelledby="features-heading">
        <h2 id="features-heading" className="features-heading">WAS DU BEKOMMST</h2>
        <div className="carousel">
          <div className="carousel-track" style={{ transform: `translateX(-${slideIndex * 100}%)` }}>
            {FEATURES.map((feature) => (
              <div key={feature.id} className="carousel-slide">
                <div className="feature-card">
                  <div className="feature-icon" style={{ color: feature.iconColor }}>
                    <feature.icon />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.description}</p>
                </div>
                <div className="carousel-dots">
                  {FEATURES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`dot ${i === slideIndex ? 'dot-active' : ''}`}
                      onClick={() => setSlideIndex(i)}
                      aria-label={`Slide ${i + 1}`}
                      aria-current={i === slideIndex}
                    />
                  ))}
                </div>
                <div className="info-cards">
                  {INFO_CARDS.map((card) => (
                    <div key={card.label} className="info-card">
                      <span className="info-value">
                        {card.highlightValue ? (
                          <>
                            <span className="info-blue">KI</span>
                            <span className="info-green">-gestützt</span>
                          </>
                        ) : (
                          card.value
                        )}
                      </span>
                      <span className="info-label">{card.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
