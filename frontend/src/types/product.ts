import type { User } from "./auth"

export interface ProductImage { id: number; image: string; alt_text: string; is_primary: boolean }
export interface Product {
  id: number; name: string; category: string; description: string; price: string; unit: string; quantity: number; location: string
  is_available: boolean; average_rating: number; review_count: number; farmer: Pick<User, "username"> & { id?: number }; images: ProductImage[]
}

export interface ProductInput { name: string; category: string; description: string; price: number; unit: string; quantity: number; location: string; is_available?: boolean }
export interface Review { id: number; rating: number; comment: string; user?: Pick<User, "username">; created_at?: string }
