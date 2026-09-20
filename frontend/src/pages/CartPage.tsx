import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, CheckCircle2, Package, Loader2 } from 'lucide-react';
import { api, type ApiCart, type ApiCartItem } from '../api';

interface CartPageProps {
  onNavigate: (path: string) => void;
}

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: () => void) => void } }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');

export default function CartPage({ onNavigate }: CartPageProps) {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<number | null>(null);

  const fetchCart = async () => {
    try {
      const data = await api.cart();
      setCart(data);
    } catch (error) {
      console.error("Failed to fetch cart", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    
    // Optimistic update
    setCart(prev => {
      if (!prev) return prev;
      const updatedItems = prev.items.map(item => 
        item.id === itemId ? { ...item, quantity: newQty } : item
      );
      // Recalculate total roughly
      return { ...prev, items: updatedItems };
    });

    try {
      await api.updateCartItem(null, itemId, newQty);
      // Refetch to get exact server calculation
      fetchCart();
    } catch (error) {
      console.error("Failed to update qty", error);
      fetchCart(); // Revert on failure
    }
  };

  const removeItem = async (itemId: number) => {
    setCart(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter(item => item.id !== itemId) };
    });

    try {
      await api.deleteCartItem(null, itemId);
      fetchCart();
    } catch (error) {
      console.error("Failed to remove item", error);
      fetchCart();
    }
  };

  const handleCheckout = async () => {
    if (!address.trim()) {
      alert("Please enter a delivery address");
      return;
    }
    
    setIsCheckingOut(true);
    let checkoutOpened = false;
    try {
      const response = await api.checkout(address);
      const confirmedId = response.order?.id || response.id;
      if (!confirmedId) throw new Error('The server did not return an order ID.');
      const paymentOrder = await api.createPaymentOrder(confirmedId);

      if (paymentOrder.is_demo || paymentOrder.key_id === "rzp_test_demo") {
        await api.verifyPayment(confirmedId, {
          razorpay_order_id: paymentOrder.razorpay_order_id,
          razorpay_payment_id: `pay_demo_${confirmedId}`,
          razorpay_signature: "demo_signature",
        });
        setOrderConfirmed(confirmedId);
        setCart(null);
        setIsCheckingOut(false);
        return;
      }

      if (!paymentOrder.key_id || !(await loadRazorpayCheckout()) || !window.Razorpay) {
        throw new Error('Secure payment checkout could not be opened.');
      }
      const checkout = new window.Razorpay({
        key: paymentOrder.key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        order_id: paymentOrder.razorpay_order_id,
        name: 'ನೇಗಿಲುai',
        description: `Order #${confirmedId}`,
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api.verifyPayment(confirmedId, payment);
            setOrderConfirmed(confirmedId);
            setCart(null);
          } catch (error) {
            alert(error instanceof Error ? error.message : 'Payment verification failed.');
          } finally {
            setIsCheckingOut(false);
          }
        },
        modal: { ondismiss: () => setIsCheckingOut(false) },
      });
      checkout.on('payment.failed', () => setIsCheckingOut(false));
      checkout.open();
      checkoutOpened = true;
      return;
    } catch (error) {
      console.error("Checkout failed", error);
      const msg = error instanceof Error ? error.message : "Checkout failed. Please try again.";
      alert(msg);
    } finally {
      if (!checkoutOpened) setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-forest" />
      </div>
    );
  }

  // Calculate local subtotal since API might not send it reliably depending on backend state
  const subtotal = cart?.items?.reduce((sum, item) => sum + (Number(item.product_details.price) * item.quantity), 0) || 0;

  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-cream p-4 md:p-8 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl border border-charcoal/10 p-12 max-w-lg w-full text-center shadow-xl"
        >
          <div className="w-24 h-24 rounded-full bg-leaf/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-forest" />
          </div>
          <h2 className="text-3xl font-serif text-forest mb-4">Order Confirmed!</h2>
          <p className="text-charcoal/60 mb-2">Your order has been successfully placed.</p>
          <p className="font-mono bg-sand inline-block px-4 py-2 rounded-lg text-charcoal font-medium mb-8">
            ID: {orderConfirmed}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => onNavigate('/orders')}
              className="w-full py-4 rounded-full bg-forest text-cream font-medium hover:bg-forest-600 transition-colors"
            >
              View My Orders
            </button>
            <button 
              onClick={() => onNavigate('/products')}
              className="w-full py-4 rounded-full bg-transparent text-forest border border-forest font-medium hover:bg-forest/5 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-forest" />
          </div>
          <div>
            <h1 className="font-serif text-4xl text-forest">Shopping Cart</h1>
            <p className="text-charcoal/60">{cart?.items?.length || 0} items</p>
          </div>
        </div>

        {isEmpty ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-charcoal/10 p-16 flex flex-col items-center text-center max-w-2xl mx-auto mt-12"
          >
            <ShoppingBag className="w-16 h-16 text-charcoal/10 mb-6" />
            <h2 className="text-2xl font-serif text-charcoal mb-3">Your cart is empty</h2>
            <p className="text-charcoal/60 mb-8 max-w-md">
              Looks like you haven't added anything to your cart yet. Explore our marketplace to find fresh produce.
            </p>
            <button 
              onClick={() => onNavigate('/products')}
              className="px-8 py-4 rounded-full bg-forest text-cream font-medium hover:bg-forest-600 transition-colors text-lg"
            >
              Browse Marketplace
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {cart.items.map((item) => {
                  const product = item.product_details;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      className="bg-white rounded-3xl border border-charcoal/10 p-4 sm:p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center"
                    >
                      {/* Image */}
                      <div className="w-full sm:w-28 h-28 rounded-2xl bg-sand/50 overflow-hidden shrink-0 cursor-pointer" onClick={() => onNavigate(`/products/${product.id}`)}>
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images.find(i => i.is_primary)?.image ?? product.images[0]?.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-4 justify-between w-full">
                        <div className="space-y-1 flex-1">
                          <h3 className="font-medium text-lg text-charcoal line-clamp-1">{product.name}</h3>
                          <p className="text-sm text-charcoal/60">By {product.farmer?.username}</p>
                          <p className="font-display font-semibold text-forest text-lg pt-2">
                            {money(product.price)} <span className="text-sm font-normal text-charcoal/60">/{product.unit}</span>
                          </p>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t border-charcoal/10 sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
                          
                          <div className="flex items-center gap-3 bg-sand/30 rounded-full p-1 border border-charcoal/5">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-charcoal hover:bg-forest hover:text-cream transition-colors disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-charcoal"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-medium font-mono text-charcoal">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-charcoal hover:bg-forest hover:text-cream transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-charcoal/50 font-medium uppercase tracking-wider mb-0.5">Subtotal</p>
                              <p className="font-display font-semibold text-charcoal">
                                {money(Number(product.price) * item.quantity)}
                              </p>
                            </div>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="w-10 h-10 rounded-full bg-clay/10 text-clay flex items-center justify-center hover:bg-clay hover:text-cream transition-colors shrink-0"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Right: Summary Sidebar */}
            <div className="lg:sticky lg:top-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl border border-charcoal/10 p-6 sm:p-8 space-y-6"
              >
                <h2 className="text-xl font-serif text-forest border-b border-charcoal/10 pb-4">Order Summary</h2>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-charcoal/80">
                    <span>Subtotal ({cart.items.length} items)</span>
                    <span className="font-medium">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal/80">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-leaf">Free</span>
                  </div>
                  <div className="pt-4 border-t border-charcoal/10 flex justify-between items-end">
                    <span className="text-base font-medium text-charcoal">Total Amount</span>
                    <span className="text-3xl font-display font-bold text-forest">{money(subtotal)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-charcoal/10">
                  <label className="block text-sm font-medium text-charcoal">Delivery Address</label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your full delivery address here..."
                    className="w-full h-24 rounded-xl border border-charcoal/20 bg-cream/30 p-3 text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest resize-none"
                  />
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut || !address.trim() || subtotal === 0}
                  className="w-full py-4 rounded-full bg-forest text-cream font-medium text-lg hover:bg-forest-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Place Order <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                
                <p className="text-xs text-center text-charcoal/50 mt-4">
                  By placing your order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </motion.div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
