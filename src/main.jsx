import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CrearCuenta from './crearcuenta.jsx'
import Bienvenida from './bienvenida.jsx'
import Perfil from './perfil.jsx'
import Notas from './notas.jsx'

const root = createRoot(document.getElementById('root'))

// Utilidad para leer usuario de localStorage de forma segura
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

// Auto-logout por inactividad (15 minutos)
let inactivityTimer = null
const INACTIVITY_MS = 15 * 60 * 1000
const resetInactivity = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  const u = getUser()
  if (!u) return
  inactivityTimer = setTimeout(() => {
    try { localStorage.removeItem('user') } catch {}
    window.location.hash = '#/login'
    // Feedback ligero; si no deseas alert, puedes quitarlo
    alert('Sesión cerrada por inactividad (15 minutos).')
  }, INACTIVITY_MS)
}
;['mousemove','keydown','click','scroll','touchstart'].forEach((ev) => {
  window.addEventListener(ev, resetInactivity)
})
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resetInactivity()
})

const render = () => {
  const hash = window.location.hash
  const isSignup = hash.includes('signup')
  const isWelcome = hash.includes('welcome')
  const isProfile = hash.includes('perfil')
  const isNotes = hash.includes('notas')
  const isLogin = hash.includes('login') || hash === ''
  const u = getUser()

  // Protección ligera: si intenta acceder a welcome sin usuario, redirige a login
  if (isWelcome) {
    if (!u) window.location.hash = '#/login'
  }

  // Bloquear retroceso manual a login si hay sesión activa
  if (isLogin && u) {
    window.location.hash = '#/welcome'
    return
  }

  root.render(
    <StrictMode>
      {isSignup ? <CrearCuenta /> : isWelcome ? <Bienvenida /> : isNotes ? <Notas /> : isProfile ? <Perfil /> : <App />}
    </StrictMode>
  )

  // Reiniciar contador de inactividad en cada render
  resetInactivity()
}

if (!window.location.hash) window.location.hash = '#/login'
render()
window.addEventListener('hashchange', render)
