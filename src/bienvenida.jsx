import { useEffect, useMemo, useState } from 'react'

function Bienvenida() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [weather, setWeather] = useState({ loading: true })

  const logout = () => {
    // Solicita a la API limpiar cookie HttpOnly y luego limpia estado local
    fetch('/api/logout', { method: 'POST', credentials: 'include' })
      .catch(() => {})
      .finally(() => {
        try { localStorage.removeItem('user') } catch {}
        window.location.hash = '#/login'
      })
  }

  // Cargar usuario desde localStorage y proteger la ruta
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null')
      setUser(u)
      if (!u) {
        window.location.hash = '#/login'
      }
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  // Reloj en tiempo real
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Clima: Open-Meteo sin API key, con geolocalización si está disponible
  useEffect(() => {
    const getWeather = async (lat, lon) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
        const res = await fetch(url)
        const data = await res.json()
        setWeather({ loading: false, data })
      } catch (e) {
        setWeather({ loading: false, error: e.message })
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => getWeather(pos.coords.latitude, pos.coords.longitude),
        () => getWeather(-12.0464, -77.0428) // Lima como fallback
      )
    } else {
      getWeather(-12.0464, -77.0428)
    }
  }, [])

  const hourStr = useMemo(() => clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [clock])
  const dateStr = useMemo(() => clock.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' }), [clock])

  const weatherInfo = useMemo(() => {
    if (weather.loading) return { temp: null, code: null }
    const temp = weather.data?.current?.temperature_2m
    const code = weather.data?.current?.weather_code
    const desc = weatherCodeToText(code)
    return { temp, desc }
  }, [weather])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
      {/* Barra lateral tipo "pill" */}
      <aside className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-indigo-700/30 backdrop-blur-md rounded-3xl p-3 ring-1 ring-white/20 shadow-xl">
        <button
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-400 to-violet-400 flex items-center justify-center shadow-md hover:scale-[1.03] active:scale-[.98] transition-transform"
        >
          <span aria-hidden className="text-2xl">🌙</span>
        </button>
        {/* Secciones desplegables */}
        <div className={`overflow-hidden transition-all ${menuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <nav className="mt-2 flex flex-col items-center gap-3">
            {[
              { key: 'notas', label: 'Notas', icon: '📝', href: '#/notas' },
              { key: 'tareas', label: 'Tareas', icon: '✅', href: '#/tareas' },
              { key: 'social', label: 'Red social', icon: '👥', href: '#/social' },
              { key: 'perfil', label: 'Perfil', icon: '👤', href: '#/perfil' },
            ].map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="group w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center hover:bg-white/20 transition"
                title={item.label}
              >
                <span aria-hidden className="text-xl">{item.icon}</span>
              </a>
            ))}
            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={logout}
              className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center hover:bg-white/20 transition"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <span aria-hidden className="text-xl">🚪</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Contenido principal: panel general */}
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-16">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bienvenido{user?.name ? `, ${user.name}` : ''}</h1>
            <p className="text-sm text-violet-200">Resumen general de tus secciones</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="rounded-2xl px-4 py-2 bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <span className="font-medium">{hourStr}</span>
              <span className="ml-2 text-violet-200">{dateStr}</span>
            </div>
            <div className="rounded-2xl px-4 py-2 bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              {weather.loading ? (
                <span className="text-violet-200">Clima cargando…</span>
              ) : weather.error ? (
                <span className="text-violet-200">Clima no disponible</span>
              ) : (
                <span>
                  {weatherInfo.temp != null ? `${Math.round(weatherInfo.temp)}°C` : '--'}
                  <span className="ml-2 text-violet-200">{weatherInfo.desc}</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Tarjetas de resumen */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard title="Notas" icon="📝" highlight="12" subtitle="Notas recientes" gradient="from-indigo-400 to-violet-400" />
          <SummaryCard title="Tareas" icon="✅" highlight="5" subtitle="Tareas pendientes" gradient="from-teal-400 to-emerald-400" />
          <SummaryCard title="Red social" icon="👥" highlight="3" subtitle="Nuevas actividades" gradient="from-fuchsia-400 to-pink-400" />
          <ProfileCard user={user} />
        </section>

        {/* Panel inferior con detalle breve */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-5 backdrop-blur-sm">
            <h3 className="text-base font-semibold">Notas destacadas</h3>
            <p className="text-sm text-violet-200 mt-1">Tu última nota y actividades recientes.</p>
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-indigo-400 to-violet-400 flex items-center justify-center">📄</div>
                    <div className="text-sm">
                      <p className="font-medium">Apunte #{i + 1}</p>
                      <p className="text-violet-200">Resumen breve de la nota…</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-5 backdrop-blur-sm">
            <h3 className="text-base font-semibold">Tareas de estudio</h3>
            <p className="text-sm text-violet-200 mt-1">Progreso semanal.</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Matemáticas', pct: 60 },
                { label: 'Historia', pct: 35 },
                { label: 'Física', pct: 80 },
              ].map((t) => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm"><span>{t.label}</span><span className="text-violet-200">{t.pct}%</span></div>
                  <div className="h-2 bg-white/10 rounded-full">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-5 backdrop-blur-sm">
            <h3 className="text-base font-semibold">Actividad social</h3>
            <p className="text-sm text-violet-200 mt-1">Lo último en tu red.</p>
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-fuchsia-400 to-pink-400 flex items-center justify-center">💬</div>
                    <div className="text-sm">
                      <p className="font-medium">Nuevo comentario #{i + 1}</p>
                      <p className="text-violet-200">Actividad breve reciente…</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SummaryCard({ title, icon, highlight, subtitle, gradient }) {
  return (
    <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white/95`}>{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-violet-200">{subtitle}</p>
        </div>
      </div>
      <p className="mt-5 text-3xl font-bold">{highlight}</p>
    </div>
  )
}

function ProfileCard({ user }) {
  const initials = (user?.name || user?.username || 'Invitado')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')

  return (
    <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-white font-semibold">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{user?.name || user?.username || 'Tu perfil'}</p>
          <p className="text-xs text-violet-200">{user?.email || 'Completa tu información'}</p>
        </div>
      </div>
      <p className="mt-5 text-sm text-violet-200">Accede a tu configuración y foto de perfil.</p>
    </div>
  )
}

function weatherCodeToText(code) {
  const map = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia',
    65: 'Lluvia fuerte',
    71: 'Nieve ligera',
    73: 'Nieve',
    75: 'Nieve intensa',
    80: 'Chubascos ligeros',
    81: 'Chubascos',
    82: 'Chubascos intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo',
    99: 'Tormenta fuerte con granizo',
  }
  return map[code] || '—'
}

export default Bienvenida