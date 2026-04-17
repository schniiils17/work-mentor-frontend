import * as React from "react"

type FooterLinkProps = {
    href: string
    label: string
}

function FooterLink({ href, label }: FooterLinkProps) {
    const [hovered, setHovered] = React.useState(false)
    return (
        <a
            href={href}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                color: hovered ? "#6b7280" : "#9ca3af",
                textDecoration: "none",
                transition: "color 0.15s ease",
            }}
        >
            {label}
        </a>
    )
}

export default function WMFooter() {
    return (
        <footer
            style={{
                width: "100%",
                background: "transparent",
                borderTop: "1px solid #e5e7eb",
                padding: "16px 20px",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "#9ca3af",
                    lineHeight: 1.6,
                }}
            >
                <span>© 2026 Work Mentor</span>
                <span> · </span>
                <FooterLink href="/impressum" label="Impressum" />
                <span> · </span>
                <FooterLink href="/datenschutz" label="Datenschutz" />
                <span> · Orientierungstool zur Selbstreflexion - kein psychologisches Gutachten.</span>
            </div>
        </footer>
    )
}
