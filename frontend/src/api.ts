import { request } from "./api/client"
import type { AuthResponse, Profile, RegisterInput } from "./types/auth"
import type { Product, ProductImage, ProductInput, Review } from "./types/product"

export type ApiProduct = {
  id: number
  name: string
  category: string
  description: string
  price: string
  unit: string
  quantity: number
  location: string
  is_available: boolean
  approval_status: "pending" | "approved" | "rejected"
  moderation_note: string
  average_rating: number
  review_count: number
  farmer: { id?: number; username: string; farmer_profile?: { farm_name?: string; organic_certified?: boolean; is_verified?: boolean; phone?: string; district?: string; state?: string; village?: string; bio?: string; profile_picture?: string | null } | null }
  images: { id?: number; image: string; alt_text: string; is_primary: boolean }[]
  created_at?: string
  updated_at?: string
}

export type ProductListResponse = { count: number; next: string | null; previous: string | null; results: ApiProduct[] }
export type FarmerOverview = { total_products: number; available_products: number; total_orders: number; items_sold: number; total_revenue: string }
export type ApiCartItem = { id: number; product: number; product_details: ApiProduct; quantity: number; created_at?: string }
export type ApiCart = { id: number; items: ApiCartItem[]; created_at?: string; updated_at?: string }
export type ApiProfile = Profile

export type ApiOrder = {
  id: number
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
  total_amount: string
  delivery_address: string
  items: ApiOrderItem[]
  created_at: string
  updated_at: string
}

export type ApiOrderItem = {
  id: number
  product: number
  product_details?: ApiProduct
  product_name: string
  unit_price: string
  quantity: number
  subtotal: string
}

export type FarmerSaleItem = {
  id: number
  order_id: number
  order_status: string
  buyer_username: string
  ordered_at: string
  product: number
  product_name: string
  unit_price: string
  quantity: number
  subtotal: string
}

export type ApiWishlistItem = {
  id: number
  product: number
  product_details?: ApiProduct
  created_at: string
}
export type BaselinePrediction = { prediction: number; unit: string; model_type: "baseline"; disclaimer: string }

/** Dashboard endpoints may be deliberately unpaginated; normalize both response shapes at their boundary. */
export function resultsOf<T>(response: T[] | { results?: T[] } | null | undefined): T[] {
  return Array.isArray(response) ? response : response?.results ?? []
}

const withToken = (token?: string | null) => token ? { headers: { Authorization: `Bearer ${token}` } } : {}

