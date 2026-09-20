import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Search, ShoppingBag, ArrowUpRight, CheckCircle2, Clock, Truck, Package, XCircle } from "lucide-react";
import { api, resultsOf } from "../api";

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');

export default function FarmerOrdersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.farmerSales();
      setSales(resultsOf(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleStatusUpdate = async (orderId: number, status: "processing" | "shipped" | "delivered") => {
    try {
      let extra: { courier_name?: string; tracking_id?: string } = {};
      if (status === "shipped") {
        const courier_name = window.prompt("Courier name");
        const tracking_id = window.prompt("Tracking ID");
        if (!courier_name?.trim() || !tracking_id?.trim()) return;
        extra = { courier_name: courier_name.trim(), tracking_id: tracking_id.trim() };
      }
      await api.transitionFarmerOrder(orderId, { status, ...extra });
      setSales((current) => current.map((sale) => sale.order_id === orderId ? { ...sale, order_status: status } : sale));
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const tabs = ["All", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

  const filteredSales = sales.filter(sale => {
    if (filter !== "All" && (sale.order_status || 'pending').toLowerCase() !== filter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return sale.product_name?.toLowerCase().includes(q) || sale.buyer_username?.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusConfig = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch(s) {
      case 'pending': return { color: 'bg-harvest/20 text-harvest-600', icon: Clock };
      case 'confirmed': return { color: 'bg-forest/10 text-forest-600', icon: CheckCircle2 };
      case 'shipped': return { color: 'bg-blue-500/10 text-blue-600', icon: Truck };
      case 'delivered': return { color: 'bg-leaf/20 text-leaf-600', icon: Package };
      case 'cancelled': return { color: 'bg-clay/10 text-clay', icon: XCircle };
      default: return { color: 'bg-sand text-charcoal', icon: Clock };
    }
  };

  return (
    <div className="min-h-screen bg-cream p-6 md:p-10 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-serif text-forest mb-2">Orders</h1>
          <p className="text-charcoal/60">Manage and track your sales</p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" size={20} />
          <input 
            type="text" 
            placeholder="Search products or buyers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 pl-12 pr-4 py-3 rounded-full border border-charcoal/10 bg-white focus:border-forest outline-none shadow-sm transition"
          />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 mb-6 hide-scrollbar gap-2">
        {tabs.map(tab => {
          const count = tab === "All" ? sales.length : sales.filter(s => (s.order_status || 'pending').toLowerCase() === tab.toLowerCase()).length;
          return (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition font-medium text-sm ${
                filter === tab ? 'bg-forest text-cream shadow-md' : 'bg-white border border-charcoal/10 text-charcoal/70 hover:bg-sand'
              }`}
            >
              {tab}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${filter === tab ? 'bg-white/20' : 'bg-sand-200 text-charcoal/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div></div>
      ) : filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-charcoal/10 shadow-sm">
          <div className="bg-sand p-6 rounded-full text-forest/50 mb-4"><ShoppingBag size={48} /></div>
          <h2 className="text-xl font-serif text-forest mb-2">No orders found</h2>
          <p className="text-charcoal/60">There are no orders matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale, idx) => {
            const statusCfg = getStatusConfig(sale.order_status);
            const StatusIcon = statusCfg.icon;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                key={sale.id}
                className="bg-white rounded-3xl border border-charcoal/10 p-6 flex flex-col lg:flex-row gap-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-4 border-b border-charcoal/5 pb-4">
                    <span className="font-mono text-sm bg-sand px-3 py-1 rounded-lg text-forest font-semibold">
                      Order #{sale.order_id}
                    </span>
                    <span className="text-sm text-charcoal/60 flex items-center gap-1 font-medium">
                      <Clock size={14} />
                      {new Date(sale.ordered_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusCfg.color}`}>
                      <StatusIcon size={14} /> {sale.order_status || 'pending'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-lg text-forest mb-1 font-semibold">{sale.product_name}</h3>
                      <div className="text-sm text-charcoal/70 space-y-1">
                        <p>Buyer: <span className="font-medium text-charcoal">{sale.buyer_username}</span></p>
                        <p>Qty: <span className="font-medium text-charcoal">{sale.quantity} units</span> × {money(sale.unit_price)}</p>
                      </div>
                    </div>
                    <div className="sm:text-right flex flex-col justify-end">
                      <p className="text-sm text-charcoal/60 mb-1 font-medium">Subtotal</p>
                      <p className="text-2xl font-display text-forest font-semibold">{money(sale.subtotal)}</p>
                    </div>
                  </div>
                </div>

                <div className="lg:w-48 lg:border-l lg:border-charcoal/10 lg:pl-6 flex flex-col justify-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                  {sale.order_status === 'confirmed' && (
                    <button onClick={() => handleStatusUpdate(sale.order_id, 'processing')} className="w-full bg-forest text-cream py-2.5 rounded-full text-sm font-medium hover:bg-forest-600 transition flex items-center justify-center gap-2 shadow-sm">
                      <CheckCircle2 size={16} /> Start Processing
                    </button>
                  )}
                  {sale.order_status === 'processing' && (
                    <button onClick={() => handleStatusUpdate(sale.order_id, 'shipped')} className="w-full bg-blue-500 text-white py-2.5 rounded-full text-sm font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-sm">
                      <Truck size={16} /> Mark Shipped
                    </button>
                  )}
                  {sale.order_status === 'shipped' && (
                    <button onClick={() => handleStatusUpdate(sale.order_id, 'delivered')} className="w-full bg-leaf text-white py-2.5 rounded-full text-sm font-medium hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-sm">
                      <Package size={16} /> Mark Delivered
                    </button>
                  )}
                  <button className="w-full bg-white border border-charcoal/20 text-charcoal/70 py-2.5 rounded-full text-sm font-medium hover:bg-sand transition flex items-center justify-center gap-2">
                    View Details <ArrowUpRight size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
