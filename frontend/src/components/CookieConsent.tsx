import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"

const CONSENT_KEY = "negiluai.cookie-consent"

function loadAnalytics() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!measurementId || document.querySelector(`script[data-ga="${measurementId}"]`)) return
  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.ga = measurementId
  document.head.appendChild(script)
  window.dataLayer = window.dataLayer || []
  window.gtag = (...args: unknown[]) => window.dataLayer.push(args)
  window.gtag("js", new Date())
  window.gtag("config", measurementId, { anonymize_ip: true })
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    setVisible(consent === null)
    if (consent === "accepted") loadAnalytics()
  }, [])

  const choose = (value: "accepted" | "declined") => {
    localStorage.setItem(CONSENT_KEY, value)
    setVisible(false)
    if (value === "accepted") loadAnalytics()
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }))
  }

  if (!visible) return null

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-2xl rounded-2xl border border-charcoal/15 bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:left-auto" role="dialog" aria-label="Cookie preferences">
      <div className="flex gap-4">
        <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest sm:flex" aria-hidden="true">🍪</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-charcoal">Your privacy matters</h2>
          <p className="mt-1 text-sm leading-relaxed text-charcoal/70">We use essential storage to keep you signed in. Optional analytics cookies help us improve the experience and are only enabled with your permission.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("accepted")} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-bold text-cream hover:bg-forest-600"><Check className="h-3.5 w-3.5" /> Accept analytics</button>
            <button type="button" onClick={() => choose("declined")} className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 px-4 py-2 text-xs font-bold text-charcoal hover:border-forest hover:text-forest"><X className="h-3.5 w-3.5" /> Essential only</button>
          </div>
        </div>
      </div>
    </aside>
  )
}
