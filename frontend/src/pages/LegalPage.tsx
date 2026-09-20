import { ArrowLeft, ShieldCheck, Sprout } from "lucide-react"
import { navigate } from "../navigation"
import SiteMetadata from "../components/SiteMetadata"

type LegalPageProps = { kind: "privacy" | "terms" }

const content = {
  privacy: {
    title: "Privacy policy",
    description: "How ನೇಗಿಲುai collects, uses, and protects information for farmers and buyers.",
    intro: "We keep your information focused on running a trustworthy agricultural marketplace.",
    sections: [
      ["Information we collect", "We collect account details, profile information, marketplace activity, orders, and messages you choose to send us. Payment details are handled by our payment provider and are not stored as raw card data by ನೇಗಿಲುai."],
      ["How we use information", "We use information to authenticate accounts, connect buyers and farmers, process orders, provide predictions, prevent fraud, and improve the service. We do not sell personal information."],
      ["Your choices", "You can update profile information, request account deletion, or contact us about your data. Essential storage keeps authentication and cart workflows working; optional analytics is enabled only after consent."],
      ["Security and retention", "We use access controls, encrypted transport in production, and provider safeguards. We retain information only as long as needed for the service, legal obligations, and dispute resolution."],
      ["Contact", "For privacy questions, contact the platform team at privacy@negiluai.example. Replace this placeholder with your production privacy mailbox before launch."],
    ],
  },
  terms: {
    title: "Terms and conditions",
    description: "The terms for using the ನೇಗಿಲುai agricultural marketplace and AI tools.",
    intro: "These terms set clear expectations for a fair marketplace for farmers, buyers, and the ನೇಗಿಲುai team.",
    sections: [
      ["Using the service", "You must provide accurate account information, keep your credentials private, and use the service lawfully. You are responsible for activity performed through your account."],
      ["Marketplace listings", "Farmers are responsible for truthful descriptions, availability, quality, compliance, and fulfillment. Buyers are responsible for accurate delivery information and timely payment."],
      ["AI information", "Price and yield predictions are estimates for planning, not financial, agronomic, or legal advice. You remain responsible for decisions made using these tools."],
      ["Payments and cancellations", "Payments may be processed by third-party providers. Orders, refunds, cancellations, and delivery terms are shown at checkout or in the applicable order workflow."],
      ["Contact and changes", "We may update these terms as the service changes. Continued use after an update means you accept the revised terms. Questions can be sent to support@negiluai.example."],
    ],
  },
} as const

export default function LegalPage({ kind }: LegalPageProps) {
  const page = content[kind]
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <SiteMetadata title={page.title} description={page.description} path={`/${kind}`} />
      <header className="border-b border-charcoal/10 bg-cream/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2 font-display text-xl font-bold"><Sprout className="h-5 w-5 text-forest" /> ನೇಗಿಲುai</button>
          <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-forest-600"><ArrowLeft className="h-4 w-4" /> Back home</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <div className="flex items-center gap-3 text-forest"><ShieldCheck className="h-6 w-6" /><span className="font-mono text-xs font-bold uppercase tracking-[0.2em]">Trust center</span></div>
        <h1 className="mt-5 font-serif text-5xl font-light tracking-tight sm:text-6xl">{page.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal/70">{page.intro}</p>
        <div className="mt-14 divide-y divide-charcoal/10 border-y border-charcoal/10">
          {page.sections.map(([heading, body]) => <section key={heading} className="py-8"><h2 className="font-display text-xl font-bold">{heading}</h2><p className="mt-3 max-w-3xl leading-7 text-charcoal/70">{body}</p></section>)}
        </div>
        <p className="mt-8 text-xs text-charcoal/50">Last updated: September 19, 2026</p>
      </main>
    </div>
  )
}
