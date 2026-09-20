import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Package, Plus, Edit2, Trash2, Star, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { api, resultsOf } from "../api";

const money = (v: string | number) => '₹' + Number(v).toLocaleString('en-IN');

export default function FarmerProductsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "", category: "Vegetables", description: "", price: "", unit: "kg", quantity: "", location: ""
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.farmerProducts();
      setProducts(resultsOf(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category || 'Vegetables',
      description: product.description || '',
      price: product.price?.toString() || '0',
      unit: product.unit || 'kg',
      quantity: product.quantity?.toString() || '0',
      location: product.location || ''
    });
    const primaryImg = product.images?.find((i: any) => i.is_primary)?.image || product.images?.[0]?.image;
    setImagePreview(primaryImg || null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.deleteProduct(id);
        loadProducts();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity)
      };
      let product: any;
      if (editingId) {
        product = await api.updateProduct(editingId, payload);
      } else {
        product = await api.createProduct(payload);
      }

      if (imageFile && product?.id) {
        const imgData = new FormData();
        imgData.append("image", imageFile);
        imgData.append("is_primary", "true");
        await api.uploadProductImage(product.id, imgData);
      }

      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      loadProducts();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: "", category: "Vegetables", description: "", price: "", unit: "kg", quantity: "", location: "" });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const availableCount = products.filter(p => p.quantity > 0).length;

  return (
    <div className="min-h-screen bg-cream p-6 md:p-10 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif text-forest mb-2">My Products</h1>
          <div className="flex gap-4 text-sm text-charcoal/70">
            <span className="bg-white px-3 py-1 rounded-full border border-charcoal/10 shadow-sm">Total: {products.length}</span>
            <span className="bg-leaf/10 text-leaf px-3 py-1 rounded-full font-medium">Available: {availableCount}</span>
            <span className="bg-clay/10 text-clay px-3 py-1 rounded-full font-medium">Out of stock: {products.length - availableCount}</span>
          </div>
        </div>
        <button onClick={openNew} className="bg-forest text-cream px-6 py-3 rounded-full font-medium hover:bg-forest-600 transition flex items-center gap-2 shadow-lg">
          <Plus size={20} /> Add New Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-charcoal/10 shadow-sm">
          <div className="bg-sand p-6 rounded-full text-forest/50 mb-4"><Package size={48} /></div>
          <h2 className="text-xl font-serif text-forest mb-2">No products yet</h2>
          <p className="text-charcoal/60 mb-6">Start listing your produce to sell to consumers.</p>
          <button onClick={openNew} className="bg-forest text-cream px-6 py-3 rounded-full font-medium hover:bg-forest-600 transition shadow-md">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              key={product.id} 
              className="bg-white rounded-3xl border border-charcoal/10 overflow-hidden shadow-sm hover:shadow-lg transition group flex flex-col"
            >
              <div className="h-48 bg-sand relative overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img src={product.images.find((i: any) => i.is_primary)?.image ?? product.images[0]?.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal/20"><Package size={48} /></div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-forest shadow-sm">
                    {product.category || 'Product'}
                  </span>
                  {product.approval_status === 'pending' && (
                    <span className="bg-amber-100/90 text-amber-900 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
                      Pending Review
                    </span>
                  )}
                  {product.approval_status === 'rejected' && (
                    <span className="bg-red-100/90 text-red-800 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
                      Rejected
                    </span>
                  )}
                  {product.approval_status === 'approved' && (
                    <span className="bg-emerald-100/90 text-emerald-800 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
                      Approved
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleEdit(product)} className="p-2 bg-white rounded-full text-forest hover:bg-sand transition shadow-md"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(product.id)} className="p-2 bg-white rounded-full text-clay hover:bg-red-50 transition shadow-md"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-lg text-forest font-semibold line-clamp-1">{product.name}</h3>
                  <div className="flex items-center text-harvest text-sm font-medium">
                    <Star size={14} className="fill-current mr-1" /> {product.average_rating ?? 0}
                  </div>
                </div>
                <p className="text-xl font-display text-forest mb-4 font-semibold">{money(product.price)} <span className="text-sm text-charcoal/50 font-sans font-normal">/ {product.unit || 'unit'}</span></p>
                
                <div className="mt-auto space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-charcoal/60 mb-1.5 font-medium">
                      <span>Stock: {product.quantity} {product.unit || ''}</span>
                      <span className={product.quantity > 0 ? "text-leaf" : "text-clay"}>{product.quantity > 0 ? "In Stock" : "Out of Stock"}</span>
                    </div>
                    <div className="w-full bg-sand rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${product.quantity > 50 ? 'bg-leaf' : product.quantity > 0 ? 'bg-harvest' : 'bg-clay'}`} style={{ width: `${Math.min((product.quantity / 200) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={() => !submitting && setShowModal(false)} />
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-charcoal/10 flex justify-between items-center z-20">
                <h2 className="text-2xl font-serif text-forest">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => !submitting && setShowModal(false)} className="p-2 text-charcoal/50 hover:bg-sand rounded-full transition"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Product Name</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition" placeholder="e.g., Organic Tomatoes" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition">
                      {['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Plantation', 'Fibre', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Price (₹)</label>
                    <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Unit</label>
                    <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition">
                      {['kg', 'qtl', 'dozen', 'piece', 'bundle'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Quantity</label>
                    <input required type="number" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition" placeholder="Available stock" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Location</label>
                    <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition" placeholder="Farm location" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-charcoal/80">Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-sand/30 focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest outline-none transition resize-none" placeholder="Describe your product..."></textarea>
                  </div>

                  {/* Interactive Product Image Dropzone & Preview */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-charcoal/80 mb-2 block">Product Image</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    {imagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-charcoal/15 bg-sand/20 p-2 flex items-center gap-4">
                        <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-charcoal/10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-forest truncate">{imageFile ? imageFile.name : "Current Product Image"}</p>
                          <p className="text-xs text-charcoal/50 mt-1">
                            {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : "Click below to change image"}
                          </p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="p-2 text-clay hover:bg-red-50 rounded-full transition mr-2"
                          title="Remove image"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-charcoal/20 rounded-2xl p-8 text-center hover:bg-sand/50 transition cursor-pointer bg-sand/20"
                      >
                        <Upload className="mx-auto text-charcoal/40 mb-2" size={32} />
                        <p className="text-sm font-medium text-forest">Click to upload or drag and drop</p>
                        <p className="text-xs text-charcoal/40 mt-1">PNG, JPG, WEBP or GIF (MAX. 5 MB)</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-6 flex justify-end gap-3 border-t border-charcoal/10">
                  <button type="button" disabled={submitting} onClick={() => setShowModal(false)} className="px-6 py-3 rounded-full font-medium text-charcoal/70 hover:bg-sand transition">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-3 rounded-full font-medium bg-forest text-cream hover:bg-forest-600 transition shadow-lg flex items-center gap-2">
                    {submitting ? <><Loader2 className="animate-spin" size={18} /> Uploading &amp; Saving...</> : (editingId ? 'Save Changes' : 'Create Product')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
