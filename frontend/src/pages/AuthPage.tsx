import React, { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Eye, EyeOff, Check, Loader2, ArrowLeft, Mail, Lock, User, Phone, Sprout, ShoppingBag } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { postLoginPath, type Role, type FarmerRegistrationFields } from "../types/auth"
import { navigate } from "../navigation"

const BRAND_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1600&h=500&fit=crop&auto=format",
]

function AnimatedBrandWordmark() {
  const [idx, setIdx] = useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % BRAND_IMAGES.length), 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative select-none pt-2 pb-1">
      {/* Base static text layer ensuring instant first-frame paint */}
      <div className="flex items-baseline whitespace-nowrap leading-normal text-charcoal">
        <span className="font-kannada text-4xl font-extrabold sm:text-5xl">ನೇಗಿಲು</span>
        <span className="font-sans text-3xl font-bold tracking-tight text-forest-500 sm:text-4xl">ai</span>
      </div>
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 flex items-baseline whitespace-nowrap bg-cover bg-center bg-clip-text text-transparent pt-2 pb-1 leading-normal"
          style={{ backgroundImage: `url('${BRAND_IMAGES[idx]}')` }}
        >
          <span className="font-kannada text-4xl font-extrabold sm:text-5xl">ನೇಗಿಲು</span>
          <span className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">ai</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

interface AuthPageProps {
  mode: "login" | "signup"
  onSwitch: (view: string) => void
  onBack: () => void
}

