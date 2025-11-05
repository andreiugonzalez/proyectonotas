import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState({ loading: true })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Esta vista es solo para login

  // Verifica el estado de la conexión a DB
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        setHealth({ loading: false, data })
      } catch (e) {
        setHealth({ loading: false, error: e.message })
      }
    }
    run()
  }, [])

  // Navegación por hash se maneja en main.jsx

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Ingresa correo y contraseña')
      return
    }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error de inicio de sesión')
      try {
        localStorage.setItem('user', JSON.stringify(data.user || { email }))
      } catch {}
      window.location.hash = '#/welcome'
    } catch (err) {
      alert(`No se pudo iniciar sesión: ${err.message}`)
    }
  }

  return (
    <div className="animated-bg min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="bg-blobs">
        <span className="blob blob--1"></span>
        <span className="blob blob--2"></span>
        <span className="blob blob--3"></span>
      </div>
      <div className="content-layer w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* Panel izquierdo: branding */}
        <div className="relative px-10 py-12 md:py-16 bg-gradient-to-br from-indigo-900 to-violet-800">
          <div className="absolute top-4 left-4 md:top-6 md:left-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-tr from-indigo-400 to-violet-400 flex items-center justify-center shadow-lg ring-1 ring-white/30">
            <span aria-hidden className="text-2xl md:text-3xl">🌙</span>
          </div>

          <div className="max-w-md mx-auto h-full flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-wide text-white">AllNotes</h1>
            <p className="mt-8 md:mt-10 text-sm leading-relaxed text-violet-200">
              App de notas para estudiantes y creadores: crea notas con título, descripción,
              foto o video y audio en un mismo lugar. Organiza tareas orientadas al estudio y
              comparte apuntes en una mini red social donde podrás publicar, comentar y crear grupos.
            </p>

            <div className="mt-12 md:mt-16 grid grid-cols-2 gap-3">
              <div className="group rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm p-3 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-400 to-violet-400 flex items-center justify-center text-white/90 shadow-sm">
                    <span aria-hidden>📝</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Notas multimedia</p>
                    <p className="text-[10px] text-violet-200/90">Título, descripción y archivos</p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm p-3 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center text-white/90 shadow-sm">
                    <span aria-hidden>🎧</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Audio · Video · Imagen</p>
                    <p className="text-[10px] text-violet-200/90">Soporte de medios integrado</p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm p-3 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-400 to-violet-400 flex items-center justify-center text-white/90 shadow-sm">
                    <span aria-hidden>🎓</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Tareas de estudio</p>
                    <p className="text-[10px] text-violet-200/90">Organiza y cumple objetivos</p>
                  </div>
                </div>
              </div>

              <div className="group rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm p-3 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center text-white/90 shadow-sm">
                    <span aria-hidden>🤝</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Compartir y grupos</p>
                    <p className="text-[10px] text-violet-200/90">Mini red social estudiantil</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-8 top-10 w-1 h-1 bg-violet-300 rounded-full opacity-60" />
            <div className="absolute right-12 bottom-16 w-1 h-1 bg-indigo-300 rounded-full opacity-60" />
          </div>
        </div>

        {/* Panel derecho: login */}
        <div className="relative bg-gradient-to-br from-teal-600 to-emerald-500 text-emerald-50">
          <div className="absolute inset-0 shadow-inner rounded-2xl pointer-events-none" />
          <div className="px-10 py-12">
            <div className="max-w-xs mx-auto">
              <h2 className="text-xl font-semibold">Bienvenido</h2>
              <p className="mt-1 text-emerald-100">Inicia sesión para continuar</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label className="text-sm">Correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 placeholder:text-emerald-100"
                  />
                </div>
                <div>
                  <label className="text-sm">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 pr-10 placeholder:text-emerald-100"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-0 top-[14px] text-emerald-50/80 hover:text-white"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/>
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M2 12s3-7 10-7c2.7 0 4.9.9 6.6 2.2l2.4-2.4 1.4 1.4-19 19-1.4-1.4 3.1-3.1C3 18 2 12 2 12zm10 7c2.1 0 3.9-.6 5.4-1.5l-3.2-3.2A5 5 0 0112 17a5 5 0 01-5-5c0-.7.1-1.3.3-1.9L4 7.8C2.6 9.5 2 12 2 12s3 7 10 7z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="submit" className="rounded-md border border-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/10 active:scale-[.98]">Iniciar sesión</button>
                  <button type="button" onClick={() => { window.location.hash = '#/signup' }} className="rounded-md border border-white/60 px-4 py-3 text-sm font-medium hover:bg-white/10 active:scale-[.98]">Crear cuenta</button>
                </div>

                <div className="text-center text-sm">
                  <a href="#" className="underline underline-offset-4 hover:no-underline">¿Olvidaste tu contraseña?</a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
