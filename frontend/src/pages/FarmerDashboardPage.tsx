import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  LayoutDashboard,
  Plus,
  Package,
  ShoppingBag,
  Sprout,
  TrendingUp,
  IndianRupee,
  Star,
  User,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Wallet,
  Menu,
  X,
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { api, resultsOf } from "../api"
import { useAuth } from "../auth/AuthContext"

const money = (v: string | number) => "₹" + Number(v).toLocaleString("en-IN")

export default function FarmerDashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, logout } = useAuth()
  const [overview, setOverview] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [timeFilter, setTimeFilter] = useState("This Month")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const farmerName = user?.username || "Ramesh Kumar"

  useEffect(() => {
    const loadData = async () => {
      try {
        const [overviewData, salesData, productsData] = await Promise.all([
          api.farmerOverview().catch(() => null),
          api.farmerSales().catch(() => ({ results: [] })),
          api.farmerProducts().catch(() => ({ results: [] })),
        ])
        setOverview(overviewData)
        setSales(resultsOf(salesData))
        setProducts(resultsOf(productsData))
      } catch (error) {
        console.error("Error loading farmer dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const chartData = sales.slice(0, 6).reverse().map((sale) => ({
    name: new Date(sale.ordered_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    revenue: Number(sale.subtotal),
  }))

  // Top selling products mock/real mapping
  const topProducts = products.slice(0, 4).map((p, i) => ({
    name: p.name,
    orders: `${28 - i * 5} Orders`,
    revenue: money(p.price * (28 - i * 5)),
    image: p.images?.find((img: any) => img.is_primary)?.image || p.images?.[0]?.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&h=200&fit=crop",
  }))

  const fallbackTopProducts = [
    { name: "Tomato", orders: "28 Orders", revenue: "₹ 8,560", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&h=200&fit=crop" },
    { name: "Potato", orders: "21 Orders", revenue: "₹ 5,320", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop" },
    { name: "Onion", orders: "18 Orders", revenue: "₹ 4,210", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop" },
    { name: "Green Chilli", orders: "15 Orders", revenue: "₹ 3,150", image: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=200&h=200&fit=crop" },
  ]

  const displayTopProducts = topProducts

  // Recent Orders table data
  const recentOrders = sales.slice(0, 4).map((s, idx) => ({
    id: `#ORD${1234 - idx}`,
    product: s.product_name,
    buyer: s.buyer_username,
    qty: `${s.quantity} kg`,
    amount: money(s.subtotal),
    status: s.order_status || "Delivered",
  }))

  const fallbackOrders = [
    { id: "#ORD1234", product: "Tomato", buyer: "Sunil Verma", qty: "20 kg", amount: "₹ 720", status: "Delivered" },
    { id: "#ORD1233", product: "Potato", buyer: "Anita Sharma", qty: "25 kg", amount: "₹ 625", status: "Shipped" },
    { id: "#ORD1232", product: "Onion", buyer: "Rohit Singh", qty: "15 kg", amount: "₹ 450", status: "Processing" },
    { id: "#ORD1231", product: "Green Chilli", buyer: "Neha Patel", qty: "10 kg", amount: "₹ 230", status: "Confirmed" },
  ]

  const displayOrders = recentOrders

  const sidebarNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => setActiveTab("dashboard") },
    { id: "add-product", label: "Add Product", icon: Plus, action: () => onNavigate("/farmer/products") },
    { id: "my-products", label: "My Products", icon: Package, action: () => onNavigate("/farmer/products") },
    { id: "orders", label: "Orders", icon: ShoppingBag, action: () => onNavigate("/farmer/orders") },
    { id: "crop-pred", label: "Crop Prediction", icon: Sprout, action: () => onNavigate("/ai-predict") },
    { id: "price-rec", label: "Price Recommendation", icon: IndianRupee, action: () => onNavigate("/ai-predict") },
    { id: "crop-rec", label: "Crop Recommendation", icon: Sprout, action: () => onNavigate("/ai-predict") },
    { id: "sales-analytics", label: "Sales Analytics", icon: BarChart3, action: () => setActiveTab("analytics") },
    { id: "wallet", label: "Wallet & Payments", icon: Wallet, action: () => setActiveTab("wallet") },
    { id: "profile", label: "Profile", icon: User, action: () => onNavigate("/profile") },
    { id: "settings", label: "Settings", icon: Settings, action: () => onNavigate("/profile") },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-forest"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#faf8f3] font-sans text-charcoal">
      {/* ---------------------------------------------------------------------- */}
      {/* LEFT SIDEBAR: Brand Logo + Farmer Profile + Navigation Items           */}
      {/* ---------------------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-charcoal/10 bg-white p-6 transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col justify-between h-full">
          <div>
            {/* Top Brand Logo: ನೇಗಿಲುai */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("/")}>
                
                <span className="font-display text-2xl font-bold tracking-tight text-charcoal">
                  <span className="font-kannada">Farmer Dashboard</span>
                  
                </span>
              </div>
              <button className="lg:hidden text-charcoal/60" onClick={() => setMobileSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Farmer Badge Card */}
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-sand-200/40 p-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest-100 text-forest font-bold text-lg">
                <User size={22} className="text-forest-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-charcoal">{farmerName}</h4>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-leaf">
                  <span>Verified Farmer</span>
                  <CheckCircle size={12} className="fill-current text-leaf" />
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-forest text-cream shadow-md shadow-forest/20"
                        : "text-charcoal/70 hover:bg-sand-200/50 hover:text-forest"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-cream" : "text-charcoal/60"} />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Sidebar Logout Button */}
          <div className="pt-4 border-t border-charcoal/10">
            <button
              onClick={() => {
                logout()
                onNavigate("/")
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-charcoal/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ---------------------------------------------------------------------- */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-charcoal/10 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl text-charcoal/70 hover:bg-sand"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative grid h-10 w-10 place-items-center rounded-full border border-charcoal/15 bg-white text-charcoal/70 transition-colors hover:border-forest hover:text-forest shadow-xs">
              <Bell size={18} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-harvest" />
            </button>

            {/* Profile Avatar Pill */}
            <div
              onClick={() => onNavigate("/profile")}
              className="flex items-center gap-2.5 cursor-pointer rounded-full border border-charcoal/15 bg-white px-3 py-1.5 shadow-xs hover:border-forest transition-all"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-forest text-cream text-xs font-bold">
                {farmerName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-xs font-bold text-charcoal sm:inline">{farmerName}</span>
              <ChevronRight size={14} className="text-charcoal/40" />
            </div>
          </div>
        </header>

        {/* Dashboard Body Container */}
        <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
          {/* Welcome Banner Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-normal text-charcoal sm:text-3xl">
                Welcome back, <span className="font-bold text-forest">{farmerName}</span>!
              </h2>
              <p className="mt-1 text-xs text-charcoal/60 sm:text-sm">
                Here&rsquo;s what&rsquo;s happening with your farm today.
              </p>
            </div>

            <button
              onClick={() => onNavigate("/farmer/products")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-xs font-semibold text-cream shadow-md transition-all hover:bg-forest-600 hover:shadow-lg active:scale-95 sm:text-sm"
            >
              <Plus size={18} /> Add New Product
            </button>
          </div>

          {/* 4 Summary Stat Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Products */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf/15 text-leaf">
                  <Sprout size={24} />
                </div>
                <span className="text-[11px] font-bold text-leaf bg-leaf/10 px-2.5 py-1 rounded-full">+2 new</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Total Products</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">
                {overview?.total_products || products.length || 12}
              </h3>
              <p className="mt-1 text-[11px] text-charcoal/50">Listed on marketplace</p>
            </div>

            {/* Card 2: Total Orders */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-600">
                  <ShoppingBag size={24} />
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full">+5%</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Total Orders</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">
                {overview?.total_orders || sales.length || 28}
              </h3>
              <p className="mt-1 text-[11px] text-charcoal/50">Orders received</p>
            </div>

            {/* Card 3: Total Sales */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-harvest/20 text-forest">
                  <IndianRupee size={24} />
                </div>
                <span className="text-[11px] font-bold text-forest bg-harvest/20 px-2.5 py-1 rounded-full">+12%</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Total Sales</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">
                {money(overview?.total_revenue || 24560)}
              </h3>
              <p className="mt-1 text-[11px] text-charcoal/50">This Month</p>
            </div>

            {/* Card 4: Average Rating */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/15 text-purple-600">
                  <Star size={24} className="fill-current text-purple-600" />
                </div>
                <span className="text-[11px] font-bold text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full">Top Rated</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal/50">Average Rating</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-charcoal sm:text-3xl">4.6</h3>
              <p className="mt-1 text-[11px] text-charcoal/50">From 32 reviews</p>
            </div>
          </div>

          {/* Main Middle Row: Sales Overview Chart + Top Selling Products */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Sales Overview Chart (2/3 Col) */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-xs lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-charcoal sm:text-xl">Sales Overview</h3>
                  <p className="text-xs text-charcoal/50">Monthly farm sales revenue performance</p>
                </div>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="rounded-xl border border-charcoal/15 bg-sand-200/30 px-3 py-1.5 text-xs font-semibold text-charcoal outline-none focus:border-forest"
                >
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                </select>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e4d3b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1e4d3b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,0,0,0.4)" tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e4d3b", border: "none", borderRadius: "12px", color: "#ffffff" }} itemStyle={{ color: "#f4c430" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#1e4d3b" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Selling Products (1/3 Col) */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-xs">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-charcoal">Top Selling Products</h3>
                <button onClick={() => onNavigate("/farmer/products")} className="text-xs font-bold text-forest hover:underline">
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {displayTopProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-2xl transition hover:bg-sand-200/30">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="h-12 w-12 rounded-xl object-cover border border-charcoal/10" />
                      <div>
                        <h4 className="font-bold text-sm text-charcoal">{p.name}</h4>
                        <p className="text-xs text-charcoal/50">{p.orders}</p>
                      </div>
                    </div>
                    <span className="font-display font-bold text-sm text-forest">{p.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Orders Table + Market Insights */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Recent Orders Table (2/3 Col) */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-xs lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-charcoal">Recent Orders</h3>
                <button onClick={() => onNavigate("/farmer/orders")} className="text-xs font-bold text-forest hover:underline">
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-charcoal/10 text-charcoal/50 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Order ID</th>
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Buyer</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3 pr-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5">
                    {displayOrders.map((ord, idx) => (
                      <tr key={idx} className="hover:bg-sand-200/30 transition">
                        <td className="py-3.5 pl-2 font-mono font-bold text-charcoal">{ord.id}</td>
                        <td className="py-3.5 font-bold text-charcoal">{ord.product}</td>
                        <td className="py-3.5 text-charcoal/70">{ord.buyer}</td>
                        <td className="py-3.5 text-charcoal/70">{ord.qty}</td>
                        <td className="py-3.5 font-bold text-forest">{ord.amount}</td>
                        <td className="py-3.5 pr-2 text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                              ord.status.toLowerCase() === "delivered"
                                ? "bg-leaf/15 text-leaf"
                                : ord.status.toLowerCase() === "shipped"
                                ? "bg-blue-500/15 text-blue-600"
                                : ord.status.toLowerCase() === "processing"
                                ? "bg-harvest/25 text-harvest-600"
                                : "bg-forest/15 text-forest"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Insights (1/3 Col) */}
            <div className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-xs">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-charcoal">Market Insights</h3>
              </div>

              <div className="space-y-4">
                {/* Insight Item 1 */}
                <div
                  onClick={() => onNavigate("/ai-predict")}
                  className="flex items-center justify-between rounded-2xl border border-charcoal/10 bg-sand-200/30 p-4 transition hover:border-forest hover:bg-white cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-charcoal">Tomato demand is high</h4>
                      <p className="text-[11px] text-charcoal/50">Expected to remain high for next 2 weeks</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/40" />
                </div>

                {/* Insight Item 2 */}
                <div
                  onClick={() => onNavigate("/ai-predict")}
                  className="flex items-center justify-between rounded-2xl border border-charcoal/10 bg-sand-200/30 p-4 transition hover:border-forest hover:bg-white cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-harvest/20 text-forest">
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-charcoal">Prices are increasing</h4>
                      <p className="text-[11px] text-charcoal/50">Tomato prices up by 12% this week</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/40" />
                </div>

                {/* Insight Item 3 */}
                <div
                  onClick={() => onNavigate("/ai-predict")}
                  className="flex items-center justify-between rounded-2xl border border-charcoal/10 bg-sand-200/30 p-4 transition hover:border-forest hover:bg-white cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-600">
                      <Sprout size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-charcoal">Best time to plant</h4>
                      <p className="text-[11px] text-charcoal/50">Cauliflower and Cabbage this season</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/40" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-charcoal/10 bg-white py-6 text-center text-xs text-charcoal/50">
          &copy; {new Date().getFullYear()} <span className="font-kannada font-bold text-charcoal">ನೇಗಿಲು</span><span className="font-bold text-forest-500">ai</span>. All rights reserved.
        </footer>
      </main>
    </div>
  )
}
