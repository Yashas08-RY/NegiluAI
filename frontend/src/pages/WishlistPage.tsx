import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, MapPin, Star, Package, Loader2 } from 'lucide-react';
import { api, type ApiWishlistItem } from '../api';

interface WishlistPageProps {
  onNavigate: (path: string) => void;
}

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');

export default function WishlistPage({ onNavigate }: WishlistPageProps) {
  const [wishlist, setWishlist] = useState<ApiWishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const fetchWishlist = async () => {
    try {
      const data = await api.wishlist();
      setWishlist(Array.isArray(data) ? data : (data as any).results || []);
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: number) => {
    try {
      await api.toggleWishlist(null, productId);
      // Remove optimistically
      setWishlist(prev => prev.filter(item => item.product !== productId));
    } catch (error) {
      console.error("Failed to remove from wishlist", error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    setAddingToCart(productId);
    try {
      await api.addCartItem(null, productId);
      // Optionally show a toast here
    } catch (error) {
      console.error("Failed to add to cart", error);
    } finally {
      setAddingToCart(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-forest" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-clay/10 flex items-center justify-center">
            <Heart className="w-6 h-6 text-clay fill-clay" />
          </div>
          <div>
            <h1 className="font-serif text-4xl text-forest">My Wishlist</h1>
            <p className="text-charcoal/60">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-charcoal/10 p-16 flex flex-col items-center text-center max-w-2xl mx-auto mt-12"
          >
            <Heart className="w-16 h-16 text-charcoal/10 mb-6" />
            <h2 className="text-2xl font-serif text-charcoal mb-3">Your wishlist is empty</h2>
            <p className="text-charcoal/60 mb-8 max-w-md">
              Save items you like to your wishlist to easily find them later and keep track of products you want to buy.
            </p>
            <button 
              onClick={() => onNavigate('/products')}
              className="px-8 py-4 rounded-full bg-forest text-cream font-medium hover:bg-forest-600 transition-colors text-lg"
            >
              Browse Marketplace
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {wishlist.map((item, i) => {
                const product = item.product_details;
                if (!product) return null;
                
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-3xl border border-charcoal/10 overflow-hidden group flex flex-col hover:shadow-lg transition-shadow"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[4/3] bg-sand/30 overflow-hidden cursor-pointer" onClick={() => onNavigate(`/products/${product.id}`)}>
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images.find(i => i.is_primary)?.image ?? product.images[0]?.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                          <Package className="w-12 h-12" />
                        </div>
                      )}
                      
                      {/* Remove Button overlay */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemove(product.id); }}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                        title="Remove from wishlist"
                      >
                        <Heart className="w-5 h-5 text-clay fill-clay" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-medium text-charcoal text-lg line-clamp-1 flex-1 cursor-pointer hover:text-forest transition-colors" onClick={() => onNavigate(`/products/${product.id}`)}>
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 text-harvest-600 bg-harvest/10 px-2 py-0.5 rounded text-sm font-medium shrink-0">
                          <Star className="w-3 h-3 fill-harvest-600" />
                          <span>{product.average_rating ?? 0}</span>
                        </div>
                      </div>

                      <div className="space-y-1 mb-4 flex-1">
                        <p className="text-sm text-charcoal/60">{product.farmer?.username}</p>
                        <p className="text-sm text-charcoal/50 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {product.location}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-charcoal/10">
                        <div>
                          <p className="text-xl font-display font-semibold text-forest">
                            {money(product.price)}
                          </p>
                          <p className="text-xs text-charcoal/50">per {product.unit}</p>
                        </div>
                        <button 
                          onClick={() => handleAddToCart(product.id)}
                          disabled={addingToCart === product.id}
                          className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center hover:bg-forest-600 transition-colors disabled:opacity-70"
                        >
                          {addingToCart === product.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <ShoppingBag className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
