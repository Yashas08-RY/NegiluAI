import { navigate } from "../navigation"

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center bg-cream p-6 text-center"><div><h1 className="font-serif text-4xl">Access denied</h1><p className="mt-3 text-charcoal/70">Your account does not have permission to view this page.</p><button onClick={() => navigate("/")} className="mt-6 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream">Back to home</button></div></main>
}
