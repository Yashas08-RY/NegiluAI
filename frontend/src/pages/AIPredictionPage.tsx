import { useState } from "react"
import { Info, Loader2, MapPin, Sparkles } from "lucide-react"
import { api, type BaselinePrediction } from "../api"

const CROPS = ["Rice", "Wheat", "Tomato", "Onion", "Potato", "Mango", "Turmeric", "Chilli", "Cotton", "Sugarcane"]
const SEASONS = ["Kharif", "Rabi", "Zaid"] as const

export default function AIPredictionPage() {
  const [crop, setCrop] = useState("Rice")
  const [location, setLocation] = useState("")
  const [season, setSeason] = useState<(typeof SEASONS)[number]>("Kharif")
  const [area, setArea] = useState("1")
  const [previousYield, setPreviousYield] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [yieldResult, setYieldResult] = useState<BaselinePrediction | null>(null)
  const [priceResult, setPriceResult] = useState<BaselinePrediction | null>(null)

  async function handlePredict(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setYieldResult(null)
    setPriceResult(null)
    const areaHectares = Number(area)
    if (!location.trim() || !Number.isFinite(areaHectares) || areaHectares <= 0) {
      setError("Enter a location and an area greater than zero.")
      return
    }
    setLoading(true)
    try {
      const seasonValue = season.toLowerCase() as "kharif" | "rabi" | "zaid"
      const previous = Number(previousYield)
      const [yieldPrediction, pricePrediction] = await Promise.all([
        api.predictYield({ crop, area_hectares: areaHectares, season: seasonValue, ...(previousYield && Number.isFinite(previous) && previous > 0 ? { previous_yield_t_per_hectare: previous } : {}) }),
        api.predictPrice({ crop, location: location.trim(), season: seasonValue }),
      ])
      setYieldResult(yieldPrediction)
      setPriceResult(pricePrediction)
    } catch (requestError: any) {
      setError(requestError?.message || "Predictions are unavailable right now. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return <div className="min-h-screen bg-cream px-4 py-12 md:px-8">
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 text-center">
        <div className="mb-5 inline-flex rounded-full bg-forest/10 p-4 text-forest"><Sparkles size={40} /></div>
        <h1 className="font-serif text-4xl text-forest">Crop Intelligence</h1>
        <p className="mt-3 text-charcoal/70">Predictions are requested through ನೇಗಿಲುai’s secure backend connection.</p>
      </div>

      <form onSubmit={handlePredict} className="grid grid-cols-1 gap-5 rounded-3xl border border-charcoal/10 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
        <label className="text-sm font-medium text-forest">Crop<select value={crop} onChange={event => setCrop(event.target.value)} className="mt-2 w-full rounded-xl border border-charcoal/20 p-3">{CROPS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-medium text-forest">Location<div className="relative mt-2"><MapPin className="absolute left-3 top-3 text-charcoal/40" size={18} /><input value={location} onChange={event => setLocation(event.target.value)} required className="w-full rounded-xl border border-charcoal/20 py-3 pl-10 pr-3" placeholder="e.g. Maharashtra" /></div></label>
        <label className="text-sm font-medium text-forest">Area (hectares)<input value={area} onChange={event => setArea(event.target.value)} type="number" min="0.01" step="0.01" required className="mt-2 w-full rounded-xl border border-charcoal/20 p-3" /></label>
        <label className="text-sm font-medium text-forest">Previous yield (t/ha, optional)<input value={previousYield} onChange={event => setPreviousYield(event.target.value)} type="number" min="0.01" step="0.01" className="mt-2 w-full rounded-xl border border-charcoal/20 p-3" /></label>
        <div className="md:col-span-2"><p className="mb-2 text-sm font-medium text-forest">Season</p><div className="flex gap-2">{SEASONS.map(value => <button key={value} type="button" onClick={() => setSeason(value)} className={`flex-1 rounded-xl py-2 ${season === value ? "bg-forest text-cream" : "bg-sand text-charcoal"}`}>{value}</button>)}</div></div>
        <button disabled={loading} className="md:col-span-2 flex items-center justify-center gap-2 rounded-full bg-forest py-4 font-medium text-cream disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}{loading ? "Requesting prediction…" : "Request prediction"}</button>
      </form>

      {error && <p className="mt-5 rounded-xl bg-clay/10 p-4 text-clay">{error}</p>}
      {(yieldResult || priceResult) && <section className="mt-8 rounded-3xl border border-charcoal/10 bg-white p-6 shadow-sm"><h2 className="font-serif text-2xl text-forest">Service response</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{yieldResult && <Result label="Estimated yield" result={yieldResult} />}{priceResult && <Result label="Price response" result={priceResult} />}</div><p className="mt-5 flex gap-2 text-sm text-charcoal/60"><Info size={18} className="shrink-0" />These values come from the configured ML service. They remain labelled as a baseline until your separate AI/ML system supplies a trained model.</p></section>}
    </div>
  </div>
}

function Result({ label, result }: { label: string; result: BaselinePrediction }) {
  return <div className="rounded-2xl bg-sand/40 p-5"><p className="text-sm text-charcoal/60">{label}</p><p className="mt-1 text-3xl font-semibold text-forest">{result.prediction} <span className="text-base font-normal">{result.unit}</span></p><p className="mt-3 text-xs text-charcoal/60">{result.disclaimer}</p></div>
}
