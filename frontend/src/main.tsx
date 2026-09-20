import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import CookieConsent from './components/CookieConsent'
import LoadingSpinner from './components/ui/LoadingSpinner'
import './index.css'

if (import.meta.env.PROD && window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  window.location.replace(`https:${window.location.href.slice(window.location.protocol.length)}`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
        <App />
      </Suspense>
      <CookieConsent />
    </AuthProvider>
  </React.StrictMode>,
)
