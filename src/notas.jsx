import { useEffect, useMemo, useRef, useState } from 'react'

function Notas() {
  const [user, setUser] = useState(null)
  const [active, setActive] = useState('list') // info | create | list
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ tag: '', pinned: 'all', sort: 'date_desc' })
  const [form, setForm] = useState({ id: null, title: '', content: '', tags: '', pinned: false, image: null, video: null, audio: null })
  const [saving, setSaving] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [viewerUrls, setViewerUrls] = useState({ video: null, audio: null })

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null')
      setUser(u)
      if (!u) window.location.hash = '#/login'
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    if (active === 'list') fetchNotes()
  }, [active])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (user?.id) params.append('userId', String(user.id))
      if (query) params.append('q', query)
      if (filters.tag) params.append('tag', filters.tag)
      if (filters.pinned && filters.pinned !== 'all') params.append('pinned', filters.pinned)
      if (filters.sort) params.append('sort', filters.sort)
      const res = await fetch(`/api/notes?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudieron cargar notas')
      setNotes(data.data || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = useMemo(() => {
    // El backend ya filtra; esto asegura orden adicional si se requiere.
    const list = [...notes]
    const byTitle = (a,b) => (a.title||'').localeCompare(b.title||'')
    const byDate = (a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (filters.sort === 'title_asc') list.sort(byTitle)
    if (filters.sort === 'title_desc') list.sort((a,b)=>-byTitle(a,b))
    if (filters.sort === 'date_asc') list.sort(byDate)
    if (filters.sort === 'date_desc') list.sort((a,b)=>-byDate(a,b))
    return list
  }, [notes, filters])

  const onFile = (file, kind) => {
    if (!file) return setForm((f) => ({ ...f, [kind]: null }))
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, [kind]: reader.result }))
    reader.readAsDataURL(file)
  }

  const onCaptured = (dataUrl, kind) => {
    if (!dataUrl) return
    setForm((f) => ({ ...f, [kind]: dataUrl }))
  }

  // Deducción de MIME para reproducir correctamente data URLs en <video>/<audio>
  const getMime = (src, kind) => {
    if (!src) return undefined
    if (src.startsWith('data:')) {
      // data:[type];base64,
      const head = src.slice(5, src.indexOf(';'))
      return head || (kind === 'video' ? 'video/webm' : kind === 'audio' ? 'audio/webm' : undefined)
    }
    // Para URLs de archivos en servidor, asumir formatos comunes
    if (kind === 'video') {
      if (src.endsWith('.mp4')) return 'video/mp4'
      if (src.endsWith('.webm')) return 'video/webm'
    }
    if (kind === 'audio') {
      if (src.endsWith('.mp3')) return 'audio/mpeg'
      if (src.endsWith('.wav')) return 'audio/wav'
      if (src.endsWith('.webm')) return 'audio/webm'
    }
    return undefined
  }

  // Genera Object URLs para reproducir correctamente data URLs en el modal
  useEffect(() => {
    let revoked = false
    const makeUrl = async (dataUrl) => {
      try {
        const blob = await (await fetch(dataUrl)).blob()
        return URL.createObjectURL(blob)
      } catch {
        return null
      }
    }
    ;(async () => {
      if (!viewer) return
      const vSrc = viewer.video || viewer.video_url
      const aSrc = viewer.audio || viewer.audio_url
      const next = { video: null, audio: null }
      if (vSrc && typeof vSrc === 'string' && vSrc.startsWith('data:')) {
        next.video = await makeUrl(vSrc)
      }
      if (aSrc && typeof aSrc === 'string' && aSrc.startsWith('data:')) {
        next.audio = await makeUrl(aSrc)
      }
      if (!revoked) setViewerUrls(next)
    })()
    return () => {
      revoked = true
      try { viewerUrls.video && URL.revokeObjectURL(viewerUrls.video) } catch {}
      try { viewerUrls.audio && URL.revokeObjectURL(viewerUrls.audio) } catch {}
      setViewerUrls({ video: null, audio: null })
    }
  }, [viewer])

  const closeViewer = () => {
    try { viewerUrls.video && URL.revokeObjectURL(viewerUrls.video) } catch {}
    try { viewerUrls.audio && URL.revokeObjectURL(viewerUrls.audio) } catch {}
    try { (viewer?.video && typeof viewer.video === 'string' && viewer.video.startsWith('blob:')) && URL.revokeObjectURL(viewer.video) } catch {}
    try { (viewer?.audio && typeof viewer.audio === 'string' && viewer.audio.startsWith('blob:')) && URL.revokeObjectURL(viewer.audio) } catch {}
    setViewerUrls({ video: null, audio: null })
    setViewer(null)
  }

  const clearForm = () => setForm({ id: null, title: '', content: '', tags: '', pinned: false, image: null, video: null, audio: null })

  const saveNote = async (e) => {
    e?.preventDefault()
    if (!form.title) return alert('Título es obligatorio')
    try {
      setSaving(true)
      const payload = { userId: user?.id, title: form.title, content: form.content, tags: form.tags, pinned: !!form.pinned, image: form.image, video: form.video, audio: form.audio }
      const url = form.id ? `/api/notes/${form.id}` : '/api/notes'
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar la nota')
      clearForm()
      setActive('list')
      await fetchNotes()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const editNote = (n) => {
    setForm({ id: n.id, title: n.title || '', content: n.content || '', tags: n.tags || '', pinned: !!n.pinned, image: null, video: null, audio: null })
    setActive('create')
  }

  const deleteNote = async (id) => {
    if (!confirm('¿Eliminar esta nota?')) return
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar')
      await fetchNotes()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
      {/* Fondo animado */}
      <div className="bg-blobs">
        <span className="blob blob--1"></span>
        <span className="blob blob--2"></span>
        <span className="blob blob--3"></span>
      </div>

      {/* Flecha volver */}
      <button
        type="button"
        onClick={() => { window.location.hash = '#/welcome' }}
        className="fixed top-5 left-5 rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-sm p-2 hover:bg-white/15"
        aria-label="Volver"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <main className="max-w-6xl mx-auto px-6 pt-14 pb-16">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Notas</h1>
            <p className="text-sm text-violet-200">Crea, busca, edita y elimina tus notas</p>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
          {/* Menú izquierdo */}
          <aside className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-4 backdrop-blur-sm h-fit">
            <nav className="space-y-2">
              <MenuBtn label="Mis notas" icon="📚" active={active==='list'} onClick={() => { setActive('list'); fetchNotes() }} />
              <MenuBtn label="Crear nota" icon="📝" active={active==='create'} onClick={() => setActive('create')} />
              <MenuBtn label="Información" icon="ℹ️" active={active==='info'} onClick={() => setActive('info')} />
            </nav>
          </aside>

          {/* Panel derecho */}
          <div className="space-y-6">
            {active === 'info' && (
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold">¿Qué puedes hacer aquí?</h2>
                <ul className="mt-3 text-sm text-violet-200 list-disc list-inside">
                  <li>Crear notas con título y descripción.</li>
                  <li>Adjuntar imagen, video y audio opcionalmente.</li>
                  <li>Buscar y filtrar notas por texto.</li>
                  <li>Editar y eliminar notas existentes.</li>
                </ul>
              </div>
            )}

            {active === 'create' && (
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold">{form.id ? 'Editar nota' : 'Crear nota'}</h2>
                <form className="mt-4 space-y-4" onSubmit={saveNote}>
                  <div>
                    <label className="text-sm">Título</label>
                    <input type="text" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} className="mt-2 w-full rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 outline-none placeholder:text-violet-200" placeholder="Título de tu nota" />
                  </div>
                  <div>
                    <label className="text-sm">Descripción</label>
                    <textarea value={form.content} onChange={(e)=>setForm(f=>({...f,content:e.target.value}))} className="mt-2 w-full rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 outline-none placeholder:text-violet-200" rows={4} placeholder="Describe tu nota" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm">Etiquetas (separadas por coma)</label>
                      <input type="text" value={form.tags} onChange={(e)=>setForm(f=>({...f,tags:e.target.value}))} className="mt-2 w-full rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 outline-none placeholder:text-violet-200" placeholder="ej. estudio, matemáticas" />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input id="pinned" type="checkbox" checked={!!form.pinned} onChange={(e)=>setForm(f=>({...f,pinned:e.target.checked}))} />
                      <label htmlFor="pinned" className="text-sm">Marcar como favorita</label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MediaInput
                      kind="image"
                      label="Imagen / Foto"
                      accept="image/*"
                      onChange={(file)=>onFile(file,'image')}
                      onCaptured={(data)=>onCaptured(data,'image')}
                      onPreview={(data)=>setViewer({ title: form.title || 'Vista previa', content: form.content || '', image: data, video: null, audio: null, tags: form.tags || '' })}
                      value={form.image}
                    />
                    <MediaInput
                      kind="video"
                      label="Video"
                      accept="video/*"
                      onChange={(file)=>onFile(file,'video')}
                      onCaptured={(data)=>onCaptured(data,'video')}
                      onPreview={(data)=>setViewer({ title: form.title || 'Vista previa', content: form.content || '', image: null, video: data, audio: null, tags: form.tags || '' })}
                      value={form.video}
                    />
                    <MediaInput
                      kind="audio"
                      label="Audio"
                      accept="audio/*"
                      onChange={(file)=>onFile(file,'audio')}
                      onCaptured={(data)=>onCaptured(data,'audio')}
                      onPreview={(data)=>setViewer({ title: form.title || 'Vista previa', content: form.content || '', image: null, video: null, audio: data, tags: form.tags || '' })}
                      value={form.audio}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving} className="rounded-md border border-white/60 px-4 py-2 text-sm font-semibold hover:bg-white/10 active:scale-[.98] disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
                    <button type="button" onClick={()=>{ clearForm(); setActive('list') }} className="rounded-md border border-white/60 px-4 py-2 text-sm hover:bg-white/10">Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {active === 'list' && (
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-6 backdrop-blur-sm">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Mis notas</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <input value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') fetchNotes() }} placeholder="Buscar…" className="w-56 rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-1.5 outline-none placeholder:text-violet-200" />
                    <input value={filters.tag} onChange={(e)=>setFilters(f=>({...f,tag:e.target.value}))} onKeyDown={(e)=>{ if(e.key==='Enter') fetchNotes() }} placeholder="Etiqueta…" className="w-40 rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-1.5 outline-none placeholder:text-violet-200" />
                    <select value={filters.pinned} onChange={(e)=>setFilters(f=>({...f,pinned:e.target.value}))} className="select-dark rounded-md bg-white/10 ring-1 ring-white/10 px-2 py-1.5 text-white">
                      <option value="all">Todas</option>
                      <option value="1">Favoritas</option>
                      <option value="0">No favoritas</option>
                    </select>
                    <select value={filters.sort} onChange={(e)=>setFilters(f=>({...f,sort:e.target.value}))} className="select-dark rounded-md bg-white/10 ring-1 ring-white/10 px-2 py-1.5 text-white">
                      <option value="date_desc">Recientes primero</option>
                      <option value="date_asc">Antiguas primero</option>
                      <option value="title_asc">Título A→Z</option>
                      <option value="title_desc">Título Z→A</option>
                    </select>
                    <button type="button" onClick={fetchNotes} className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10">Aplicar</button>
                  </div>
                </div>
                {loading ? (
                  <p className="mt-4 text-violet-200">Cargando…</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredNotes.map((n) => (
                      <div key={n.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4 relative">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{n.title}</p>
                            {n.content && <p className="text-sm text-violet-200 mt-1 line-clamp-3">{n.content}</p>}
                            <div className="mt-2 flex items-center gap-3 text-xs text-violet-200">
                              {n.image_url && <img src={n.image_url} alt="miniatura" className="w-14 h-10 rounded-md object-cover ring-1 ring-white/10" />}
                              {n.video_url && <span className="rounded-md bg-white/10 px-2 py-1">🎬 Video</span>}
                              {n.audio_url && <span className="rounded-md bg-white/10 px-2 py-1">🎧 Audio</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" aria-label={n.pinned ? 'Quitar favorita' : 'Marcar favorita'} onClick={()=>togglePinned(n)} className={`rounded-md px-3 py-1.5 text-xs border ${n.pinned ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/60 hover:bg-white/10'}`}>⭐</button>
                            <button type="button" onClick={()=>setViewer(n)} className="rounded-md border border-white/60 px-3 py-1.5 text-xs hover:bg-white/10">Ver</button>
                            <button type="button" onClick={()=>editNote(n)} className="rounded-md border border-white/60 px-3 py-1.5 text-xs hover:bg-white/10">Editar</button>
                            <button type="button" onClick={()=>deleteNote(n.id)} className="rounded-md border border-white/60 px-3 py-1.5 text-xs hover:bg-white/10">Eliminar</button>
                          </div>
                        </div>
                        {n.tags && (
                          <div className="absolute bottom-3 right-3 flex flex-wrap gap-2 text-xs justify-end">
                            {n.tags.split(',').map((t,i)=> (
                              <span key={i} className="rounded-md bg-white/15 ring-1 ring-white/20 px-2 py-0.5">{t.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {!filteredNotes.length && (
                      <p className="text-sm text-violet-200">No hay notas</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
          <div className="max-w-3xl w-[95%] rounded-2xl bg-white/10 ring-1 ring-white/20 p-6 relative">
            <button type="button" aria-label="Cerrar" onClick={closeViewer} className="absolute top-3 right-3 rounded-md border border-white/60 px-3 py-1.5 text-xs hover:bg-white/10">✕</button>
            <h3 className="text-lg font-semibold">{viewer.title}</h3>
            {viewer.content && <p className="mt-2 text-sm text-violet-200 whitespace-pre-wrap">{viewer.content}</p>}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(viewer.image || viewer.image_url) && (
                <div>
                  <p className="text-xs text-violet-200 mb-1">Imagen</p>
                  <img src={viewer.image || viewer.image_url} alt="imagen" className="w-full rounded-lg ring-1 ring-white/20 object-cover" />
                </div>
              )}
              {(viewer.video || viewer.video_url) && (
                <div>
                  <p className="text-xs text-violet-200 mb-1">Video</p>
                  <video
                    controls
                    playsInline
                    className="w-full rounded-lg ring-1 ring-white/20"
                    src={(viewer.video && viewer.video.startsWith('data:')) ? (viewerUrls.video || viewer.video) : (viewer.video || viewer.video_url)}
                    key={(viewer.video && viewer.video.startsWith('data:')) ? (viewerUrls.video || viewer.video) : (viewer.video || viewer.video_url)}
                  >
                    Tu navegador no puede reproducir este formato de video.
                  </video>
                </div>
              )}
              {(viewer.audio || viewer.audio_url) && (
                <div className="md:col-span-2">
                  <p className="text-xs text-violet-200 mb-1">Audio</p>
                  <audio
                    controls
                    className="w-full"
                    src={(viewer.audio && viewer.audio.startsWith('data:')) ? (viewerUrls.audio || viewer.audio) : (viewer.audio || viewer.audio_url)}
                    key={(viewer.audio && viewer.audio.startsWith('data:')) ? (viewerUrls.audio || viewer.audio) : (viewer.audio || viewer.audio_url)}
                  >
                    Tu navegador no puede reproducir este formato de audio.
                  </audio>
                </div>
              )}
            </div>
            {viewer.tags && (
              <div className="mt-4 flex flex-wrap gap-2 justify-end text-xs">
                {viewer.tags.split(',').map((t,i)=> (
                  <span key={i} className="rounded-md bg-white/15 ring-1 ring-white/20 px-2 py-0.5">{t.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuBtn({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10 ring-1 ring-white/20 hover:bg-white/15'}`}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function MediaInput({ kind, label, accept, onChange, onCaptured, onPreview, value }) {
  const [capturing, setCapturing] = useState(false)
  const [stream, setStream] = useState(null)
  const [recorder, setRecorder] = useState(null)
  const chunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Temporizador simple mientras se graba
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  const stopStream = () => {
    try { stream?.getTracks()?.forEach((t) => t.stop()) } catch {}
    setStream(null)
  }

  const pickMime = () => {
    if (kind === 'video') {
      const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      return cands.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm'
    }
    if (kind === 'audio') {
      const cands = ['audio/webm;codecs=opus', 'audio/webm']
      return cands.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'audio/webm'
    }
    return ''
  }

  const startCapture = async () => {
    try {
      const constraints = kind === 'audio'
        ? { audio: true }
        : kind === 'video'
          ? { video: { facingMode: 'environment' }, audio: true }
          : { video: { facingMode: 'environment' } }
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(s)
      setCapturing(true)
      if (kind !== 'image') {
        const mime = pickMime()
        const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
        r.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }
        r.onstop = async () => {
          // Dar un pequeño margen para que llegue el último chunk
          setTimeout(() => {
            try {
              const baseType = (r.mimeType || '').split(';')[0] || (kind==='video' ? 'video/webm' : 'audio/webm')
              const blob = new Blob(chunksRef.current, { type: baseType })
              // Abrir vista previa inmediatamente con Object URL reproducible
              try { onPreview?.(URL.createObjectURL(blob), kind) } catch {}
              const fr = new FileReader()
              fr.onload = () => {
                onCaptured?.(fr.result, kind)
                chunksRef.current = []
              }
              fr.readAsDataURL(blob)
            } catch (err) {
              alert('No se pudo finalizar la grabación: ' + (err?.message || err))
            }
          }, 80)
          stopStream()
          setCapturing(false)
          setRecording(false)
          setElapsed(0)
        }
        setRecorder(r)
        try {
          chunksRef.current = []
          // timeslice asegura que 'dataavailable' emita periódicamente
          r.start(1000)
          setRecording(true)
          setElapsed(0)
        } catch (e) {
          alert('No se pudo iniciar la grabación: ' + e.message)
        }
      }
    } catch (e) {
      alert('No se pudo acceder a cámara/micrófono: ' + e.message)
    }
  }

  const takePhoto = () => {
    const videoEl = document.getElementById(`preview-${kind}`)
    if (!videoEl) return
    const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth
    canvas.height = videoEl.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    onCaptured?.(dataUrl, kind)
    stopStream()
    setCapturing(false)
  }

  const stopRecording = () => {
    try { recorder?.stop() } catch {}
  }
  const cancelCapture = () => {
    try { recorder?.stop() } catch {}
    stopStream()
    setCapturing(false)
    chunksRef.current = []
    setRecording(false)
    setElapsed(0)
  }

  return (
    <div>
      <label className="text-sm">{label}</label>
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <input
          type="file"
          accept={accept}
          capture={kind === 'image' ? 'environment' : kind === 'video' ? 'environment' : kind === 'audio' ? 'microphone' : undefined}
          onChange={(e)=>onChange(e.target.files?.[0] || null)}
        />
        <button type="button" className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10" onClick={startCapture}>
          {capturing ? 'Capturando…' : 'Usar cámara/micrófono'}
        </button>
        {value && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-violet-200">Archivo listo ✅</span>
            <button type="button" className="rounded-md border border-white/60 px-2 py-1 text-xs hover:bg-white/10" onClick={()=>onPreview?.(value, kind)}>Ver</button>
          </div>
        )}
      </div>

      {capturing && (
        <div className="mt-3 rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
          {kind === 'image' && (
            <div className="space-y-3">
              <video id={`preview-${kind}`} autoPlay playsInline muted className="w-full rounded-md" />
              <CameraAttach stream={stream} targetId={`preview-${kind}`} />
              <div className="flex gap-3">
                <button type="button" className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10" onClick={takePhoto}>Tomar foto</button>
                <button type="button" className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10" onClick={cancelCapture}>Cancelar</button>
              </div>
            </div>
          )}
          {kind !== 'image' && (
            <div className="space-y-3">
              {kind === 'video' && <>
                <video id={`preview-${kind}`} autoPlay playsInline muted className="w-full rounded-md" />
                <CameraAttach stream={stream} targetId={`preview-${kind}`} />
              </>}
              {kind === 'audio' && <div className="text-sm text-violet-200">Micrófono activo…</div>}
              <div className="flex gap-3">
                <span className="self-center text-xs text-violet-200">{recording ? `Grabando… ${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}` : 'Listo para grabar'}</span>
                <button type="button" className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10" onClick={stopRecording}>Detener</button>
                <button type="button" className="rounded-md border border-white/60 px-3 py-1.5 text-sm hover:bg-white/10" onClick={cancelCapture}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Adjunta correctamente el MediaStream al elemento video (React no soporta directamente srcObject)
function CameraAttach({ stream, targetId }) {
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (el && stream) {
      try { el.srcObject = stream } catch { el.setAttribute('srcObject', stream) }
    }
  }, [stream, targetId])
  return null
}

export default Notas