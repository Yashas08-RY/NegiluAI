import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MoreVertical,
  X,
  MapPin,
  Package,
  Calendar,
  Tag,
  User,
} from "lucide-react";
import { api, resultsOf, type ApiProduct } from "../api";

const INITIAL_MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Fresh Strawberries",
    farmer: "Lakshmi Nair",
    category: "Fruits",
    price: 280,
    unit: "kg",
    quantity: 50,
    location: "Mahabaleshwar, Maharashtra",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop",
    submitted: "2025-08-01",
    description: "Farm fresh organic strawberries handpicked at peak ripeness.",
  },
  {
    id: 2,
    name: "Organic Basmati Rice",
    farmer: "Harjeet Singh",
    category: "Grains",
    price: 120,
    unit: "kg",
    quantity: 500,
    location: "Ludhiana, Punjab",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
    submitted: "2025-08-05",
    description:
      "Premium long-grain aged basmati rice cultivated using traditional organic methods.",
  },
  {
    id: 3,
    name: "Alphonso Mangoes",
    farmer: "Ramesh Patel",
    category: "Fruits",
    price: 800,
    unit: "dozen",
    quantity: 100,
    location: "Ratnagiri, Maharashtra",
    status: "approved",
    image:
      "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=400&fit=crop",
    submitted: "2025-07-28",
    description: "Authentic Ratnagiri Alphonso mangoes, naturally ripened.",
  },
  {
    id: 4,
    name: "Red Onions",
    farmer: "Kisan Rao",
    category: "Vegetables",
    price: 35,
    unit: "kg",
    quantity: 1000,
    location: "Nashik, Maharashtra",
    status: "approved",
    image:
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=400&fit=crop",
    submitted: "2025-07-15",
    description: "Crisp and pungent red onions ideal for culinary use.",
  },
  {
    id: 5,
    name: "Turmeric Powder",
    farmer: "Meera Reddy",
    category: "Spices",
    price: 250,
    unit: "kg",
    quantity: 200,
    location: "Warangal, Telangana",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=400&fit=crop",
    submitted: "2025-08-07",
    description:
      "High curcumin content turmeric powder, shade dried and stone ground.",
  },
  {
    id: 6,
    name: "Green Cardamom",
    farmer: "Joseph Kurian",
    category: "Spices",
    price: 3200,
    unit: "kg",
    quantity: 20,
    location: "Idukki, Kerala",
    status: "approved",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop",
    submitted: "2025-07-10",
    description: "Export quality 8mm green cardamom pods.",
  },
  {
    id: 7,
    name: "Desi Ghee",
    farmer: "Kavita Devi",
    category: "Dairy",
    price: 850,
    unit: "L",
    quantity: 50,
    location: "Guntur, Andhra Pradesh",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1645040643522-83dc70fc565c?w=400&h=400&fit=crop",
    submitted: "2025-08-06",
    description: "Pure A2 cow ghee made using traditional bilona method.",
  },
  {
    id: 8,
    name: "Cauliflower",
    farmer: "Rajesh Chauhan",
    category: "Vegetables",
    price: 40,
    unit: "piece",
    quantity: 300,
    location: "Shimla, Himachal Pradesh",
    status: "approved",
    image:
      "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=400&fit=crop",
    submitted: "2025-08-02",
    description: "Pesticide-free fresh cauliflower heads.",
  },
  {
    id: 9,
    name: "Honey",
    farmer: "Amitabh Sharma",
    category: "Pantry",
    price: 450,
    unit: "kg",
    quantity: 80,
    location: "Dehradun, Uttarakhand",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1587049352847-81a56d773cac?w=400&h=400&fit=crop",
    submitted: "2025-08-08",
    description:
      "Raw, unfiltered multi-flora honey from the Himalayan foothills.",
  },
  {
    id: 10,
    name: "Black Pepper",
    farmer: "Suresh Naidu",
    category: "Spices",
    price: 750,
    unit: "kg",
    quantity: 150,
    location: "Chittoor, Andhra Pradesh",
    status: "approved",
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop",
    submitted: "2025-07-20",
    description: "Bold and aromatic black peppercorns.",
  },
];

interface AdminProductsPageProps {
  onNavigate: (path: string) => void;
}

