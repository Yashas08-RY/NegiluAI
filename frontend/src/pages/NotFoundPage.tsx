import { ArrowLeft, SearchX } from "lucide-react"
import { navigate } from "../navigation"
import SiteMetadata from "../components/SiteMetadata"

export default function NotFoundPage() {
  return <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center text-charcoal"><SiteMetadata title="Page not found" description="The page you requested could not be found." path={window.location.pathname} /><div className="max-w-md"><SearchX className="mx-auto h-12 w-12 text-forest" /><p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-forest">404</p><h1 className="mt-3 font-serif text-4xl">That page wandered off.</h1><p className="mt-4 leading-relaxed text-charcoal/65">The link may be outdated or the address may be misspelled.</p><button type="button" onClick={() => navigate("/")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream hover:bg-forest-600"><ArrowLeft className="h-4 w-4" /> Return home</button></div></main>
}
