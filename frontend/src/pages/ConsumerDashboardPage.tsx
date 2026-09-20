import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Package, IndianRupee, Heart, ShoppingBag, ChevronRight, Store, ArrowRight, Loader2 } from 'lucide-react';
import { api, resultsOf, type ApiOrder, type ApiWishlistItem, type ApiProduct } from '../api';
import { useAuth } from '../auth/AuthContext';

interface ConsumerDashboardPageProps {
  onNavigate: (path: string) => void;
}

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');

export default function ConsumerDashboardPage({ onNavigate }: ConsumerDashboardPageProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [wishlist, setWishlist] = useState<ApiWishlistItem[]>([]);
  const [recommended, setRecommended] = useState<ApiProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [overviewSpent, setOverviewSpent] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [ordersData, wishlistData, productsData, cartData, overviewData] = await Promise.allSettled([
          api.orders(),
          api.wishlist(),
          api.listProducts(new URLSearchParams({ ordering: '-created_at' })),
          api.cart(),
          api.consumerOverview(),
        ]);

        if (ordersData.status === 'fulfilled') {
          setOrders(resultsOf(ordersData.value));
        }

        if (wishlistData.status === 'fulfilled') {
          setWishlist(resultsOf(wishlistData.value));
        }

        if (productsData.status === 'fulfilled') {
          const allProducts = resultsOf(productsData.value);
          const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
          setRecommended(shuffled.slice(0, 4));
        }

        if (cartData.status === 'fulfilled') {
          setCartCount(cartData.value?.items?.length || 0);
        }

        if (overviewData.status === 'fulfilled') {
          if (overviewData.value?.total_spent !== undefined) {
            setOverviewSpent(overviewData.value.total_spent);
          }
          if (overviewData.value?.cart_count !== undefined && cartData.status !== 'fulfilled') {
            setCartCount(overviewData.value.cart_count);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-forest" />
      </div>
    );
  }

  const calculatedSpent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const totalSpent = overviewSpent !== null ? overviewSpent : calculatedSpent;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl text-forest mb-2">
              Welcome back, {user?.username || 'Guest'}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-forest/10 text-forest text-sm font-medium">
              Consumer Workspace
            </span>
          </div>
          <button 
            onClick={() => onNavigate('/products')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-forest text-cream font-medium hover:bg-forest-600 transition-colors w-fit"
          >
            <Store className="w-5 h-5" />
            Browse Marketplace
          </button>
        </div>

        {/* KPI Cards */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-charcoal/10 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('/orders')}>
            <div className="w-12 h-12 rounded-full bg-harvest/20 flex items-center justify-center text-harvest-600 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-charcoal/60 font-medium">Total Orders</p>
              <p className="text-2xl font-display font-semibold text-charcoal">{orders.length}</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-charcoal/10 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-leaf/20 flex items-center justify-center text-forest shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-charcoal/60 font-medium">Total Spent</p>
              <p className="text-2xl font-display font-semibold text-charcoal">{money(totalSpent)}</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-charcoal/10 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('/wishlist')}>
            <div className="w-12 h-12 rounded-full bg-clay/20 flex items-center justify-center text-clay shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-charcoal/60 font-medium">Wishlist Items</p>
              <p className="text-2xl font-display font-semibold text-charcoal">{wishlist.length}</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-charcoal/10 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('/cart')}>
            <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center text-forest shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-charcoal/60 font-medium">Active Cart Items</p>
              <p className="text-2xl font-display font-semibold text-charcoal">{cartCount}</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area - Left 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Orders */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-serif text-forest">Recent Orders</h2>
                <button onClick={() => onNavigate('/orders')} className="text-forest hover:text-forest-600 font-medium text-sm inline-flex items-center gap-1 group">
                  View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="bg-white rounded-3xl border border-charcoal/10 overflow-hidden">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-charcoal/60">No recent orders found.</div>
                ) : (
                  <div className="divide-y divide-charcoal/10">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="p-4 sm:p-6 hover:bg-cream/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-charcoal/60">#{order.id.toString()}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-sand text-charcoal">
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="font-medium text-charcoal">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • {money(order.total_amount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                            ${order.status === 'delivered' ? 'bg-leaf/20 text-forest' : 
                              order.status === 'cancelled' ? 'bg-clay/20 text-clay' : 
                              'bg-harvest/20 text-harvest-600'}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Recommended Products */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-serif text-forest">Recommended For You</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommended.map(product => (
                  <motion.div 
                    whileHover={{ y: -4 }}
                    key={product.id} 
                    className="bg-white rounded-2xl border border-charcoal/10 p-4 flex gap-4 cursor-pointer"
                    onClick={() => onNavigate(`/products/${product.id}`)}
                  >
                    <div className="w-20 h-20 rounded-xl bg-sand/50 overflow-hidden shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images.find(i => i.is_primary)?.image ?? product.images[0]?.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="font-medium text-charcoal line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-charcoal/60 mb-2">{product.farmer?.username}</p>
                      <p className="font-display font-semibold text-forest">{money(product.price)}<span className="text-xs font-normal text-charcoal/60">/{product.unit}</span></p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar Area - Right column */}
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif text-forest flex items-center gap-2">
                  <Heart className="w-5 h-5 text-clay" /> Wishlist
                </h2>
                <button onClick={() => onNavigate('/wishlist')} className="text-forest hover:text-forest-600 font-medium text-sm inline-flex items-center gap-1 group">
                  View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="bg-white rounded-3xl border border-charcoal/10 p-4 space-y-4">
                {wishlist.length === 0 ? (
                  <div className="py-8 text-center">
                    <Heart className="w-8 h-8 text-charcoal/20 mx-auto mb-2" />
                    <p className="text-charcoal/60 text-sm">Your wishlist is empty.</p>
                  </div>
                ) : (
                  wishlist.slice(0, 4).map(item => (
                    <div key={item.id} className="flex gap-3 group cursor-pointer" onClick={() => onNavigate(`/products/${item.product}`)}>
                      <div className="w-16 h-16 rounded-lg bg-sand/50 overflow-hidden shrink-0">
                        {item.product_details?.images && item.product_details.images.length > 0 ? (
                          <img src={item.product_details.images.find(i => i.is_primary)?.image ?? item.product_details.images[0]?.image} alt={item.product_details.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-medium text-charcoal truncate">{item.product_details?.name || 'Unknown Product'}</h4>
                        <p className="text-sm font-display font-semibold text-forest mt-1">
                          {money(item.product_details?.price || 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
