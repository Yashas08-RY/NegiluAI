import { ApiError, type ApiErrorShape } from "../types/auth"

const DEFAULT_API_BASE_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  ? "http://127.0.0.1:8000/api"
  : `${window.location.origin}/api`
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "")

let getAccessToken: (() => string | null) | undefined
let onUnauthorized: (() => void) | undefined

export function configureApiClient(config: {
  getAccessToken: () => string | null
  onUnauthorized: () => void
}) {
  getAccessToken = config.getAccessToken
  onUnauthorized = config.onUnauthorized
}

function errorMessage(data: ApiErrorShape | null): string {
  const value = data?.detail ?? data?.error ?? (data ? Object.values(data)[0] : undefined)
  if (Array.isArray(value)) return String(value[0])
  return value ? String(value) : "Something went wrong. Please try again."
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken?.()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (err: any) {
    throw new ApiError(
      0,
      { error: "Unable to connect to the server. Please verify the backend service is running." },
      "Unable to connect to backend server (http://127.0.0.1:8000). Please check your connection."
    )
  }
  const data = (await response.json().catch(() => null)) as ApiErrorShape | null
  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.()
    throw new ApiError(response.status, data, errorMessage(data))
  }
  return data as T
}
