export type Role = "farmer" | "consumer" | "admin"

/** The only default destinations used after authentication or a role mismatch. */
export function dashboardPathForRole(role: Role): string {
  if (role === "farmer") return "/farmer/dashboard"
  if (role === "admin") return "/admin/dashboard"
  return "/consumer/dashboard"
}

/**
 * Keep an intended destination only when it belongs to the account that just
 * authenticated. This prevents a stale `next` query from sending a Consumer
 * to a Farmer/Admin route (where the route guard would immediately deny it).
 */
export function postLoginPath(role: Role, next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return dashboardPathForRole(role)
  }

  const pathname = next.split("?")[0].split("#")[0]
  const allowed =
    role === "consumer"
      ? ["/consumer/dashboard", "/consumer-dashboard", "/orders", "/wishlist", "/cart", "/profile"].includes(pathname)
      : role === "farmer"
        ? pathname.startsWith("/farmer/") || ["/profile", "/ai-predict"].includes(pathname)
        : pathname.startsWith("/admin/") || pathname === "/profile"

  return allowed ? next : dashboardPathForRole(role)
}

export interface User {
  username: string
  email: string
  role: Role
}

export interface Profile extends User {
  is_staff?: boolean
  is_superuser?: boolean
  farmer_profile?: {
    farm_name: string
    phone: string
    district: string
    state: string
    village: string
    organic_certified?: boolean
    bio?: string
  } | null
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse extends AuthTokens {
  user?: User
}

export interface LoginInput {
  username: string
  password: string
}

export interface FarmerRegistrationFields {
  farmName: string
  phone: string
  district: string
  state: string
  village: string
}

export interface RegisterInput extends LoginInput {
  email: string
  role: Role
  first_name?: string
  last_name?: string
  website?: string
  farmerProfile?: FarmerRegistrationFields
}

export interface ApiErrorShape {
  detail?: string
  error?: string
  [field: string]: unknown
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: ApiErrorShape | null,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
