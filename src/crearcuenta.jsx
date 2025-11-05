import { useState, useEffect } from 'react'

function CrearCuenta() {
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [sex, setSex] = useState('')
  const [username, setUsername] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSignPassword, setShowSignPassword] = useState(false)
  const [showSignConfirm, setShowSignConfirm] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [toast, setToast] = useState(null)
  // Ubicación Chile
  const [country, setCountry] = useState('Chile')
  const [region, setRegion] = useState('')
  const [commune, setCommune] = useState('')
  const [regionsData, setRegionsData] = useState([])
  const [communesForRegion, setCommunesForRegion] = useState([])

  const showToast = (type, message) => {
    setToast({ type, message })
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), 3500)
  }

  // Cargar regiones/comunas desde JSON público
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/chile-regiones-comunas.json')
        const data = await res.json()
        setRegionsData(data)
      } catch (e) {
        console.error('No se pudo cargar regiones/comunas:', e)
      }
    }
    load()
  }, [])

  // Cuando cambia la región, cargar comunas asociadas
  useEffect(() => {
    if (!region) {
      setCommunesForRegion([])
      setCommune('')
      return
    }
    const found = regionsData.find((r) => r.region === region)
    setCommunesForRegion(found?.comunas || [])
    setCommune('')
  }, [region, regionsData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !lastName || !username || !sex || !birthdate || !email || !password || !country || !region || !commune) {
      showToast('warning', 'Faltan campos por completar')
      return
    }
    if (password !== confirmPassword) {
      showToast('warning', 'Las contraseñas no coinciden')
      return
    }
    if (!termsAccepted) {
      showToast('warning', 'Debes aceptar los términos y condiciones')
      return
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lastName, username, sex, birthdate, email, password, termsAccepted, country, region, commune })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al crear la cuenta')
      showToast('success', 'Cuenta creada exitosamente')
      setTimeout(() => { window.location.hash = '#/login' }, 1200)
    } catch (err) {
      showToast('warning', `No se pudo crear la cuenta: ${err.message}`)
    }
  }

  return (
    <div className="animated-bg min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white flex items-center justify-center p-6 overflow-hidden">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'success' ? 'toast--success' : 'toast--warning'}`}>
            <span className="toast__icon" aria-hidden>
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14l-4-4 1.4-1.4L11 12.2l5.6-5.6L18 8l-7 8z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              )}
            </span>
            <span className="toast__msg">{toast.message}</span>
          </div>
        </div>
      )}
      <div className="bg-blobs">
        <span className="blob blob--1"></span>
        <span className="blob blob--2"></span>
        <span className="blob blob--3"></span>
      </div>
      <div className="content-layer w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="relative bg-gradient-to-br from-teal-600 to-emerald-500 text-emerald-50">
          <button
            type="button"
            onClick={() => { window.location.hash = '#/login' }}
            className="absolute top-4 left-4 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm ring-1 ring-white/30"
            aria-label="Volver al login"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M15 18L9 12l6-6v12z" />
            </svg>
          </button>
          <div className="px-8 py-12 md:py-14">
            <div className="mx-auto">
              <h2 className="text-xl font-semibold">Crear cuenta</h2>
              <p className="mt-1 text-emerald-100">Crea tu cuenta para empezar</p>

              <form onSubmit={handleSubmit} className="mt-8">
                {/* El formulario ocupa todo el panel con divisiones sutiles */}
                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Nombre</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 placeholder:text-emerald-100" />
                    </div>
                      <div>
                        <label className="text-sm">Apellido</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 placeholder:text-emerald-100" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Correo</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 placeholder:text-emerald-100" />
                    </div>

                    <div>
                      <label className="text-sm">Nombre de usuario</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu_usuario" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 placeholder:text-emerald-100" />
                    </div>

                    {/* País / Región / Comuna */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm">País</label>
                        <select value={country} disabled className="mt-2 w-full bg-transparent border-b border-emerald-200/70 outline-none px-1 py-2">
                          <option className="bg-emerald-600" value="Chile">Chile</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm">Región</label>
                        <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2">
                          <option className="bg-emerald-600" value="">Selecciona…</option>
                          {regionsData.map((r) => (
                            <option key={r.region} className="bg-emerald-600" value={r.region}>{r.region}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm">Comuna</label>
                        <select value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!region} className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2">
                          <option className="bg-emerald-600" value="">Selecciona…</option>
                          {communesForRegion.map((c) => (
                            <option key={c} className="bg-emerald-600" value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm">Sexo</label>
                        <select value={sex} onChange={(e) => setSex(e.target.value)} className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2">
                          <option className="bg-emerald-600" value="">Selecciona…</option>
                          <option className="bg-emerald-600" value="M">Masculino</option>
                          <option className="bg-emerald-600" value="F">Femenino</option>
                          <option className="bg-emerald-600" value="O">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm">Fecha de nacimiento</label>
                        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Contraseña</label>
                      <div className="relative">
                        <input type={showSignPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 pr-10 placeholder:text-emerald-100" />
                        <button type="button" aria-label={showSignPassword ? 'Ocultar contraseña' : 'Ver contraseña'} onClick={() => setShowSignPassword((s) => !s)} className="absolute right-0 top-[14px] text-emerald-50/80 hover:text-white">
                          {showSignPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/><circle cx="12" cy="12" r="2.5" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2 12s3-7 10-7c2.7 0 4.9.9 6.6 2.2l2.4-2.4 1.4 1.4-19 19-1.4-1.4 3.1-3.1C3 18 2 12 2 12zm10 7c2.1 0 3.9-.6 5.4-1.5l-3.2-3.2A5 5 0 0112 17a5 5 0 01-5-5c0-.7.1-1.3.3-1.9L4 7.8C2.6 9.5 2 12 2 12s3 7 10 7z"/></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Confirmar contraseña</label>
                      <div className="relative">
                        <input type={showSignConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" className="mt-2 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 pr-10 placeholder:text-emerald-100" />
                        <button type="button" aria-label={showSignConfirm ? 'Ocultar contraseña' : 'Ver contraseña'} onClick={() => setShowSignConfirm((s) => !s)} className="absolute right-0 top-[14px] text-emerald-50/80 hover:text-white">
                          {showSignConfirm ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/><circle cx="12" cy="12" r="2.5" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2 12s3-7 10-7c2.7 0 4.9.9 6.6 2.2l2.4-2.4 1.4 1.4-19 19-1.4-1.4 3.1-3.1C3 18 2 12 2 12zm10 7c2.1 0 3.9-.6 5.4-1.5l-3.2-3.2A5 5 0 0112 17a5 5 0 01-5-5c0-.7.1-1.3.3-1.9L4 7.8C2.6 9.5 2 12 2 12s3 7 10 7z"/></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" />
                      <span>Acepto los términos y condiciones</span>
                    </label>

                    <div className="grid grid-cols-1">
                      <button type="submit" className="rounded-md border border-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/10 active:scale-[.98] w-full">Crear cuenta</button>
                    </div>

                    <div className="text-center text-sm">
                      <button type="button" onClick={() => { window.location.hash = '#/login' }} className="underline underline-offset-4 hover:no-underline">¿Ya tienes cuenta? Inicia sesión</button>
                    </div>
                  </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrearCuenta