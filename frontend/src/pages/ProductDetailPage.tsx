import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, MapPin, Star, Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { api, resultsOf, type ApiProduct } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function ProductDetailPage({ 
  productId, 
  onNavigate 
}: { 
  productId: number; 
  onNavigate: (path: string) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const prod = await api.productDetail(productId);
        setProduct(prod);
        
        // Mocking images if none provided in the product object for demo purposes
        const images = prod.images || [];
        if (images.length > 0) {
          const primary = images.find((i: any) => i.is_primary);
          setMainImage(primary ? primary.image : images[0].image);
        }

        const revs = await api.reviews(productId);
        setReviews(Array.isArray(revs) ? revs : []);
        
        const params = new URLSearchParams({ category: prod.category });
        const related = await api.listProducts(params);
        // Exclude current product and take 4
        setRelatedProducts(
          resultsOf(related)
            .filter((p: ApiProduct) => p.id !== productId)
            .slice(0, 4)
        );
      } catch (err) {
        console.error("Failed to load product details", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert("Please login to add to cart");
      return;
    }
    setAddingToCart(true);
    try {
      await api.addCartItem(null, productId);
      alert("Added to cart!");
    } catch (err) {
      console.error(err);
      alert("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setIsSubmittingReview(true);
    try {
      await api.saveReview(productId, reviewRating, reviewComment);
      const revs = await api.reviews(productId);
      setReviews(Array.isArray(revs) ? revs : []);
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      console.error(err);
      alert("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-cream">
        <Loader2 className="h-8 w-8 animate-spin text-forest" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-96 items-center justify-center bg-cream">
        <p className="text-xl font-serif text-forest">Product not found</p>
      </div>
    );
  }

  const images = product.images?.map((i: any) => i.image) || [];

  return (
    <div className="min-h-screen bg-cream px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Section */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Left: Image Gallery */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="aspect-square overflow-hidden rounded-3xl border border-charcoal/10 bg-white">
              {mainImage ? (
                <img 
                  src={mainImage} 
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-sand-200">
                  <span className="font-serif text-2xl text-forest-500">Farm Fresh</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {images.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setMainImage(img)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                      mainImage === img ? "border-forest" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <span className="inline-block rounded-full bg-forest px-3 py-1 text-xs font-medium text-cream">
                {product.category || "Produce"}
              </span>
              <h1 className="mt-4 font-serif text-4xl text-forest">{product.name}</h1>
              
              <div className="mt-2 flex items-center gap-2">
                <div className="flex text-harvest">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-charcoal/60">({reviews.length} reviews)</span>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <span className="font-display text-4xl font-bold text-forest">
                ₹{Number(product.price).toLocaleString("en-IN")}<span className="text-xl font-normal text-charcoal/60">/{product.unit || "unit"}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-charcoal/70">
              <MapPin className="h-5 w-5" />
              <span>{(product as any).location || "Local Farm"}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-forest">Stock Available</span>
                <span className="text-charcoal/70">{product.quantity || 0} units</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                <div 
                  className="h-full bg-leaf transition-all" 
                  style={{ width: `${Math.min(((product.quantity || 0) / 100) * 100, 100)}%` }}
                />
              </div>
            </div>

            <p className="text-charcoal/80 leading-relaxed">
              {product.description || "Fresh, high-quality produce straight from the farm. Grown with care and harvested at peak ripeness for the best flavor and nutritional value."}
            </p>

            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-4 rounded-full border border-charcoal/20 bg-white px-4 py-2">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-charcoal hover:text-forest transition-colors"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-charcoal hover:text-forest transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={addingToCart || !product.quantity}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-forest py-3 text-cream hover:bg-forest-600 disabled:opacity-50 transition-colors"
                >
                  {addingToCart ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                  Add to Cart
                </button>
                <button 
                  onClick={() => onNavigate('/checkout')}
                  className="flex-1 rounded-full border-2 border-forest py-3 font-medium text-forest hover:bg-forest/5 transition-colors"
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Seller Profile Card */}
            <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-forest">{product.farmer?.username || "Green Valley Farms"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {product.farmer?.farmer_profile?.is_verified && <><ShieldCheck className="h-4 w-4 text-leaf" /><span className="text-sm text-leaf font-medium">Verified Farmer</span></>}
                    {product.farmer?.farmer_profile?.is_verified && product.farmer?.farmer_profile?.organic_certified && <span className="text-sm text-charcoal/50">•</span>}
                    {product.farmer?.farmer_profile?.organic_certified && <span className="text-sm text-clay">Organic Certified</span>}
                  </div>
                </div>
                <button className="text-sm font-medium text-forest underline underline-offset-4 hover:text-leaf">
                  View Farmer
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="mt-20">
          <h2 className="font-serif text-3xl text-forest mb-8">Ratings & Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-6">
              {reviews.length === 0 ? (
                <p className="text-charcoal/60 italic">No reviews yet. Be the first to review this product!</p>
              ) : (
                reviews.map((review: any, idx: number) => (
                  <div key={idx} className="rounded-2xl border border-charcoal/10 bg-white p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-forest">{review.username || "User"}</span>
                      <span className="text-sm text-charcoal/50">{new Date(review.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex text-harvest mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < (review.rating || 5) ? 'fill-current' : 'text-sand-200'}`} />
                      ))}
                    </div>
                    <p className="text-charcoal/80">{review.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-charcoal/10 bg-white p-6 h-fit">
              <h3 className="font-serif text-xl text-forest mb-4">Write a Review</h3>
              {isAuthenticated ? (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm text-charcoal/70 mb-2">Rating</label>
                    <div className="flex gap-1 text-harvest">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star className={`h-6 w-6 ${star <= reviewRating ? 'fill-current' : 'text-sand-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-charcoal/70 mb-2">Comment</label>
                    <textarea 
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      required
                      className="w-full rounded-xl border border-charcoal/20 p-3 outline-none focus:border-forest bg-transparent resize-none"
                      rows={4}
                      placeholder="Share your experience..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmittingReview}
                    className="w-full rounded-full bg-forest py-2.5 text-cream hover:bg-forest-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSubmittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <p className="text-charcoal/70 mb-4">Please log in to write a review.</p>
                  <button 
                    onClick={() => onNavigate('/login')}
                    className="rounded-full bg-forest px-6 py-2 text-cream hover:bg-forest-600"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="font-serif text-3xl text-forest mb-8">Similar Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((prod, idx) => (
                <motion.div
                  key={prod.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => onNavigate(`/products/${prod.id}`)}
                  className="group cursor-pointer rounded-2xl border border-charcoal/10 bg-white overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-square bg-sand-200 overflow-hidden">
                    {prod.images && prod.images.length > 0 ? (
                      <img src={prod.images.find((i: any) => i.is_primary)?.image ?? prod.images[0]?.image} alt={prod.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="font-serif text-forest-500">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-forest">{prod.name}</h3>
                    <p className="font-display font-bold text-lg mt-1 text-forest">₹{prod.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
