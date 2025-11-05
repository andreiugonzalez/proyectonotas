import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CrearCuenta from './crearcuenta.jsx'

const root = createRoot(document.getElementById('root'))

const render = () => {
  const isSignup = window.location.hash.includes('signup')
  root.render(
    <StrictMode>
      {isSignup ? <CrearCuenta /> : <App />}
    </StrictMode>
  )
}

if (!window.location.hash) window.location.hash = '#/login'
render()
window.addEventListener('hashchange', render)
