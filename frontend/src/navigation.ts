export const ROUTE_CHANGE_EVENT = "app_route_change"

export function navigate(path: string) {
  const currentFull = window.location.pathname + window.location.search + window.location.hash
  if (currentFull !== path) {
    window.history.pushState({}, "", path)
  }
  window.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, { detail: path }))
  window.dispatchEvent(new PopStateEvent("popstate"))
}
