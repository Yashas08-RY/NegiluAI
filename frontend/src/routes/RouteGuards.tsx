import { useEffect, type ReactNode } from "react"
import { useAuth } from "../auth/AuthContext"
import { dashboardPathForRole, type Role } from "../types/auth"
import { navigate } from "../navigation"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) return <p className="p-8 text-center font-sans text-charcoal/70">Loading your account…</p>
  if (!isAuthenticated) return null

  return <>{children}</>
}

export function RoleRoute({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useAuth()
  const activeRole = auth.user?.role || auth.role

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      } else if (activeRole !== role) {
        // A valid session with the wrong role should return to that user's
        // own workspace rather than leave them on an inaccessible route.
        navigate(dashboardPathForRole(activeRole || "consumer"))
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, activeRole, role])

  if (auth.isLoading) return <p className="p-8 text-center font-sans text-charcoal/70">Loading your account…</p>
  if (!auth.isAuthenticated || activeRole !== role) return null

  return <>{children}</>
}
