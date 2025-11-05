import { useEffect, useMemo, useState } from 'react'

function Perfil() {
  const [user, setUser] = useState(null)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [regionsData, setRegionsData] = useState([])
  const [communesForRegion, setCommunesForRegion] = useState([])

  const showToast = (type, message) => {
    setToast({ type, message })
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), 3000)
  }

  const toYMD = (d) => {
    if (!d) return ''
    try {
      if (typeof d === 'string') {
        // If already 'YYYY-MM-DD', return as is; if ISO, slice
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
        const m = d.match(/^(\d{4}-\d{2}-\d{2})/)
        return m ? m[1] : d
      }
      if (d instanceof Date) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      return ''
    } catch {
      return ''
    }
  }

  useEffect(() => {
    let u
    try { u = JSON.parse(localStorage.getItem('user') || 'null') } catch {}
    if (!u) {
      window.location.hash = '#/login'
      return
    }
    setUser(u)

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user/${u.id}`)
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo obtener el usuario')
        const normalized = { ...data.user, birthdate: toYMD(data.user.birthdate) }
        setUser(normalized)
        setForm({ ...normalized })
      } catch (e) {
        // Si no existe endpoint todavía, usamos localStorage
        setForm({ ...u, birthdate: toYMD(u.birthdate) })
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

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
    const region = form.region || ''
    if (!region) {
      setCommunesForRegion([])
      return
    }
    const found = regionsData.find((r) => r.region === region)
    setCommunesForRegion(found?.comunas || [])
  }, [form.region, regionsData])

  const initials = useMemo(() => {
    return (user?.name || user?.username || 'U')
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
  }, [user])

  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || !form.lastName || !form.username || !form.email) {
      showToast('warning', 'Completa nombre, apellido, usuario y correo')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          country: 'Chile',
          region: form.region || '',
          commune: form.commune || '',
          sex: form.sex || '',
          birthdate: form.birthdate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar')
      const normalized = { ...data.user, birthdate: toYMD(data.user.birthdate) }
      setUser((u) => ({ ...u, ...normalized }))
      localStorage.setItem('user', JSON.stringify({ ...user, ...normalized }))
      showToast('success', 'Perfil actualizado')
      setEdit(false)
    } catch (e) {
      showToast('warning', e.message)
    } finally {
      setSaving(false)
    }
  }

  const onAvatarSelected = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch(`/api/user/${user.id}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo subir avatar')
        setUser((u) => ({ ...u, avatarUrl: data.avatarUrl }))
        setForm((f) => ({ ...f, avatarUrl: data.avatarUrl }))
        localStorage.setItem('user', JSON.stringify({ ...user, avatarUrl: data.avatarUrl }))
        showToast('success', 'Foto actualizada')
      } catch (e) {
        showToast('warning', e.message)
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-white">Cargando…</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 animated-bg text-white">
      {/* Fondo animado */}
      <div className="bg-blobs">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
      </div>
      <main className="content-layer max-w-4xl mx-auto px-6 pt-10 pb-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Flecha para volver */}
            <button onClick={() => (window.location.hash = '#/welcome')} title="Volver" className="mr-2 rounded-full p-2 hover:bg-white/10 transition">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="w-14 h-14 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold">{initials}</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">Mi perfil</h1>
              <p className="text-sm text-violet-200">Gestiona tu información básica</p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="rounded-md border border-white/60 px-4 py-2 text-sm hover:bg-white/10 cursor-pointer">
              Cambiar foto
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarSelected(e.target.files?.[0])} />
            </label>
            <button onClick={() => setEdit((v) => !v)} className="rounded-md border border-white/60 px-4 py-2 text-sm font-semibold hover:bg-white/10">
              {edit ? 'Cancelar' : 'Actualizar'}
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-2xl bg-white/12 ring-1 ring-white/20 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/16 hover:ring-white/30 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
          {!edit ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Nombre" value={user?.name} />
              <Field label="Apellido" value={user?.lastName || user?.last_name} />
              <Field label="Usuario" value={user?.username} />
              <Field label="Correo" value={user?.email} />
              <Field label="País" value={user?.country || 'Chile'} />
              <Field label="Región" value={user?.region} />
              <Field label="Comuna" value={user?.commune} />
              <Field label="Sexo" value={user?.sex} />
              <Field label="Nacimiento" value={user?.birthdate} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <EditField label="Nombre" value={form.name || ''} onChange={(v) => onChange('name', v)} />
              <EditField label="Apellido" value={form.lastName || form.last_name || ''} onChange={(v) => onChange('lastName', v)} />
              <EditField label="Usuario" value={form.username || ''} onChange={(v) => onChange('username', v)} />
              <EditField label="Correo" value={form.email || ''} onChange={(v) => onChange('email', v)} />
              <SelectReadOnly label="País" value="Chile" />
              <SelectField label="Región" value={form.region || ''} options={regionsData.map((r) => r.region)} onChange={(v) => onChange('region', v)} />
              <SelectField label="Comuna" value={form.commune || ''} options={communesForRegion} onChange={(v) => onChange('commune', v)} disabled={!form.region} />
              <EditField label="Sexo" value={form.sex || ''} onChange={(v) => onChange('sex', v)} />
              <EditField label="Nacimiento" type="date" value={form.birthdate || ''} onChange={(v) => onChange('birthdate', v)} />

              <div className="md:col-span-2 mt-2">
                <button disabled={saving} onClick={save} className="rounded-md border border-white/60 px-4 py-2 text-sm font-semibold hover:bg-white/10">
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </section>

        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type === 'success' ? 'toast--success' : 'toast--warning'}`}>
              <span className="toast__msg">{toast.message}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-violet-200 text-xs">{label}</p>
      <p className="mt-1 bg-white/5 ring-1 ring-white/10 text-white rounded-md px-3 py-2">{value || '—'}</p>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <p className="text-violet-200 text-xs">{label}</p>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 text-white" />
    </div>
  )
}

export default Perfil

function SelectReadOnly({ label, value }) {
  return (
    <div>
      <p className="text-violet-200 text-xs">{label}</p>
      <select value={value} disabled className="mt-1 w-full bg-transparent border-b border-emerald-200/70 outline-none px-1 py-2 text-white">
        <option className="bg-emerald-600">{value}</option>
      </select>
    </div>
  )
}

function SelectField({ label, value, onChange, options = [], disabled }) {
  return (
    <div>
      <p className="text-violet-200 text-xs">{label}</p>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-transparent border-b border-emerald-200/70 focus:border-white outline-none px-1 py-2 text-white">
        <option className="bg-emerald-600" value="">Selecciona…</option>
        {options.map((opt) => (
          <option key={opt} className="bg-emerald-600" value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}