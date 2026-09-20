import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Search, Calendar, ChevronDown, ChevronUp, MapPin, X, Loader2 } from 'lucide-react';
import { api, type ApiOrder } from '../api';

interface ConsumerOrdersPageProps {
  onNavigate: (path: string) => void;
}

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');
const statuses = ['All', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function ConsumerOrdersPage({ onNavigate }: ConsumerOrdersPageProps) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const data = await api.orders();
        setOrders(data?.results || []);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await api.cancelOrder(orderId);
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: result.order_status as ApiOrder["status"] } : order));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to cancel this order.');
    }
  };

  const filteredOrders = activeTab === 'All' 
    ? orders 
    : orders.filter(o => o.status.toLowerCase() === activeTab.toLowerCase());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-forest" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-leaf/20 text-forest border-leaf/30';
      case 'cancelled': return 'bg-clay/20 text-clay border-clay/30';
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-sand text-charcoal border-charcoal/10';
      default: return 'bg-harvest/20 text-harvest-700 border-harvest/30';
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="font-serif text-4xl text-forest mb-2">My Orders</h1>
          <p className="text-charcoal/60 text-lg">You have {orders.length} total orders.</p>
        </div>

        {/* Filters */}
        <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors
                ${activeTab === status 
                  ? 'bg-forest text-cream' 
                  : 'bg-white text-charcoal border border-charcoal/10 hover:bg-sand/50'}`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-charcoal/10 p-12 text-center"
              >
                <Package className="w-12 h-12 text-charcoal/20 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-charcoal mb-2">No {activeTab !== 'All' ? activeTab : ''} orders found</h3>
                <p className="text-charcoal/60 mb-6">You don't have any orders matching this status.</p>
                <button 
                  onClick={() => onNavigate('/products')}
                  className="px-6 py-3 rounded-full bg-forest text-cream font-medium hover:bg-forest-600 transition-colors"
                >
                  Start Shopping
                </button>
              </motion.div>
            ) : (
              filteredOrders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-3xl border border-charcoal/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div 
                    className="p-6 cursor-pointer flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-mono font-medium text-charcoal bg-sand px-3 py-1 rounded-md text-sm">
                          #{order.id.toString()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {order.status === 'pending' && (
                          <button 
                            onClick={(e) => handleCancelOrder(order.id, e)}
                            className="text-xs font-medium text-clay hover:underline ml-auto md:ml-0"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-charcoal/60 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span>{order.items.length} items</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-6 md:border-l md:border-charcoal/10 md:pl-6">
                      <div className="text-left md:text-right">
                        <p className="text-sm text-charcoal/60 font-medium mb-1">Order Total</p>
                        <p className="text-2xl font-display font-semibold text-forest">
                          {money(order.total_amount)}
                        </p>
                      </div>
                      <div className="text-charcoal/40">
                        {expandedOrder === order.id ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-charcoal/10 bg-cream/30"
                      >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                          
                          {/* Items List */}
                          <div className="md:col-span-2 space-y-4">
                            <h4 className="font-medium text-charcoal text-sm uppercase tracking-wider mb-4">Order Items</h4>
                            <div className="space-y-4">
                              {order.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-charcoal/5">
                                  <div>
                                    <p className="font-medium text-charcoal">{item.product_name}</p>
                                    <p className="text-sm text-charcoal/60">
                                      {item.quantity} × {money(item.unit_price)}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-charcoal">
                                    {money(Number(item.quantity) * Number(item.unit_price))}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div>
                            <h4 className="font-medium text-charcoal text-sm uppercase tracking-wider mb-4">Delivery Details</h4>
                            <div className="bg-white p-4 rounded-xl border border-charcoal/5 space-y-3">
                              <div className="flex items-start gap-2 text-charcoal/80 text-sm">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <p className="whitespace-pre-wrap">{order.delivery_address || 'No address provided'}</p>
                              </div>
                            </div>
                            
                            <div className="mt-6">
                              <button 
                                onClick={() => onNavigate(`/support?order=${order.id}`)}
                                className="w-full py-2 px-4 rounded-full border border-charcoal/20 text-charcoal text-sm font-medium hover:bg-charcoal hover:text-white transition-colors"
                              >
                                Need Help?
                              </button>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
