import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { configureApiClient, request } from "../api/client"
import type { AuthResponse, AuthTokens, LoginInput, Profile, RegisterInput, Role, User } from "../types/auth"
import { navigate } from "../navigation"

const STORAGE_KEY = "negiluai.auth"

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  role: Role | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  refreshProfile: () => Promise<User>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredAuth(): { tokens: AuthTokens; user: User } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    return parsed?.tokens?.access && parsed?.tokens?.refresh && parsed?.user ? parsed : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => readStoredAuth()?.tokens ?? null)
  const tokensRef = useRef<AuthTokens | null>(tokens)
  const [user, setUser] = useState<User | null>(() => readStoredAuth()?.user ?? null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
  localStorage.removeItem(STORAGE_KEY)
  tokensRef.current = null
  setTokens(null)
  setUser(null)
}, [])

  const persist = useCallback((nextTokens: AuthTokens, nextUser: User) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens: nextTokens, user: nextUser }))
  tokensRef.current = nextTokens
  setTokens(nextTokens)
  setUser(nextUser)
}, [])

  const resolveRole = (profile: Partial<Profile>, fallbackRole?: Role | null): Role => {
    if (profile.role && (profile.role === "farmer" || profile.role === "consumer" || profile.role === "admin")) {
      return profile.role
    }
    if (fallbackRole && (fallbackRole === "farmer" || fallbackRole === "consumer" || fallbackRole === "admin")) {
      return fallbackRole
    }
    if (profile.is_staff || profile.is_superuser) {
      return "admin"
    }
    return "consumer"
  }

  const refreshProfile = useCallback(async () => {
    const profile = await request<Profile>("/profile/")
    if (!tokens) throw new Error("You are not logged in.")
    const normalizedUser: User = {
      ...profile,
      role: resolveRole(profile, user?.role),
    }
    persist(tokens, normalizedUser)
    return normalizedUser
  }, [persist, tokens, user?.role])

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => tokensRef.current?.access ?? null,
      onUnauthorized: () => {
        logout()
        const destination = `${window.location.pathname}${window.location.search}`
        if (window.location.pathname !== "/login") {navigate(`/login?next=${encodeURIComponent(destination)}`)
      }
    },
  })
}, [logout])

  useEffect(() => {
    if (!tokens) {
      setIsLoading(false)
      return
    }
    refreshProfile().catch(logout).finally(() => setIsLoading(false))
  }, []) // Restore once; the stored user remains available during hydration.

  const login = useCallback(async (input: LoginInput) => {
    const response = await request<AuthResponse>("/login/", { method: "POST", body: JSON.stringify(input) })
    const profile = await request<Profile>("/profile/", {
      headers: { Authorization: `Bearer ${response.access}` },
    })
    const normalizedUser: User = {
      ...profile,
      role: resolveRole(profile, response.user?.role),
    }
    persist({ access: response.access, refresh: response.refresh }, normalizedUser)
    return normalizedUser
  }, [persist])

  const register = useCallback(async ({ farmerProfile, ...input }: RegisterInput) => {
    await request<{ message: string }>("/register/", {
      method: "POST",
      body: JSON.stringify({ ...input, ...(farmerProfile ? { farmer_profile: farmerProfile } : {}) }),
    })
    return login({ username: input.username, password: input.password })
  }, [login])

  const value = useMemo<AuthContextValue>(() => ({
    user, isAuthenticated: Boolean(user && tokens), role: user?.role ?? null, isLoading, login, register, logout, refreshProfile,
  }), [isLoading, login, logout, refreshProfile, register, tokens, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