export default function AdminProductsPage({
  onNavigate,
}: AdminProductsPageProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">(
    "pending",
  );
  const [selectedProduct, setSelectedProduct] = useState<
    (typeof INITIAL_MOCK_PRODUCTS)[0] | null
  >(null);
  const [toastMessage, setToastMessage] = useState("");

  const loadProducts = async () => {
    try {
      const data = await api.listProducts(new URLSearchParams({ ordering: "-created_at" }));
      setProducts(resultsOf(data).map((product: ApiProduct) => ({
        id: product.id,
        name: product.name,
        farmer: product.farmer.farmer_profile?.farm_name || product.farmer.username,
        category: product.category,
        price: Number(product.price),
        unit: product.unit,
        quantity: product.quantity,
        location: product.location,
        status: product.approval_status,
        image: product.images.find((image) => image.is_primary)?.image || product.images[0]?.image || "",
        submitted: product.created_at || new Date().toISOString(),
        description: product.description,
      })));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load product listings");
    }
  };

  useEffect(() => { void loadProducts(); }, []);

  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return products;
    return products.filter((p) => p.status === activeTab);
  }, [products, activeTab]);

  const pendingCount = products.filter((p) => p.status === "pending").length;

  const handleStatusChange = async (
    id: number,
    newStatus: "approved" | "rejected",
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();

    try {
      await api.adminApproveProduct(id, newStatus);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      showToast(newStatus === "approved" ? "Product approved successfully" : "Product rejected successfully");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update product status");
      return;
    }

    if (selectedProduct?.id === id) {
      if (newStatus === "rejected") {
        setSelectedProduct({ ...selectedProduct, status: newStatus });
      } else {
        setSelectedProduct({ ...selectedProduct, status: newStatus });
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-cream font-sans pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-serif text-forest font-bold tracking-tight">
                Product Approvals
              </h1>
              {pendingCount > 0 && (
                <span className="bg-clay text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-charcoal/70 mt-1">
              Review and manage farmer product listings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-sand-200/50 p-1.5 rounded-2xl w-full md:w-max mb-8 border border-charcoal/5">
          {(["pending", "approved", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:w-32 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
                activeTab === tab
                  ? "bg-white text-forest shadow-sm border border-charcoal/5"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
              >
                <div className="relative h-48 w-full overflow-hidden bg-sand">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-forest shadow-sm">
                      {product.category}
                    </span>
                  </div>
                  {product.status === "approved" && (
                    <div className="absolute top-3 right-3 bg-leaf text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-charcoal leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <div className="text-forest font-display font-bold text-xl mb-3">
                    {formatPrice(product.price)}{" "}
                    <span className="text-sm text-charcoal/50 font-sans font-normal">
                      / {product.unit}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-charcoal/70 mb-4 flex-1">
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" /> <span>{product.farmer}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />{" "}
                      <span className="truncate">{product.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />{" "}
                      <span>
                        Submitted:{" "}
                        {new Date(product.submitted).toLocaleDateString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4" />{" "}
                      <span>
                        Stock: {product.quantity} {product.unit}
                      </span>
                    </div>
                  </div>

                  {product.status === "pending" && (
                    <div className="flex gap-2 mt-auto pt-4 border-t border-charcoal/10">
                      <button
                        onClick={(e) =>
                          handleStatusChange(product.id, "approved", e)
                        }
                        className="flex-1 py-2 bg-leaf text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors flex justify-center items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={(e) =>
                          handleStatusChange(product.id, "rejected", e)
                        }
                        className="flex-1 py-2 border border-clay text-clay text-sm font-semibold rounded-xl hover:bg-clay/5 transition-colors flex justify-center items-center gap-1"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-charcoal/50 bg-white rounded-3xl border border-charcoal/10 border-dashed">
              <Package className="h-12 w-12 mb-4 text-charcoal/20" />
              <p className="text-lg font-medium">
                No products found in this category.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product Preview Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative h-64 sm:h-80 w-full shrink-0">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full text-charcoal hover:bg-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                {selectedProduct.status === "approved" && (
                  <div className="absolute top-4 left-4 bg-leaf text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Approved Product
                  </div>
                )}
                {selectedProduct.status === "pending" && (
                  <div className="absolute top-4 left-4 bg-harvest text-forest px-3 py-1.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5">
                    <Package className="h-4 w-4" /> Pending Approval
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-forest mb-2">
                      {selectedProduct.name}
                    </h2>
                    <span className="inline-block bg-sand px-3 py-1 rounded-lg text-sm font-medium text-forest">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-display font-bold text-forest">
                      {formatPrice(selectedProduct.price)}
                    </div>
                    <div className="text-charcoal/60">
                      per {selectedProduct.unit}
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm text-charcoal/80 mb-8">
                  <p>{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-sand-200/50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl text-forest shadow-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-charcoal/50 uppercase font-semibold">
                        Farmer
                      </div>
                      <div className="font-bold text-charcoal">
                        {selectedProduct.farmer}
                      </div>
                    </div>
                  </div>
                  <div className="bg-sand-200/50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl text-forest shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-charcoal/50 uppercase font-semibold">
                        Location
                      </div>
                      <div className="font-bold text-charcoal">
                        {selectedProduct.location}
                      </div>
                    </div>
                  </div>
                  <div className="bg-sand-200/50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl text-forest shadow-sm">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-charcoal/50 uppercase font-semibold">
                        Available Stock
                      </div>
                      <div className="font-bold text-charcoal">
                        {selectedProduct.quantity} {selectedProduct.unit}
                      </div>
                    </div>
                  </div>
                  <div className="bg-sand-200/50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl text-forest shadow-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-charcoal/50 uppercase font-semibold">
                        Submission Date
                      </div>
                      <div className="font-bold text-charcoal">
                        {new Date(selectedProduct.submitted).toLocaleDateString(
                          "en-IN",
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProduct.status === "pending" && (
                  <div className="flex gap-4 pt-4 border-t border-charcoal/10">
                    <button
                      onClick={() =>
                        handleStatusChange(selectedProduct.id, "rejected")
                      }
                      className="flex-1 py-3.5 border-2 border-clay text-clay font-bold rounded-2xl hover:bg-clay hover:text-white transition-all flex justify-center items-center gap-2"
                    >
                      <XCircle className="h-5 w-5" /> Reject Listing
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(selectedProduct.id, "approved")
                      }
                      className="flex-1 py-3.5 bg-leaf text-white font-bold rounded-2xl hover:bg-green-600 transition-all flex justify-center items-center gap-2 shadow-lg shadow-leaf/20"
                    >
                      <CheckCircle className="h-5 w-5" /> Approve Listing
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-charcoal text-white px-6 py-3 rounded-full shadow-xl font-medium text-sm z-50 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-leaf" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
