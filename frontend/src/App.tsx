import { lazy, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Sprout,
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  Plus,
  Minus,
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  IndianRupee,
  Check,
  Loader2,
  ChevronDown,
  Building2,
  PhoneCall,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from "recharts"
import { api, type ApiCart, type ApiProduct } from "./api"
import { useAuth } from "./auth/AuthContext"
import { ProtectedRoute, RoleRoute } from "./routes/RouteGuards"
import type { Role } from "./types/auth"
import { navigate, ROUTE_CHANGE_EVENT } from "./navigation"

// Role-specific screens are loaded only when their route is visited.
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"))
const AuthPage = lazy(() => import("./pages/AuthPage"))
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"))
const FarmerDashboardPage = lazy(() => import("./pages/FarmerDashboardPage"))
const FarmerProductsPage = lazy(() => import("./pages/FarmerProductsPage"))
const FarmerOrdersPage = lazy(() => import("./pages/FarmerOrdersPage"))
const ConsumerDashboardPage = lazy(() => import("./pages/ConsumerDashboardPage"))
const ConsumerOrdersPage = lazy(() => import("./pages/ConsumerOrdersPage"))
const WishlistPage = lazy(() => import("./pages/WishlistPage"))
const CartPage = lazy(() => import("./pages/CartPage"))
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"))
const AIPredictionPage = lazy(() => import("./pages/AIPredictionPage"))
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"))
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"))
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
import Toast from "./components/ui/Toast"
import SiteMetadata from "./components/SiteMetadata"
const LegalPage = lazy(() => import("./pages/LegalPage"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))

// ----------------------------------------------------------------------------
// Data — realistic listings sourced as if from the farmer marketplace API.
// ----------------------------------------------------------------------------

type Crop = {
  id: string
  name: string
  variety: string
  farmer: string
  location: string
  category: string
  price: number
  unit: string
  rating: number
  reviews: number
  stockKg: number
  trend: number
  image: string
  organic: boolean
}

const CATEGORIES = ["All", "Grains", "Vegetables", "Fruits", "Pulses", "Spices"] as const

const toCrop = (product: ApiProduct): Crop => ({
  id: String(product.id),
  name: product.name,
  variety: product.description,
  farmer: product.farmer.farmer_profile?.farm_name || product.farmer.username,
  location: product.location,
  category: product.category,
  price: Number(product.price),
  unit: product.unit,
  rating: product.average_rating,
  reviews: product.review_count,
  stockKg: product.quantity,
  trend: 0,
  image: product.images.find((image) => image.is_primary)?.image ?? product.images[0]?.image ?? "",
  organic: Boolean(product.farmer.farmer_profile?.organic_certified),
})

// AI forecast series for the selected crop — 8 historic weeks + 4 forecast weeks.
const FORECAST = [
  { week: "W-8", price: 71 },
  { week: "W-7", price: 73 },
  { week: "W-6", price: 72 },
  { week: "W-5", price: 76 },
  { week: "W-4", price: 78 },
  { week: "W-3", price: 77 },
  { week: "W-2", price: 80 },
  { week: "Now", price: 82 },
  { week: "W+1", price: 85, forecast: true },
  { week: "W+2", price: 87, forecast: true },
  { week: "W+3", price: 89, forecast: true },
  { week: "W+4", price: 91, forecast: true },
]

const inr = (n: number) => "₹" + n.toLocaleString("en-IN")

// Farm imagery cycled through the footer wordmark.
const FOOTER_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&h=500&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1600&h=500&fit=crop&auto=format",
]

type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "trending"

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Most relevant",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  trending: "Trending now",
}

// ----------------------------------------------------------------------------
// Main App — Router
// ----------------------------------------------------------------------------