/** All requests use the configured auth client; explicit token is kept for existing marketplace callers. */
export const api = {
  // Products
  listProducts: (params: URLSearchParams) => request<ProductListResponse>(`/products/?${params}`),
  productDetail: (id: number) => request<ApiProduct>(`/products/${id}/`),

  // Auth
  login: (username: string, password: string) => request<AuthResponse>("/login/", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (data: RegisterInput) => request<{ message: string }>("/register/", { method: "POST", body: JSON.stringify(data) }),
  profile: (token?: string) => request<ApiProfile>("/profile/", withToken(token)),
  updateProfile: (data: Partial<ApiProfile>) => request<ApiProfile>("/profile/", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string; confirm_password: string }) => request<{ message: string }>("/profile/change-password/", { method: "POST", body: JSON.stringify(data) }),
  refreshToken: (refresh: string) => request<{ access: string }>("/token/refresh/", { method: "POST", body: JSON.stringify({ refresh }) }),
  sendPasswordResetOtp: (email: string) => request<{ message: string }>("/auth/send-otp/", { method: "POST", body: JSON.stringify({ email }) }),
  verifyPasswordResetOtp: (email: string, code: string) => request<{ reset_token: string }>("/auth/verify-otp/", { method: "POST", body: JSON.stringify({ email, code }) }),
  resetPassword: (email: string, reset_token: string, password: string) => request<{ message: string }>("/auth/reset-password/", { method: "POST", body: JSON.stringify({ email, reset_token, password }) }),

  // Wishlist
  // Wishlist
wishlist: (token?: string | null) =>
  request<{ results?: ApiWishlistItem[] } | ApiWishlistItem[]>("/wishlist/", withToken(token)),

toggleWishlist: (token: string | undefined | null, product_id: number) =>
  request<{ status: "added" | "removed" }>("/wishlist/toggle/", {
    method: "POST",
    body: JSON.stringify({ product_id }),
    ...withToken(token),
  }),

  // Cart
  cart: (token?: string | undefined | null) => request<ApiCart>("/carts/current/", withToken(token)),
  addCartItem: (token: string | undefined | null, product: number) => request<ApiCartItem>("/cart-items/", { method: "POST", body: JSON.stringify({ product, quantity: 1 }), ...withToken(token) }),
  updateCartItem: (token: string | undefined | null, id: number, quantity: number) => request<ApiCartItem>(`/cart-items/${id}/`, { method: "PATCH", body: JSON.stringify({ quantity }), ...withToken(token) }),
  deleteCartItem: (token: string | undefined | null, id: number) => request<void>(`/cart-items/${id}/`, { method: "DELETE", ...withToken(token) }),

  // Checkout & Orders
  checkout: (delivery_address: string) => request<{ message?: string; order?: ApiOrder } & ApiOrder>("/carts/checkout/", { method: "POST", body: JSON.stringify({ delivery_address }) }),
  orders: () => request<{ count: number; results: ApiOrder[] }>("/orders/"),
  orderDetail: (id: number) => request<ApiOrder>(`/orders/${id}/`),
  createPaymentOrder: (id: number) => request<{ razorpay_order_id: string; amount: number; currency: string; key_id: string; is_demo?: boolean }>(`/orders/${id}/create-payment-order/`, { method: "POST" }),
  verifyPayment: (id: number, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => request<{ message: string; order_id: number; order_status: ApiOrder["status"]; payment_status: string }>(`/orders/${id}/verify-payment/`, { method: "POST", body: JSON.stringify(data) }),
  cancelOrder: (id: number) => request<{ message: string; order_status: string }>(`/orders/${id}/cancel/`, { method: "POST" }),
  transitionFarmerOrder: (id: number, data: { status: "processing" | "shipped" | "delivered"; courier_name?: string; tracking_id?: string }) => request<ApiOrder>(`/farmer/orders/${id}/transition/`, { method: "POST", body: JSON.stringify(data) }),

  // Predictions are proxied by Django; the browser never calls the ML service directly.
  predictYield: (data: { crop: string; area_hectares: number; previous_yield_t_per_hectare?: number; season?: "kharif" | "rabi" | "zaid" }) => request<BaselinePrediction>("/predictions/yield/", { method: "POST", body: JSON.stringify(data) }),
  predictPrice: (data: { crop: string; location: string; season?: "kharif" | "rabi" | "zaid" }) => request<BaselinePrediction>("/predictions/price/", { method: "POST", body: JSON.stringify(data) }),

  // Farmer product management
  createProduct: (data: ProductInput) => request<Product>("/products/", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: Partial<ProductInput>) => request<Product>(`/products/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (id: number) => request<void>(`/products/${id}/`, { method: "DELETE" }),
  productImages: (id: number) => request<ProductImage[]>(`/products/${id}/images/`),
  uploadProductImage: (id: number, data: FormData) => request<ProductImage>(`/products/${id}/images/`, { method: "POST", body: data }),
  deleteProductImage: (productId: number, imageId: number) => request<void>(`/products/${productId}/images/${imageId}/`, { method: "DELETE" }),
  setPrimaryProductImage: (productId: number, imageId: number) => request<ProductImage>(`/products/${productId}/images/${imageId}/primary/`, { method: "POST" }),

  // Reviews
  reviews: (id: number) => request<Review[]>(`/products/${id}/reviews/`),
  saveReview: (id: number, rating: number, comment: string) => request<Review>(`/products/${id}/reviews/`, { method: "POST", body: JSON.stringify({ rating, comment }) }),

  // Farmer Dashboard
  farmerOverview: () => request<FarmerOverview>("/dashboard/farmer/overview/"),
  farmerProducts: (params?: URLSearchParams) => request<ApiProduct[] | ProductListResponse>(`/dashboard/farmer/products/${params ? `?${params}` : ""}`),
  farmerSales: (params?: URLSearchParams) => request<{ count: number; results: FarmerSaleItem[] }>(`/dashboard/farmer/sales/${params ? `?${params}` : ""}`),

  // Consumer Dashboard
  consumerOverview: () => request<{ total_orders: number; total_spent: string; wishlist_count: number; cart_count: number }>("/dashboard/consumer/overview/"),

  // Admin Dashboard
  adminOverview: () => request<{ total_users: number; total_farmers: number; total_consumers: number; total_products: number; total_orders: number; total_revenue: string; pending_verifications: number; pending_approvals: number }>("/dashboard/admin/overview/"),
  adminUsers: () => request<{ count: number; results: any[] }>("/dashboard/admin/users/"),
  adminVerifyFarmer: (userId: number) => request<{ status: string; is_verified: boolean }>(`/dashboard/admin/users/${userId}/verify/`, { method: "POST" }),
  adminApproveProduct: (productId: number, approval_status: "approved" | "rejected" | "pending" = "approved", moderation_note = "") => request<{ status: string; approval_status: string; moderation_note: string }>(`/dashboard/admin/products/${productId}/approve/`, { method: "POST", body: JSON.stringify({ status: approval_status, moderation_note }) }),
}