export default function AuthPage({ mode, onSwitch, onBack }: AuthPageProps) {
  const { user, isAuthenticated, role: authRole, login, register } = useAuth()
  const isLogin = mode === "login"

  // Redirect immediately if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const urlParams = new URLSearchParams(window.location.search)
      const userRole = user.role || authRole || "consumer"
      navigate(postLoginPath(userRole, urlParams.get("next")))
    }
  }, [isAuthenticated, user, authRole])

  // Form State
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [farmName, setFarmName] = useState("")
  const [district, setDistrict] = useState("")
  const [state, setState] = useState("")
  const [village, setVillage] = useState("")
  const [website, setWebsite] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>("farmer")
  const [rememberMe, setRememberMe] = useState(true)
  const [agreeTerms, setAgreeTerms] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset transient state when switching between login and signup modes
  React.useEffect(() => {
    setError(null)
    setSuccess(false)
    setConfirmPassword("")
  }, [mode])

  // Handle Auth Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      let loggedUser: any
      if (isLogin) {
        if (!email.trim() || !password) {
          throw new Error("Please enter your email/username and password.")
        }
        setLoading(true)
        const candidate = email.trim()
        try {
          loggedUser = await login({ username: candidate, password })
        } catch (err) {
          // Fallback: many accounts are created with a generated username
          // based on the local-part of the email (fullName OR email.split('@')[0]).
          // If the user typed their email, try the local-part as username before failing.
          if (candidate.includes("@")) {
            const local = candidate.split("@")[0]
            try {
              loggedUser = await login({ username: local, password })
            } catch (err2) {
              throw err2
            }
          } else {
            throw err
          }
        }
      } else {
        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
          throw new Error("Please fill in all required fields.")
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match. Please verify your password.")
        }
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.")
        }
        if (!agreeTerms) {
          throw new Error("Please agree to the Terms & Conditions to create an account.")
        }
        if (role === "farmer" && (!farmName.trim() || !mobileNumber.trim() || !district.trim() || !state.trim() || !village.trim())) {
          throw new Error("Please complete your farm name, phone number, village, district, and state.")
        }

        setLoading(true)
        // Clean username from full name or email
        const generatedUsername = fullName.trim().toLowerCase().replace(/\s+/g, "_") || email.split("@")[0]

        const farmerProfile: FarmerRegistrationFields | undefined =
          role === "farmer"
            ? {
                farmName: farmName.trim(),
                phone: mobileNumber.trim(),
                district: district.trim(),
                state: state.trim(),
                village: village.trim(),
              }
            : undefined

        loggedUser = await register({
          username: generatedUsername,
          email: email.trim(),
          password,
          role,
          first_name: fullName.trim().split(/\s+/)[0] || "",
          last_name: fullName.trim().split(/\s+/).slice(1).join(" "),
          farmerProfile,
          website,
        })
      }

      setSuccess(true)

      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search)
        // Use the role resolved from the authenticated profile, never the
        // signup selector or an arbitrary `next` URL.
        const userRole: Role = loggedUser?.role || (!isLogin ? role : "consumer")
        navigate(postLoginPath(userRole, urlParams.get("next")))
      }, 800)
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-cream px-4 py-12 text-charcoal font-sans">
      {/* Soft green + warm yellow ambient gradient blur halo (echoing the homepage hero atmosphere) */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-gradient-to-b from-harvest/35 via-forest-500/20 to-transparent blur-3xl opacity-80"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-forest-500/15 via-harvest/20 to-transparent blur-3xl opacity-60"
        aria-hidden="true"
      />

      {/* Top Left Navigation Link */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal/75 backdrop-blur-md shadow-sm transition-all hover:border-forest hover:bg-white hover:text-forest"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-charcoal/10 bg-white/85 p-8 sm:p-12 shadow-2xl backdrop-blur-xl transition-all">
        {/* Top Brand Logo with Animated Image Wordmark (Matching Footer Design) */}
        <div className="mb-6 flex justify-center text-center">
          <AnimatedBrandWordmark />
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 text-center"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-forest text-cream shadow-xl">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
                {isLogin ? "Welcome Back!" : "Account Created!"}
              </h2>
              <p className="mt-2 text-sm text-charcoal/70">
                Redirecting to your ನೇಗಿಲುai account...
              </p>
            </motion.div>
          ) : (
            /* Main Form: Login vs Sign Up */
            <motion.div key={isLogin ? "login" : "signup"} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Header Title & Subtitle */}
              <div className="mb-6 text-center">
                <h1 className="font-serif text-3xl font-normal tracking-tight text-charcoal sm:text-4xl">
                  {isLogin ? "Welcome back" : "Create your ನೇಗಿಲುai account"}
                </h1>
                <p className="mt-1.5 text-xs text-charcoal/70 sm:text-sm">
                  {isLogin
                    ? "Sign in to continue to your ನೇಗಿಲುai account."
                    : "Join ನೇಗಿಲುai and make smarter agricultural decisions."}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200/80">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>
                {/* SIGN UP ONLY: Role Selector (Farmer vs Consumer) */}
                {!isLogin && (
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      I am a
                    </label>
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sand-200/50 p-1.5 border border-charcoal/10">
                      <button
                        type="button"
                        onClick={() => setRole("farmer")}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                          role === "farmer"
                            ? "bg-forest text-cream shadow-md"
                            : "text-charcoal/70 hover:text-charcoal hover:bg-white/50"
                        }`}
                      >
                        <Sprout className="h-4 w-4" /> Farmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("consumer")}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                          role === "consumer"
                            ? "bg-forest text-cream shadow-md"
                            : "text-charcoal/70 hover:text-charcoal hover:bg-white/50"
                        }`}
                      >
                        <ShoppingBag className="h-4 w-4" /> Consumer
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGN UP ONLY: Full Name */}
                {!isLogin && (
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Harjeet Singh"
                        className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 py-3 pl-11 pr-4 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                )}

                {/* EMAIL / USERNAME INPUT */}
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      {isLogin ? "Email or username" : "Email address"}
                    </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 py-3 pl-11 pr-4 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
                    />
                  </div>
                </div>

                {/* SIGN UP ONLY: Mobile Number */}
                {!isLogin && (
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      Mobile Number {role === "farmer" ? "" : "(Optional)"}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                      <input
                        type="tel"
                        required={role === "farmer"}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 py-3 pl-11 pr-4 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                )}

                {!isLogin && role === "farmer" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">Farm Name</label>
                      <input type="text" required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Green Valley Farm" className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 px-4 py-3 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">Village</label>
                      <input type="text" required value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Your village" className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 px-4 py-3 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20" />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">District</label>
                      <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Your district" className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 px-4 py-3 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">State</label>
                      <input type="text" required value={state} onChange={(e) => setState(e.target.value)} placeholder="Your state" className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 px-4 py-3 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20" />
                    </div>
                  </div>
                )}

                {/* PASSWORD INPUT */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-xs font-medium text-forest hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 py-3 pl-11 pr-11 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* SIGN UP ONLY: CONFIRM PASSWORD */}
                {!isLogin && (
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-charcoal/15 bg-sand-200/30 py-3 pl-11 pr-11 text-sm font-sans outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                )}

                {/* Checkboxes: Remember Me (Login) vs Terms & Conditions (Sign Up) */}
                {isLogin ? (
                  <div className="flex items-center justify-between text-xs text-charcoal/70">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-charcoal/20 text-forest focus:ring-forest"
                      />
                      Remember me
                    </label>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-xs text-charcoal/70">
                    <input
                      type="checkbox"
                      required
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-charcoal/20 text-forest focus:ring-forest"
                    />
                    <span>
                      I agree to the{" "}
                      <button type="button" onClick={() => navigate("/terms")} className="font-medium text-forest hover:underline">
                        Terms &amp; Conditions
                      </button>{" "}
                      and{" "}
                      <button type="button" onClick={() => navigate("/privacy")} className="font-medium text-forest hover:underline">
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </div>
                )}

                {/* PRIMARY SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3.5 text-sm font-semibold text-cream shadow-lg shadow-forest/20 transition-all hover:bg-forest-600 hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isLogin ? (
                    "Log in →"
                  ) : (
                    "Create account →"
                  )}
                </button>
              </form>

              

              {/* FOOTER SWITCH LINK */}
              <div className="mt-6 text-center text-xs text-charcoal/70">
                {isLogin ? (
                  <>
                    Don&rsquo;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => onSwitch("signup")}
                      className="font-bold text-forest hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => onSwitch("login")}
                      className="font-bold text-forest hover:underline"
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-8 text-center text-xs font-medium text-charcoal/40">
        &copy; {new Date().getFullYear()} ನೇಗಿಲುAI Inc. All rights reserved.
      </div>
    </div>
  )
}