export default function App() {
  const { user, isAuthenticated, role, isLoading, logout } = useAuth()
  const [path, setPath] = useState(() => window.location.pathname + window.location.search + window.location.hash)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All")
  const [sort, setSort] = useState<SortKey>("relevance")
  const [crops, setCrops] = useState<Crop[]>([])
  const [total, setTotal] = useState(0)
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const token = isAuthenticated ? undefined : null
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())
  const [cart, setCart] = useState<{ crop: Crop; qty: number; itemId: number }[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Sync path on popstate and custom route events
  useEffect(() => {
    const sync = () => setPath(window.location.pathname + window.location.search + window.location.hash)
    window.addEventListener("popstate", sync)
    window.addEventListener(ROUTE_CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener(ROUTE_CHANGE_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [path])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  // Product fetching for marketplace
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("search", query.trim())
    if (category !== "All") params.set("category", category)
    if (sort === "price-asc") params.set("ordering", "price")
    if (sort === "price-desc") params.set("ordering", "-price")
    if (sort === "relevance") params.set("ordering", "-created_at")
    const timeout = window.setTimeout(async () => {
      setProductsLoading(true)
      setProductsError(null)
      try {
        const response = await api.listProducts(params)
        setCrops(response.results.map(toCrop))
        setTotal(response.count)
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : "Unable to load marketplace listings.")
        setCrops([])
        setTotal(0)
      } finally {
        setProductsLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [query, category, sort])

  // Load consumer wishlist & cart
  const loadMemberData = async () => {
    const [wishResponse, cartResponse] = await Promise.all([api.wishlist(), api.cart()])
    const wishItems = Array.isArray(wishResponse) ? wishResponse : wishResponse.results ?? []
    setWishlist(new Set(wishItems.map((item) => String(item.product))))
    setCart(cartResponse.items.map((item) => ({ crop: toCrop(item.product_details), qty: item.quantity, itemId: item.id })))
  }

  useEffect(() => {
    if (!isAuthenticated || role !== "consumer") return
    loadMemberData().catch(() => setToast("Unable to load your saved items."))
  }, [isAuthenticated, role])

  const toggleWish = async (id: string) => {
    if (!isAuthenticated) return navigate(`/login?next=${encodeURIComponent("/products")}`)
    try {
      const response = await api.toggleWishlist(token, Number(id))
      setWishlist((previous) => {
        const next = new Set(previous)
        response.status === "added" ? next.add(id) : next.delete(id)
        return next
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update wishlist")
    }
  }

  const addToCart = async (id: string) => {
    if (!isAuthenticated) return navigate(`/login?next=${encodeURIComponent("/products")}`)
    if (role !== "consumer") return setToast("Only consumer accounts can add products to a cart.")
    try {
      await api.addCartItem(token, Number(id))
      const updatedCart = await api.cart(token)
      setCart(updatedCart.items.map((item) => ({ crop: toCrop(item.product_details), qty: item.quantity, itemId: item.id })))
      const crop = crops.find((item) => item.id === id)
      if (crop) setToast(crop.name + " added to cart")
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update cart")
    }
  }

  const setQty = async (id: string, qty: number) => {
    const item = cart.find((entry) => entry.crop.id === id)
    if (!isAuthenticated || !item) return
    try {
      if (qty <= 0) await api.deleteCartItem(token, item.itemId)
      else await api.updateCartItem(token, item.itemId, qty)
      const updatedCart: ApiCart = await api.cart(token)
      setCart(updatedCart.items.map((entry) => ({ crop: toCrop(entry.product_details), qty: entry.quantity, itemId: entry.id })))
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update cart")
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.crop.price * item.qty, 0)

  const currentPathname = path.split("?")[0].split("#")[0]
  const isMarketplace = currentPathname === "/products"

  useEffect(() => {
    if (isLoading) return
    if (isMarketplace) {
      if (!isAuthenticated) {
        setToast("Please log in as a Consumer to access the Marketplace.")
        navigate(`/login?next=${encodeURIComponent("/products")}`)
      } else if (role !== "consumer") {
        setToast("Marketplace is only accessible to Consumer accounts.")
        if (role === "farmer") navigate("/farmer/dashboard")
        else if (role === "admin") navigate("/admin/dashboard")
        else navigate("/")
      }
    }
  }, [currentPathname, isAuthenticated, role, isLoading])

  const handleExploreMarketplace = () => {
    if (!isAuthenticated) {
      setToast("Please log in as a Consumer to access the Marketplace.")
      navigate(`/login?next=${encodeURIComponent("/products")}`)
    } else if (role !== "consumer") {
      setToast("Marketplace is only accessible to Consumer accounts.")
      if (role === "farmer") navigate("/farmer/dashboard")
      else if (role === "admin") navigate("/admin/dashboard")
      else navigate("/")
    } else {
      navigate("/products")
    }
  }

  const handleStartSelling = () => {
    if (!isAuthenticated) {
      setToast("Please log in as a Farmer to access Farmer Dashboard.")
      navigate(`/login?next=${encodeURIComponent("/farmer/dashboard")}`)
    } else if (role !== "farmer") {
      setToast("Farmer Dashboard is available for Farmer accounts.")
      navigate("/farmer/dashboard")
    } else {
      navigate("/farmer/dashboard")
    }
  }

  const handleTryCropRecommendation = () => {
    if (!isAuthenticated) {
      setToast("Please log in as a Farmer to access Crop Recommendation.")
      navigate(`/login?next=${encodeURIComponent("/ai-predict")}`)
    } else if (role !== "farmer") {
      setToast("Crop Recommendation is only available for Farmer accounts.")
    } else {
      navigate("/ai-predict")
    }
  }

  const handleTryPricePrediction = () => {
    if (!isAuthenticated) {
      setToast("Please log in as a Farmer to access Price Prediction.")
      navigate(`/login?next=${encodeURIComponent("/ai-predict")}`)
    } else if (role !== "farmer") {
      setToast("Price Prediction is only available for Farmer accounts.")
    } else {
      navigate("/ai-predict")
    }
  }

  const getMarketplaceCtaLabel = () => {
    if (!isAuthenticated) return "Explore Marketplace"
    if (role === "consumer" || role === "admin") return "Open Marketplace"
    return "Go to Farmer Dashboard"
  }

  const getCropRecCtaLabel = () => {
    if (!isAuthenticated) return "Try Crop Recommendation"
    if (role === "farmer") return "Open Crop Recommendation"
    return "Farmer Only Feature (Restricted)"
  }

  const getPricePredCtaLabel = () => {
    if (!isAuthenticated) return "Try Price Prediction"
    if (role === "farmer") return "Open Price Prediction"
    return "Farmer Only Feature (Restricted)"
  }

  if (currentPathname === "/privacy") return <LegalPage kind="privacy" />
  if (currentPathname === "/terms") return <LegalPage kind="terms" />
  if (currentPathname !== "/unauthorized" && currentPathname !== "/login" && currentPathname !== "/register" && currentPathname !== "/signup" && currentPathname !== "/forgot-password" && currentPathname !== "/" && currentPathname !== "/products" && currentPathname !== "/marketplace-info" && currentPathname !== "/crop-recommendation-info" && currentPathname !== "/price-prediction-info" && !currentPathname.match(/^\/products\/\d+$/) && !Object.prototype.hasOwnProperty.call({"/farmer/dashboard": 1, "/farmer/products": 1, "/farmer/products/new": 1, "/farmer/orders": 1, "/consumer/dashboard": 1, "/consumer-dashboard": 1, "/orders": 1, "/wishlist": 1, "/cart": 1, "/profile": 1, "/ai-predict": 1, "/admin/dashboard": 1, "/admin/users": 1, "/admin/products": 1}, currentPathname)) return <NotFoundPage />

  const pageTitle = currentPathname === "/products" ? "Marketplace" : currentPathname === "/" ? "AI-powered agricultural marketplace" : "Agricultural tools and insights"

  // Unauthorized page
  if (currentPathname === "/unauthorized") return <UnauthorizedPage />

  // Auth pages (no nav/footer)
  if (currentPathname === "/login" || currentPathname === "/register" || currentPathname === "/signup") {
    return (
      <AuthPage
        mode={currentPathname === "/login" ? "login" : "signup"}
        onSwitch={(v) => navigate(v === "login" ? "/login" : "/signup")}
        onBack={() => navigate("/")}
      />
    )
  }

  // Forgot password (no nav/footer)
  if (currentPathname === "/forgot-password") return <ForgotPasswordPage />

  // Product detail page
  const productMatch = currentPathname.match(/^\/products\/(\d+)$/)
  if (productMatch) {
    const productId = Number(productMatch[1])
    return (
      <div className="min-h-screen bg-cream text-charcoal font-sans">
        <Nav
          cartCount={cartCount}
          wishCount={wishlist.size}
          onCart={() => setCartOpen(true)}
          onNavigate={navigate}
          user={user}
          role={role}
          onLogout={() => { logout(); navigate("/") }}
        />
        <ProductDetailPage productId={productId} onNavigate={navigate} />
        <Footer />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} subtotal={subtotal} setQty={setQty} />
        <Toast message={toast} />
      </div>
    )
  }

  // Protected page routes
  const protectedRoutes: Record<string, { component: React.ReactNode; role?: Role; withLayout?: boolean }> = {
    "/farmer/dashboard": { component: <FarmerDashboardPage onNavigate={navigate} />, role: "farmer" },
    "/farmer/products": { component: <FarmerProductsPage onNavigate={navigate} />, role: "farmer" },
    "/farmer/products/new": { component: <FarmerProductsPage onNavigate={navigate} />, role: "farmer" },
    "/farmer/orders": { component: <FarmerOrdersPage onNavigate={navigate} />, role: "farmer" },
    "/consumer/dashboard": { component: <ConsumerDashboardPage onNavigate={navigate} />, role: "consumer" },
    "/consumer-dashboard": { component: <ConsumerDashboardPage onNavigate={navigate} />, role: "consumer" },
    "/orders": { component: <ConsumerOrdersPage onNavigate={navigate} />, role: "consumer" },
    "/wishlist": { component: <WishlistPage onNavigate={navigate} />, role: "consumer" },
    "/cart": { component: <CartPage onNavigate={navigate} />, role: "consumer" },
    "/profile": { component: <ProfilePage /> },
    "/ai-predict": { component: <AIPredictionPage /> },
    "/admin/dashboard": { component: <AdminDashboardPage onNavigate={navigate} />, role: "admin" },
    "/admin/users": { component: <AdminUsersPage onNavigate={navigate} />, role: "admin" },
    "/admin/products": { component: <AdminProductsPage onNavigate={navigate} />, role: "admin" },
  }

  const guardedRoute = protectedRoutes[currentPathname]
  if (guardedRoute) {
    const page = (
      <div className="min-h-screen bg-cream text-charcoal font-sans">
        <Nav
          cartCount={cartCount}
          wishCount={wishlist.size}
          onCart={() => setCartOpen(true)}
          onNavigate={navigate}
          user={user}
          role={role}
          onLogout={() => { logout(); navigate("/") }}
        />
        {guardedRoute.component}
        <Footer />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} subtotal={subtotal} setQty={setQty} />
        <Toast message={toast} />
      </div>
    )
    if (guardedRoute.role) {
      return <RoleRoute role={guardedRoute.role}>{page}</RoleRoute>
    }
    return <ProtectedRoute>{page}</ProtectedRoute>
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal font-sans">
      <SiteMetadata title={pageTitle} description="An AI-powered agricultural marketplace connecting farmers and buyers with fair prices, secure transactions, and practical insights." path={currentPathname} />
      <Nav
        cartCount={cartCount}
        wishCount={wishlist.size}
        onCart={() => setCartOpen(true)}
        onNavigate={navigate}
        onToast={setToast}
        user={user}
        role={role}
        onLogout={() => { logout(); navigate("/") }}
      />

      {currentPathname === "/marketplace-info" ? (
        <MarketplaceInfoSection
          onExplore={handleExploreMarketplace}
          onStartSelling={handleStartSelling}
          onNavigate={navigate}
          ctaLabel={getMarketplaceCtaLabel()}
          isStandalone={true}
        />
      ) : currentPathname === "/crop-recommendation-info" ? (
        <CropRecommendationInfoSection
          onTry={handleTryCropRecommendation}
          onNavigate={navigate}
          ctaLabel={getCropRecCtaLabel()}
          isStandalone={true}
        />
      ) : currentPathname === "/price-prediction-info" ? (
        <PricePredictionInfoSection
          onTry={handleTryPricePrediction}
          onNavigate={navigate}
          ctaLabel={getPricePredCtaLabel()}
          isStandalone={true}
        />
      ) : isMarketplace && isAuthenticated && role === "consumer" ? (
        <Marketplace
          crops={crops}
          total={total}
          loading={productsLoading}
          error={productsError}
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          sort={sort}
          setSort={setSort}
          wishlist={wishlist}
          toggleWish={toggleWish}
          cart={Object.fromEntries(cart.map((item) => [item.crop.id, item.qty]))}
          addToCart={addToCart}
          onNavigate={navigate}
          clearFilters={() => {
            setQuery("")
            setCategory("All")
            setSort("relevance")
          }}
        />
      ) : (
        <>
          <Hero onExplore={handleExploreMarketplace} />

          <Trust />
          <section className="mx-auto max-w-6xl px-6 py-20">
  <div className="mb-10 max-w-2xl">
    <p className="text-sm font-medium text-green-700">
      SIMPLE. SMART. FARMER-FIRST.
    </p>

    <h2 className="mt-3 text-3xl font-serif text-gray-900 md:text-4xl">
      Everything you need to sell smarter.
    </h2>

    <p className="mt-4 text-gray-600">
      Make better farming decisions, understand market prices,
      and connect with buyers through one simple platform.
    </p>
  </div>

  <div className="grid gap-5 md:grid-cols-3">
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-medium text-gray-900">
        Choose Better Crops
      </h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Get AI-based crop insights to support better farming decisions.
      </p>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-medium text-gray-900">
        Know the Price
      </h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Understand expected market prices before deciding when to sell.
      </p>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-medium text-gray-900">
        Reach Buyers
      </h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        List your produce and connect with consumers through the marketplace.
      </p>
    </div>
  </div>
</section>
        </>
      )}

      <Footer />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        subtotal={subtotal}
        setQty={setQty}
      />

      <Toast message={toast} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Navigation
// ----------------------------------------------------------------------------

function Nav({
  cartCount,
  wishCount,
  onCart,
  onNavigate,
  onToast,
  user,
  role,
  onLogout,
}: {
  cartCount: number
  wishCount: number
  onCart: () => void
  onNavigate: (path: string) => void
  onToast?: (msg: string) => void
  user: { username: string } | null
  role: Role | null
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const [companyHover, setCompanyHover] = useState(false)
  const [contactHover, setContactHover] = useState(false)

  const go = (path: string) => {
    onNavigate(path)
    setOpen(false)
    setCompanyHover(false)
    setContactHover(false)
  }

  const handleMarketplaceClick = () => {
    if (!user) {
      onToast?.("Please log in as a Consumer to access the Marketplace.")
      go(`/login?next=${encodeURIComponent("/products")}`)
    } else if (role !== "consumer") {
      onToast?.("Marketplace is only accessible to Consumer accounts.")
      if (role === "farmer") go("/farmer/dashboard")
      else if (role === "admin") go("/admin/dashboard")
    } else {
      go("/products")
    }
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    } else {
      onNavigate("/#" + id)
    }
    setOpen(false)
    setCompanyHover(false)
    setContactHover(false)
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    >
      <div className="nav-pill mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-cream/70 px-4 shadow-[0_8px_30px_-12px_rgba(28,28,24,0.2)] backdrop-blur-md sm:px-6">
        {/* Brand Logo & Responsive Home Button */}
        <button
          onClick={() => go("/")}
          className="flex items-center gap-2 pl-1 transition-transform hover:scale-[1.02] active:scale-95"
          title="Go to Home"
        >
          <span className="font-display text-2xl font-bold tracking-tight text-charcoal">
            <span className="font-kannada">ನೇಗಿಲು</span>
            <span className="text-forest-500">ai</span>
          </span>
        </button>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:flex">
          {/* How It Works */}
          <button
            onClick={() => scrollToSection("about")}
            className="text-[13px] font-bold uppercase tracking-wider text-charcoal/80 transition-colors hover:text-forest"
          >
            How It Works
          </button>

          {/* Company Hover Dropdown with Animated Opening */}
          <div
            className="relative"
            onMouseEnter={() => setCompanyHover(true)}
            onMouseLeave={() => setCompanyHover(false)}
          >
            <button
              onClick={() => scrollToSection("about")}
              className="flex items-center gap-1 py-2 text-[13px] font-bold uppercase tracking-wider text-charcoal/80 transition-colors hover:text-forest"
            >
              Company
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                  companyHover ? "rotate-180 text-forest" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {companyHover && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ type: "spring", damping: 22, stiffness: 320 }}
                  className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                >
                  <div className="w-64 rounded-2xl border border-charcoal/10 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03, duration: 0.2 }}
                      onClick={() => scrollToSection("about")}
                      className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-forest/8"
                    >
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                      <div>
                        <div className="text-xs font-bold text-charcoal">About Us</div>
                        <div className="text-[11px] text-charcoal/60">Our mission for Bharat's farmers</div>
                      </div>
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06, duration: 0.2 }}
                      onClick={() => scrollToSection("ai")}
                      className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-forest/8"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-harvest" />
                      <div>
                        <div className="text-xs font-bold text-charcoal">AI Technology</div>
                        <div className="text-[11px] text-charcoal/60">Mandi price prediction models</div>
                      </div>
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.09, duration: 0.2 }}
                      onClick={() => scrollToSection("farmers")}
                      className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-forest/8"
                    >
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                      <div>
                        <div className="text-xs font-bold text-charcoal">Trust & Security</div>
                        <div className="text-[11px] text-charcoal/60">KYC & verified trade lineage</div>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contact Us Hover Popup with Animated Opening */}
          <div
            className="relative"
            onMouseEnter={() => setContactHover(true)}
            onMouseLeave={() => setContactHover(false)}
          >
            <button
              onClick={() => scrollToSection("footer")}
              className="text-[13px] font-bold uppercase tracking-wider text-charcoal/80 transition-colors hover:text-forest"
            >
              Contact Us
            </button>

            <AnimatePresence>
              {contactHover && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ type: "spring", damping: 22, stiffness: 320 }}
                  className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                >
                  <div className="w-56 rounded-2xl border border-charcoal/10 bg-white/95 p-3.5 text-center shadow-2xl backdrop-blur-xl">
                    <div className="mb-1.5 flex justify-center text-forest">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-bold text-charcoal">24/7 Farmer Support</div>
                    <div className="mt-1 text-xs font-semibold text-forest">1800-NEGILU-AI</div>
                    <div className="mt-1 text-[11px] text-charcoal/60">support@negilu.ai</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2.5">
          {user && role === "consumer" && (
            <button
              onClick={() => go("/wishlist")}
              className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-charcoal/70 transition-colors hover:bg-charcoal/5 sm:flex"
              title="Wishlist"
            >
              <Heart className="h-[18px] w-[18px] text-clay" />
              {wishCount > 0 && <span className="font-mono text-xs font-bold text-clay">{wishCount}</span>}
            </button>
          )}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() =>
                  go(
                    role === "farmer"
                      ? "/farmer/dashboard"
                      : role === "admin"
                      ? "/admin/dashboard"
                      : "/consumer/dashboard"
                  )
                }
                className="flex h-10 items-center gap-1.5 rounded-full bg-forest/10 px-4 text-xs font-bold uppercase tracking-wider text-forest transition-colors hover:bg-forest/20"
              >
                Dashboard ({role})
              </button>
              <button
                onClick={onLogout}
                className="flex h-10 items-center rounded-full px-3 text-sm font-semibold text-charcoal/75 transition-colors hover:text-forest"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => go("/login")}
                className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-charcoal/80 transition-colors hover:text-forest md:flex"
              >
                Log in
              </button>
              <button
                onClick={() => go("/register")}
                className="hidden h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream shadow-md transition-colors hover:bg-forest-600 sm:flex"
              >
                Sign up
              </button>
            </div>
          )}

          {/* Cart Icon Button — ONLY visible when Consumer is logged in */}
          {user && role === "consumer" && (
            <button
              onClick={onCart}
              className="relative flex h-10 items-center gap-2 rounded-full border border-charcoal/20 bg-cream/70 px-4 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
              title="Shopping Cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-harvest px-1 font-mono text-[11px] font-bold text-forest">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/20 text-charcoal transition-colors hover:border-forest hover:text-forest lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer with Staggered Spring Reveal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="mx-auto mt-2 max-w-7xl space-y-1 rounded-2xl border border-charcoal/10 bg-cream/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            {[
              { label: "How It Works", action: () => scrollToSection("about") },
              { label: "Company (About Us)", action: () => scrollToSection("about") },
              { label: "Contact Us", action: () => scrollToSection("footer") },
            ].map((item, idx) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                onClick={item.action}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-charcoal/80 transition-colors hover:bg-forest/8 hover:text-forest"
              >
                {item.label}
              </motion.button>
            ))}

            {!user ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 grid grid-cols-2 gap-2 border-t border-charcoal/10 pt-3"
              >
                <button
                  onClick={() => go("/login")}
                  className="rounded-full border border-charcoal/15 py-2.5 text-center text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
                >
                  Log in
                </button>
                <button
                  onClick={() => go("/register")}
                  className="rounded-full bg-forest py-2.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-forest-600"
                >
                  Sign up
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 space-y-2 border-t border-charcoal/10 pt-3"
              >
                <button
                  onClick={() =>
                    go(
                      role === "farmer"
                        ? "/farmer/dashboard"
                        : role === "admin"
                        ? "/admin/dashboard"
                        : "/consumer/dashboard"
                    )
                  }
                  className="block w-full rounded-full bg-forest/10 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-forest"
                >
                  Dashboard ({role})
                </button>
                <button
                  onClick={onLogout}
                  className="block w-full rounded-full py-2 text-center text-sm font-semibold text-charcoal/70 hover:text-forest"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

// Small Indian-motif flourish echoing Sarvam's ornamental divider.
function Flourish() {
  return (
    <svg
      width="150"
      height="26"
      viewBox="0 0 150 26"
      fill="none"
      className="text-cream/90"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" fill="none">
        <path d="M75 13 C60 13 55 5 42 8 C33 10 30 18 38 20 C44 21 46 15 42 13 C38 11 32 14 30 13" />
        <path d="M75 13 C90 13 95 5 108 8 C117 10 120 18 112 20 C106 21 104 15 108 13 C112 11 118 14 120 13" />
      </g>
      <circle cx="75" cy="13" r="2.4" fill="currentColor" />
    </svg>
  )
}

// ----------------------------------------------------------------------------
// Hero
// ----------------------------------------------------------------------------

function Hero({ onExplore }: { onExplore?: () => void }) {
  return (
    <section className="hero-bloom relative -mt-[88px] overflow-hidden pt-[88px]">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-28 text-center sm:pt-32">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex justify-center">
          <Flourish />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="mt-6 flex items-center gap-4">
          <span className="hidden h-px w-16 bg-forest/30 sm:block" />
          <span className="font-sans text-[45px] font-semibold text-forest-600">Built for Farmers, Not for Brokers</span>
          <span className="hidden h-px w-16 bg-forest/30 sm:block" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight text-charcoal sm:text-7xl lg:text-8xl">
          AI for every
          <br />
          farm in Karnataka
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-7 max-w-xl text-xl font-medium leading-snug text-charcoal/70">
          Built for Karnataka&rsquo;s farmers. Powered by AI price intelligence. Delivering fair markets at population scale.
        </motion.p>

      </div>
    </section>
  )
}

// Helper: Back To Home Button
function BackToHomeButton({ onNavigate }: { onNavigate?: (path: string) => void }) {
  if (!onNavigate) return null
  return (
    <div className="mb-8 flex items-center">
      <button
        onClick={() => onNavigate("/")}
        className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-charcoal/80 transition-colors hover:border-forest hover:bg-white hover:text-forest"
      >
        <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to Home
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 1. Marketplace Info Section
// ----------------------------------------------------------------------------

function MarketplaceInfoSection({
  onExplore,
  onStartSelling,
  onNavigate,
  ctaLabel = "Explore Marketplace",
  isStandalone = false,
}: {
  onExplore: () => void
  onStartSelling?: () => void
  onNavigate?: (path: string) => void
  ctaLabel?: string
  isStandalone?: boolean
}) {
  const scrollToWorkflow = () => {
    const el = document.getElementById("marketplace-workflow")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      id="marketplace-info"
      className="border-b border-charcoal/10 bg-cream py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {isStandalone && <BackToHomeButton onNavigate={onNavigate} />}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-forest-500">
              Feature Overview · Marketplace
            </div>
            <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">
              Connect Farmers with Buyers
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-charcoal/70">
              ನೇಗಿಲುai provides a direct, transparent agricultural marketplace where farmers list their harvest with verified quality details, and consumers & institutional buyers discover, purchase, and settle transactions transparently.
            </p>

            {/* Who Can Access Grid */}
            <div className="mt-8 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Who Can Access Actual Marketplace?</h4>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-charcoal/10 bg-sand-200/60 p-4">
                  <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-forest">
                    <Check className="h-4 w-4" /> Consumers
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-charcoal/65">
                    Full access to browse verified crops & purchase direct.
                  </p>
                </div>
                <div className="rounded-2xl border border-clay/20 bg-clay/5 p-4">
                  <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-clay">
                    <X className="h-4 w-4" /> Farmers
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-charcoal/65">
                    Role restricted. Produce listed & managed via Farmer Dashboard.
                  </p>
                </div>
                <div className="rounded-2xl border border-charcoal/10 bg-sand-200/60 p-4">
                  <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-forest">
                    <Check className="h-4 w-4" /> Admin
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-charcoal/65">
                    Oversee transactions & verify farm credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Fully Responsive) */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                onClick={onExplore}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-8 py-3.5 text-sm font-semibold text-cream shadow-md transition-colors hover:bg-forest-600 active:scale-95"
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </button>

              {onStartSelling && (
                <button
                  onClick={onStartSelling}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-forest/30 bg-forest/8 px-6 py-3.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/15 active:scale-95"
                >
                  Start Selling <Plus className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={scrollToWorkflow}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/15 bg-transparent px-6 py-3.5 text-sm font-semibold text-charcoal/80 transition-colors hover:border-forest hover:text-forest active:scale-95"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* 4-Step Visual Workflow */}
          <div id="marketplace-workflow" className="space-y-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-charcoal/50">
              How Marketplace Works
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                onClick={onStartSelling || onExplore}
                className="group cursor-pointer rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm transition-all hover:border-forest/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest">STEP 01</span>
                  <ArrowUpRight className="h-4 w-4 text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest" />
                </div>
                <h4 className="mt-2 font-display text-base font-bold text-charcoal">Farmer Lists Crop</h4>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/65">
                  Farmer adds harvest details, available quantity, region, and unit price.
                </p>
              </div>

              <div
                onClick={onExplore}
                className="group cursor-pointer rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm transition-all hover:border-forest/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest">STEP 02</span>
                  <ArrowUpRight className="h-4 w-4 text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest" />
                </div>
                <h4 className="mt-2 font-display text-base font-bold text-charcoal">Live Listing</h4>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/65">
                  Listing becomes visible across Bharat with verified farmer badges.
                </p>
              </div>

              <div
                onClick={onExplore}
                className="group cursor-pointer rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm transition-all hover:border-forest/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest">STEP 03</span>
                  <ArrowUpRight className="h-4 w-4 text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest" />
                </div>
                <h4 className="mt-2 font-display text-base font-bold text-charcoal">Buyer Purchases</h4>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/65">
                  Consumers browse available crops, inspect ratings, and order.
                </p>
              </div>

              <div
                onClick={onExplore}
                className="group cursor-pointer rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm transition-all hover:border-forest/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest">STEP 04</span>
                  <ArrowUpRight className="h-4 w-4 text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest" />
                </div>
                <h4 className="mt-2 font-display text-base font-bold text-charcoal">Instant Settlement</h4>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/65">
                  Produce ships via cold chain with instant payment settled via Razorpay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ----------------------------------------------------------------------------
// 2. Crop Recommendation Info Section
// ----------------------------------------------------------------------------

function CropRecommendationInfoSection({
  onTry,
  onNavigate,
  ctaLabel = "Try Crop Recommendation",
  isStandalone = false,
}: {
  onTry: () => void
  onNavigate?: (path: string) => void
  ctaLabel?: string
  isStandalone?: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      id="crop-recommendation-info"
      className="border-b border-charcoal/10 bg-sand-200/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {isStandalone && <BackToHomeButton onNavigate={onNavigate} />}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left Column: Info & Workflow */}
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-harvest-600">
              AI Advisory · Farmer Exclusive
            </div>
            <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">
              Choose the Right Crop with AI
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-charcoal/70">
              ನೇಗಿಲುai uses agricultural variables and market demand metrics to recommend optimal crops for your land, helping farmers increase yield and maximize net profits.
            </p>

            {/* Workflow Stepper */}
            <div className="mt-8 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal/50">How It Works</h4>
              <div className="flex flex-col gap-2 rounded-2xl border border-charcoal/10 bg-white/90 p-4 text-xs font-medium text-charcoal/80 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-[10px] font-bold text-cream">1</span>
                  <span>Farmer enters Location, Soil profile, and Season</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-[10px] font-bold text-cream">2</span>
                  <span>ನೇಗಿಲುai system processes input data</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-[10px] font-bold text-cream">3</span>
                  <span>AI/ML recommendation system analyzes parameters</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-[10px] font-bold text-cream">4</span>
                  <span>Suitable crop recommendations & sowing guidance displayed</span>
                </div>
              </div>
            </div>

            {/* Who Can Access */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-3 py-1 font-semibold text-forest">
                <Check className="h-3.5 w-3.5" /> Farmers (Full Access)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 font-semibold text-charcoal/60">
                Consumers (View Demo Only)
              </span>
            </div>

            <div className="mt-8">
              <button
                onClick={onTry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-8 py-3.5 text-sm font-semibold text-cream shadow-md transition-colors hover:bg-forest-600 active:scale-95"
              >
                {ctaLabel} <Sparkles className="h-4 w-4 text-harvest" />
              </button>
            </div>
          </div>

          {/* Right Column: Static Interactive Demo */}
          <div
            onClick={onTry}
            className="group cursor-pointer rounded-3xl border border-harvest/30 bg-gradient-to-br from-harvest-soft/40 via-white to-sand-200/50 p-6 shadow-xl transition-all hover:border-harvest/60 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-harvest-600" />
                <span className="font-serif text-lg font-semibold text-forest">Crop Recommendation Demo</span>
              </div>
              <span className="rounded-full bg-harvest/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-forest">
                Static Preview
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-4">
                <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal/50">Example Input</h5>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-sand/60 p-2">
                    <span className="block text-[10px] uppercase text-charcoal/50">Location</span>
                    <span className="font-semibold text-charcoal">Kolar, KA</span>
                  </div>
                  <div className="rounded-xl bg-sand/60 p-2">
                    <span className="block text-[10px] uppercase text-charcoal/50">Soil</span>
                    <span className="font-semibold text-charcoal">Red Loamy</span>
                  </div>
                  <div className="rounded-xl bg-sand/60 p-2">
                    <span className="block text-[10px] uppercase text-charcoal/50">Season</span>
                    <span className="font-semibold text-charcoal">Kharif</span>
                  </div>
                </div>
              </div>

              {/* Recommendation Output */}
              <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest">Recommended Crop</span>
                  <span className="rounded-full bg-leaf/20 px-2 py-0.5 font-mono text-[10px] font-bold text-forest">
                    94% Match
                  </span>
                </div>
                <p className="mt-1 font-serif text-xl font-bold text-forest">Finger Millet (Ragi)</p>
                <p className="mt-1 text-xs leading-relaxed text-charcoal/70">
                  Optimal moisture retention for Red Loamy soil with high regional Mandi demand score during Kharif harvest.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] italic text-charcoal/50">Recommendation generated based on inputs.</span>
                <span className="text-xs font-bold text-forest group-hover:underline">Try Feature →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ----------------------------------------------------------------------------
// 3. Price Prediction Info Section
// ----------------------------------------------------------------------------

function PricePredictionInfoSection({
  onTry,
  onNavigate,
  ctaLabel = "Try Price Prediction",
  isStandalone = false,
}: {
  onTry: () => void
  onNavigate?: (path: string) => void
  ctaLabel?: string
  isStandalone?: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      id="price-prediction-info"
      className="border-b border-charcoal/10 bg-cream py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {isStandalone && <BackToHomeButton onNavigate={onNavigate} />}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left Column: Static Price Demo Card */}
          <div
            onClick={onTry}
            className="group order-2 cursor-pointer rounded-3xl border border-forest/20 bg-forest p-6 text-cream shadow-xl transition-all hover:border-forest/40 lg:order-1 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-cream/15 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-harvest" />
                <span className="font-serif text-lg font-semibold text-cream">Price Prediction Demo</span>
              </div>
              <span className="rounded-full bg-harvest/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-harvest">
                Illustrative Example
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-cream/10 bg-forest-600/60 p-4">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-cream/60">Commodity</span>
                  <h5 className="font-serif text-xl font-bold text-cream">Tomato (Hybrid)</h5>
                  <p className="text-xs text-cream/70">Kolar Mandi · Karnataka</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-harvest">+12% Forecast</span>
                  <p className="font-display text-3xl font-bold text-harvest">
                    ₹32 <span className="text-xs font-normal text-cream/70">/ kg</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="flex justify-between text-xs text-cream/80">
                  <span>Model Confidence</span>
                  <span className="font-mono font-bold text-harvest">92% Accuracy Score</span>
                </div>
                <div className="h-2 w-full rounded-full bg-cream/20">
                  <div className="h-2 rounded-full bg-harvest" style={{ width: "92%" }} />
                </div>
                <div className="flex justify-between pt-1 text-[11px] text-cream/60">
                  <span>Forecast Range: ₹29 - ₹35 / kg</span>
                  <span>Peak Window: Days 10–14</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] italic text-cream/50">*Illustrative prediction example. Actual prices vary.</span>
                <span className="text-xs font-bold text-harvest group-hover:underline">Try Feature →</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Workflow */}
          <div className="order-1 lg:order-2">
            <div className="font-mono text-xs uppercase tracking-widest text-forest-500">
              Predictive Analytics · Farmer Exclusive
            </div>
            <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">
              Predict Market Prices Before You Sell
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-charcoal/70">
              ನೇಗಿಲುai uses machine learning models to analyze historical mandi arrivals and demand cycles to estimate upcoming crop prices, helping farmers make informed selling and planning decisions.
            </p>

            {/* Stepper Workflow */}
            <div className="mt-8 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal/50">How It Works</h4>
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-charcoal/10 bg-sand-200/50 p-4 text-xs font-medium text-charcoal/80">
                <div>1. Farmer enters required crop and market information</div>
                <div>2. System processes input parameters</div>
                <div>3. Machine Learning model analyzes historical & arrival data</div>
                <div>4. Predicted price & trend curve generated for decision support</div>
              </div>
            </div>

            {/* Who Can Access */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-3 py-1 font-semibold text-forest">
                <Check className="h-3.5 w-3.5" /> Farmers (Full Access)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-3 py-1 font-semibold text-charcoal/60">
                Consumers (View Demo Only)
              </span>
            </div>

            <div className="mt-8">
              <button
                onClick={onTry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-8 py-3.5 text-sm font-semibold text-cream shadow-md transition-colors hover:bg-forest-600 active:scale-95"
              >
                {ctaLabel} <TrendingUp className="h-4 w-4 text-harvest" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// Trust strip
function Trust() {
  const partners = ["Farmers",
    "Consumers",
    "Fresh Produce",
    "Fair Prices",
    "AI Insights",
    "Direct Markets",
    "Crop Intelligence",
    "Market Access",]
  return (
    <section className="border-b border-charcoal/10 bg-cream py-12">
      <p className="text-center font-sans text-xs font-bold tracking-[0.2em] text-charcoal/45">Karnataka grows with ನೇಗಿಲುai</p>
      <div className="marquee-viewport marquee-mask mt-8 overflow-hidden">
        <div className="marquee-track flex w-max items-center gap-16 pr-16">
          {[...partners, ...partners].map((p, i) => (
            <span key={p + i} className="whitespace-nowrap font-display text-2xl font-bold text-charcoal/35 transition-colors hover:text-forest">{p}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// About the platform
function About({ onExplore }: { onExplore: () => void }) {
  const pillars = [
    [ShieldCheck, "Verified, direct trade", "Every buyer is KYC + GST verified. Farmers deal directly — no commission agents skimming the margin, no opaque mandi cuts."],
    [Sparkles, "AI price intelligence", "Our models read mandi arrivals, weather, and demand to forecast prices four weeks out, so you know the exact right day to sell."],
    [IndianRupee, "Instant INR settlement", "Payments clear the moment produce ships, settled to your bank via Razorpay. No 30-day waits, no bounced cheques."],
    [Truck, "Karnataka cold chain", "Partnered logistics move your harvest fresh from farm to buyer across 400+ districts, with full temperature-tracked lineage."],
  ] as const
  return (
    <section id="about" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <div className="font-mono text-xs uppercase tracking-widest text-forest-500">What we do</div>
          <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">A fair market, built for Bharat&rsquo;s farmers.</h2>
          <p className="mt-6 text-lg leading-relaxed text-charcoal/70">ನೇಗಿಲುai removes the middlemen that have quietly eaten into farmer earnings for generations. We connect the person who grows the food directly to the person who buys it — and put an AI price engine between them so both sides trade on real numbers, not guesswork.</p>
          <p className="mt-4 text-lg leading-relaxed text-charcoal/70">From a smallholder in Kolar to an exporter in Nashik, every listing is transparent, every payment is instant, and every price is backed by data.</p>
          <button onClick={onExplore} className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-forest-600">See it in action <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {pillars.map(([Icon, title, body], i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: (i % 2) * 0.08 }} className="rounded-2xl border border-charcoal/10 bg-sand-200/50 p-6 transition-colors hover:border-forest/30">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest text-cream"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-charcoal">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="mt-20 grid grid-cols-2 gap-6 border-t border-charcoal/10 pt-12 lg:grid-cols-4">
        {[["12 lakh+", "Farmers onboarded"], ["400+", "Districts served"], ["₹0", "Commission charged"], ["94%", "Forecast accuracy"]].map(([stat, label]) => (
          <div key={label}><div className="font-serif text-4xl font-light text-forest sm:text-5xl">{stat}</div><div className="mt-2 text-sm text-charcoal/60">{label}</div></div>
        ))}
      </div>
    </section>
  )
}

// Marketplace
function Marketplace({
  crops, total, loading, error, query, setQuery, category, setCategory, sort, setSort, wishlist, toggleWish, cart, addToCart, onNavigate, clearFilters,
}: {
  crops: Crop[]; total: number; loading: boolean; error: string | null; query: string; setQuery: (v: string) => void
  category: (typeof CATEGORIES)[number]; setCategory: (v: (typeof CATEGORIES)[number]) => void; sort: SortKey; setSort: (v: SortKey) => void
  wishlist: Set<string>; toggleWish: (id: string) => void; cart: Record<string, number>; addToCart: (id: string) => void; onNavigate: (path: string) => void; clearFilters: () => void
}) {
  return (
    <section id="market" className="mx-auto max-w-7xl px-6 pb-24 pt-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-forest-500">Marketplace · Today&rsquo;s harvest</div>
          <h2 className="mt-2 max-w-lg font-display text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">Fresh from the farm, priced by the market.</h2>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search crop, farmer, or region…" className="w-full rounded-full border border-charcoal/15 bg-cream py-3 pl-11 pr-10 text-sm outline-none transition-colors placeholder:text-charcoal/40 focus:border-forest" />
          {query && (<button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"><X className="h-4 w-4" /></button>)}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-4 border-b border-charcoal/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (<button key={c} onClick={() => setCategory(c)} className={"rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " + (category === c ? "border-forest bg-forest text-cream" : "border-charcoal/15 text-charcoal/70 hover:border-forest hover:text-forest")}>{c}</button>))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="sort" className="whitespace-nowrap text-charcoal/50">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-full border border-charcoal/15 bg-cream py-1.5 pl-3 pr-8 font-medium text-charcoal outline-none transition-colors hover:border-forest focus:border-forest">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (<option key={k} value={k}>{SORT_LABELS[k]}</option>))}
          </select>
        </div>
      </div>
      <p className="mt-5 text-sm text-charcoal/55">Showing <span className="font-semibold text-charcoal">{crops.length}</span> of {total} listings{category !== "All" && <> in <span className="font-semibold text-charcoal">{category}</span></>}</p>
      {loading ? (
        <div className="mt-10 flex justify-center py-20 text-sm font-medium text-charcoal/60"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading today&rsquo;s harvest…</div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-clay/30 bg-sand-200/50 px-6 py-8 text-center text-sm text-charcoal/70">{error}</div>
      ) : crops.length === 0 ? (
        <MarketplaceEmpty onClear={clearFilters} />
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {crops.map((crop, i) => (<CropCard key={crop.id} crop={crop} index={i} wished={wishlist.has(crop.id)} onWish={() => toggleWish(crop.id)} inCart={cart[crop.id] ?? 0} onAdd={() => addToCart(crop.id)} onNavigate={onNavigate} />))}
        </div>
      )}
    </section>
  )
}

function CropCard({ crop, index, wished, onWish, inCart, onAdd, onNavigate }: { crop: Crop; index: number; wished: boolean; onWish: () => void; inCart: number; onAdd: () => void; onNavigate: (path: string) => void }) {
  const up = crop.trend >= 0
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: (index % 4) * 0.06 }} className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand cursor-pointer" onClick={() => onNavigate(`/products/${crop.id}`)}>
        <img src={crop.image} alt={crop.name + " — " + crop.variety} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        {crop.organic && (<span className="absolute left-3 top-3 rounded-full bg-cream/85 px-2.5 py-1 text-[11px] font-semibold text-forest backdrop-blur">Organic</span>)}
        <button onClick={(e) => { e.stopPropagation(); onWish() }} aria-label="Toggle wishlist" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream/80 backdrop-blur transition-colors hover:bg-cream">
          <Heart className={"h-[18px] w-[18px] transition-colors " + (wished ? "fill-clay text-clay" : "text-charcoal/60")} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onAdd() }} className={"absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold backdrop-blur transition-all duration-300 " + (inCart > 0 ? "bg-forest text-cream opacity-100" : "bg-cream/90 text-forest opacity-0 group-hover:opacity-100")}>
          {inCart > 0 ? (<><ShoppingBag className="h-4 w-4" /> In cart · {inCart}</>) : (<><Plus className="h-4 w-4" /> Add to cart</>)}
        </button>
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[17px] font-bold leading-tight text-charcoal cursor-pointer hover:text-forest transition-colors" onClick={() => onNavigate(`/products/${crop.id}`)}>{crop.name}</h3>
        <div className="shrink-0 font-mono text-base font-semibold text-forest">{inr(crop.price)}<span className="text-xs font-normal text-charcoal/45">/{crop.unit}</span></div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-charcoal/50">
        <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{crop.farmer} · {crop.location}</span>
        <span className={"flex shrink-0 items-center gap-0.5 font-medium " + (up ? "text-forest-500" : "text-clay")}>{up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{up ? "+" : ""}{crop.trend}%</span>
      </div>
    </motion.div>
  )
}

function MarketplaceEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/20 bg-sand-200/50 px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-forest/10 text-forest"><Search className="h-6 w-6" /></div>
      <h3 className="mt-4 font-display text-xl font-bold text-charcoal">No harvest matches that search</h3>
      <p className="mt-1 max-w-sm text-sm text-charcoal/60">Try a different crop, region, or clear your filters to see everything available on the mandi today.</p>
      <button onClick={onClear} className="mt-5 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest-600">Clear filters</button>
    </div>
  )
}

// AI Price Engine
function AIPrice() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(0)
  const chartHeight = 256

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setChartWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section id="ai" className="border-y border-forest-600/40 bg-forest text-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-xs font-medium text-harvest-soft"><Sparkles className="h-3.5 w-3.5" /> ನೇಗಿಲುai Price Engine</div>
          <h2 className="mt-6 font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">Know the best day to sell — before the mandi does.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-cream/70">Our models blend mandi arrivals, weather, and demand signals to forecast crop prices four weeks ahead, with a clear confidence band on every prediction.</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-cream/15 bg-cream/5 p-4">
              <div className="font-mono text-xs uppercase tracking-widest text-harvest-soft">Recommendation</div>
              <div className="mt-2 font-display text-2xl font-bold">Hold 3 wks</div>
              <div className="text-xs text-cream/60">Projected +11% upside on Basmati</div>
            </div>
            <div className="rounded-xl border border-cream/15 bg-cream/5 p-4">
              <div className="font-mono text-xs uppercase tracking-widest text-harvest-soft">Confidence</div>
              <div className="mt-2 flex items-baseline gap-2"><span className="font-display text-2xl font-bold">High</span><span className="font-mono text-sm text-cream/60">94%</span></div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream/15"><div className="h-full w-[94%] rounded-full bg-harvest" /></div>
            </div>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-cream/15 bg-cream/[0.04] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-bold">Basmati Rice · Pusa 1121</div>
              <div className="text-xs text-cream/55">Karnal mandi · ₹/kg forecast</div>
            </div>
            <div className="rounded-full bg-harvest/20 px-3 py-1 font-mono text-sm font-semibold text-harvest-soft">₹91 in 4 wks</div>
          </div>
          <div ref={chartRef} className="mt-4 h-64 w-full">
            {chartWidth > 0 && (
              <AreaChart width={chartWidth} height={chartHeight} data={FORECAST} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a9b5f" stopOpacity={0.5} /><stop offset="100%" stopColor="#4a9b5f" stopOpacity={0} /></linearGradient>
                  <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8b930" stopOpacity={0.5} /><stop offset="100%" stopColor="#e8b930" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fill: "rgba(246,242,233,0.5)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(246,242,233,0.5)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[60, 100]} width={44} />
                <Tooltip cursor={{ stroke: "rgba(246,242,233,0.25)" }} contentStyle={{ background: "#14361f", border: "1px solid rgba(246,242,233,0.2)", borderRadius: 12, color: "#f6f2e9", fontSize: 12, fontFamily: "JetBrains Mono" }} formatter={(v) => [inr(Number(v)) + "/kg", "Price"]} />
                <ReferenceLine x="Now" stroke="rgba(246,242,233,0.4)" strokeDasharray="4 4" label={{ value: "today", fill: "rgba(246,242,233,0.5)", fontSize: 10, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="price" stroke="#7bc48c" strokeWidth={2.5} fill="url(#hist)" dot={false} activeDot={{ r: 4, fill: "#e8b930" }} />
              </AreaChart>
            )}
          </div>
          <div className="mt-3 flex items-center gap-5 text-xs text-cream/60">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-leaf" /> Historic</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-harvest" /> AI forecast</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// Testimonials
function Testimonials() {
  const quotes = [
    { quote: "I used to lose a third of my price to agents. On ನೇಗಿಲುai I sell straight to hotels in Bengaluru and get paid the same day.", name: "Harjeet Singh", role: "Rice farmer · Karnal, Haryana", img: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&h=120&fit=crop&auto=format" },
    { quote: "The AI forecast told me to hold my turmeric two weeks. Prices rose 11% — that call alone paid for my whole season.", name: "Lakshmi Nair", role: "Spice grower · Erode, Tamil Nadu", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format" },
    { quote: "As a buyer, traceability matters. Every crate comes with farm lineage and quality grades I can actually trust.", name: "Rohan Mehta", role: "Procurement lead · FreshCo Retail", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format" },
  ]
  return (
    <section className="border-y border-charcoal/10 bg-sand-200/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <div className="font-mono text-xs uppercase tracking-widest text-forest-500">Trusted across Bharat</div>
          <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-charcoal sm:text-5xl">Real farmers. Real earnings.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {quotes.map((t, i) => (
            <motion.figure key={t.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: i * 0.08 }} className="flex flex-col rounded-2xl border border-charcoal/10 bg-cream p-6">
              <blockquote className="flex-1 text-[15px] leading-relaxed text-charcoal/80">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-charcoal/10 pt-5">
                <img src={t.img} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-charcoal">{t.name}</div><div className="text-xs text-charcoal/55">{t.role}</div></div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// Farmer CTA
function FarmerCta({ onStartListing }: { onStartListing?: () => void }) {
  const steps = [
    ["01", "List your harvest", "Snap a photo, set your quantity — AI suggests a fair market price instantly."],
    ["02", "Match with buyers", "Verified buyers across Karnataka bid and order directly from your farm."],
    ["03", "Get paid, fast", "Razorpay settles to your account in INR the moment produce ships."],
  ]
  return (
    <section id="farmers" className="mx-auto max-w-7xl px-6 py-20">
      <div className="max-w-2xl">
        <div className="font-mono text-xs uppercase tracking-widest text-forest-500">For farmers</div>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">Sell smarter in three steps.</h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map(([n, title, body]) => (
          <div key={n} className="rounded-2xl border border-charcoal/10 bg-sand-200/60 p-6 transition-colors hover:border-forest/30">
            <div className="font-mono text-sm font-semibold text-harvest">{n}</div>
            <h3 className="mt-3 font-display text-xl font-bold text-charcoal">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl bg-forest p-8 text-cream sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-2xl font-bold">Ready to reach buyers directly?</h3>
          <p className="mt-1 text-cream/70">Join thousands of farmers already selling on ನೇಗಿಲುai — zero commission.</p>
        </div>
        <button
          onClick={onStartListing}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-harvest px-6 py-3 text-sm font-semibold text-forest transition-colors hover:bg-harvest-soft active:scale-95"
        >
          Start listing <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}

// Footer
function FooterWordmark() {
  const [idx, setIdx] = useState(0)
  useEffect(() => { const id = setInterval(() => setIdx((i) => (i + 1) % FOOTER_IMAGES.length), 4000); return () => clearInterval(id) }, [])
  return (
    <div className="relative mt-12 h-[26vw] select-none overflow-hidden" aria-hidden="true">
      <AnimatePresence mode="sync">
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} className="absolute inset-0 flex items-center justify-center bg-cover bg-center bg-clip-text text-transparent" style={{ backgroundImage: "url('" + FOOTER_IMAGES[idx] + "')" }}>
          <div className="whitespace-nowrap text-center font-kannada text-[17vw] font-extrabold leading-[1.25] tracking-tight">ನೇಗಿಲುai</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [done, setDone] = useState(false)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  return (
    <div className="flex flex-col justify-between gap-6 rounded-2xl border border-charcoal/12 bg-sand-200/40 p-6 sm:flex-row sm:items-center sm:p-8">
      <div className="max-w-sm">
        <h4 className="font-serif text-xl text-charcoal">Mandi rates, in your inbox</h4>
        <p className="mt-1.5 text-sm text-charcoal/55">Weekly AI price forecasts and harvest insights. No spam.</p>
      </div>
      {done ? (<p className="flex items-center gap-2 text-sm font-medium text-forest-500"><Check className="h-4 w-4" /> You&rsquo;re subscribed &mdash; welcome aboard.</p>) : (
        <form onSubmit={(e) => { e.preventDefault(); if (valid && !website) setDone(true) }} className="flex w-full max-w-sm items-center gap-2">
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@farm.in" aria-label="Email address" className="h-11 w-full rounded-full border border-charcoal/15 bg-cream px-4 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal/40 focus:border-forest-500" />
          <button type="submit" disabled={!valid} className="h-11 shrink-0 rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-40">Subscribe</button>
        </form>
      )}
    </div>
  )
}

function Footer() {
  const columns: [string, string[]][] = [
    ["Marketplace", ["Grains", "Vegetables", "Fruits", "Pulses", "Spices", "Bulk orders"]],
    ["For Farmers", ["List produce", "AI pricing", "Payments", "Logistics", "Farmer app"]],
    ["Resources", ["Blog", "Mandi rates", "Crop calendar", "Help center", "API docs"]],
    ["Company", ["About us", "Careers", "Contact", "Press", "Partnerships"]],
    ["Legal", ["Trust center", "Terms of service", "Privacy policy", "Refunds"]],
  ]
  const socials: [string, string][] = [
    ["LinkedIn", "M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.5 8.65 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.32-2.02-3.32-2.02 0-2.33 1.58-2.33 3.21V21H9z"],
    ["X", "M18.9 2H22l-7.5 8.6L23 22h-6.8l-5.3-6.9L4.8 22H2l8-9.2L1.5 2h6.9l4.8 6.4zm-1.2 18h1.9L7.1 4H5z"],
    ["YouTube", "M23 12s0-3.3-.42-4.9a2.56 2.56 0 0 0-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.78.3a2.56 2.56 0 0 0-1.8 1.8C1 8.7 1 12 1 12s0 3.3.42 4.9a2.56 2.56 0 0 0 1.8 1.8C4.8 19 12 19 12 19s7.2 0 8.78-.3a2.56 2.56 0 0 0 1.8-1.8C23 15.3 23 12 23 12zM9.75 15.5v-7l6 3.5z"],
    ["GitHub", "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"],
    ["Instagram", "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"],
  ]
  return (
    <footer className="relative overflow-hidden border-t border-charcoal/10 bg-cream">
  <div className="mx-auto max-w-7xl px-6 pt-16">
    <NewsletterSignup />

    <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)]">

      {/* Left section */}
      <div className="col-span-2 md:col-span-3 lg:col-span-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-charcoal">
            <span className="font-kannada">ನೇಗಿಲು</span>
            <span className="text-forest-500">ai</span>
          </span>
        </div>

        <p className="mt-3 text-sm text-charcoal/55">
          farmer
          
        </p>

        <div className="mt-6 flex gap-3">
          {["ISO:27001", "FSSAI\nLIC"].map((c) => (
            <div
              key={c}
              className="grid h-16 w-16 place-items-center whitespace-pre-line rounded-lg border border-charcoal/15 bg-sand-200/50 text-center font-mono text-[10px] font-semibold leading-tight text-charcoal/60"
            >
              {c}
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Find us at
        </p>

        <div className="mt-3 flex gap-4 text-charcoal/50">
          {socials.map(([label, d]) => (
            <span
              key={label}
              aria-label={`${label} profile coming soon`}
              title={`${label} profile coming soon`}
              className="cursor-default"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-[18px] w-[18px]"
              >
                <path d={d} />
              </svg>
            </span>
          ))}
        </div>

        <div className="mt-8 max-w-[16rem] rounded-lg border border-charcoal/12 p-4 text-xs leading-relaxed text-charcoal/55">
          <p>
            © 2026 ನೇಗಿಲುai Agritech Private Limited. All rights reserved.
          </p>

          <p className="mt-3">
            1st Cross Vidyanagar
            <br />
            Hassan, Karnataka 573201
          </p>
        </div>
      </div>

      {/* Footer navigation columns */}
      {columns.map(([title, links]) => (
        <div key={title}>
          <h4 className="text-xs font-bold uppercase tracking-wide text-charcoal/50">
            {title}
          </h4>

          <ul className="mt-5 space-y-3">
            {links.map((l) => (
              <li key={l}>
                <a
                  href={l === "Terms of service" ? "/terms" : l === "Privacy policy" ? "/privacy" : "#"}
                  onClick={(event) => {
                    if (l === "Terms of service" || l === "Privacy policy") {
                      event.preventDefault()
                      navigate(l === "Terms of service" ? "/terms" : "/privacy")
                    }
                  }}
                  className="text-[15px] text-charcoal/75 transition-colors hover:text-forest"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* Developer Credits */}
    <div className="flex w-full justify-center py-10">
      <p className="text-center text-sm text-charcoal/50">
        Designed by Vivekananda · Developed & Managed by Amogh, Vivek & Yashas
        
        <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <span className="absolute h-4 w-4 rounded-full bg-forest-500/25 blur-md" />
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="relative h-4 w-4 text-forest-500 drop-shadow-[0_0_6px_rgba(34,197,94,0.65)]"
      >
        <span>with </span>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
        
      </svg>
    </span>
    
      </p>
    </div>
  </div>

  <FooterWordmark />
</footer>
  )
}

// Cart drawer
function CartDrawer({ open, onClose, items, subtotal, setQty }: { open: boolean; onClose: () => void; items: { crop: Crop; qty: number }[]; subtotal: number; setQty: (id: string, qty: number) => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm" />
          <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-5">
              <h3 className="font-display text-xl font-bold text-charcoal">Your cart</h3>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-charcoal/5" aria-label="Close cart"><X className="h-5 w-5" /></button>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-forest/10 text-forest"><ShoppingBag className="h-6 w-6" /></div>
                <p className="font-display text-lg font-bold text-charcoal">Your cart is empty</p>
                <p className="text-sm text-charcoal/60">Add fresh produce from the marketplace to get started.</p>
                <button onClick={onClose} className="mt-2 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-cream hover:bg-forest-600">Browse marketplace</button>
              </div>
            ) : (
              <>
                <div className="flex-1 divide-y divide-charcoal/10 overflow-y-auto px-6">
                  {items.map(({ crop, qty }) => (
                    <div key={crop.id} className="flex gap-4 py-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sand"><img src={crop.image} alt={crop.name} className="h-full w-full object-cover" /></div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <div><div className="font-semibold text-charcoal">{crop.name}</div><div className="text-xs text-charcoal/55">{crop.farmer}</div></div>
                          <div className="font-mono text-sm font-semibold text-forest">{inr(crop.price * qty)}</div>
                        </div>
                        <div className="mt-auto flex items-center gap-2">
                          <button onClick={() => setQty(crop.id, qty - 1)} className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/15 hover:border-forest" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center font-mono text-sm">{qty}</span>
                          <button onClick={() => setQty(crop.id, qty + 1)} className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/15 hover:border-forest" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
                          <span className="ml-1 text-xs text-charcoal/50">× {inr(crop.price)}/{crop.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-charcoal/10 px-6 py-5">
                  <div className="flex items-center justify-between"><span className="text-sm text-charcoal/60">Subtotal</span><span className="font-mono text-xl font-semibold text-forest">{inr(subtotal)}</span></div>
                  <p className="mt-1 text-xs text-charcoal/50">GST &amp; logistics calculated at checkout · Paid securely via Razorpay</p>
                  <button onClick={() => { onClose(); navigate("/cart") }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-600"><IndianRupee className="h-4 w-4" /> Checkout · {inr(subtotal)}</button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
