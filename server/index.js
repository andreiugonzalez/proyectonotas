import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

dotenv.config()

const app = express()
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const IS_PROD = process.env.NODE_ENV === 'production'
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())

// Sesiones simples en memoria (para demo/dev). En producción, usa Redis o JWT.
const sessions = new Map()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'allnotes',
  port: Number(process.env.DB_PORT || 3306),
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Asegura que la tabla de usuarios exista
async function ensureUsersTable() {
  const dbName = process.env.DB_NAME || 'allnotes'
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      country VARCHAR(80) NOT NULL DEFAULT 'Chile',
      region VARCHAR(120) NOT NULL,
      commune VARCHAR(120) NOT NULL,
      sex VARCHAR(10) NOT NULL,
      birthdate DATE NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  )
  // Añadir columnas si faltan (username, country, region, commune)
  const checkAndAdd = async (colName, ddl) => {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [dbName, colName]
    )
    if (!rows.length) {
      await pool.query(ddl)
    }
  }
  await checkAndAdd('username', `ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL UNIQUE AFTER last_name`)
  await checkAndAdd('country', `ALTER TABLE users ADD COLUMN country VARCHAR(80) NOT NULL DEFAULT 'Chile' AFTER username`)
  await checkAndAdd('region', `ALTER TABLE users ADD COLUMN region VARCHAR(120) NOT NULL AFTER country`)
  await checkAndAdd('commune', `ALTER TABLE users ADD COLUMN commune VARCHAR(120) NOT NULL AFTER region`)
  await checkAndAdd('avatar_url', `ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER password_hash`)
}

// Asegura que la tabla de notas exista con columnas de medios y relación a usuario
async function ensureNotesTable() {
  const dbName = process.env.DB_NAME || 'allnotes'
  await pool.query(
    `CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      image_url VARCHAR(255) NULL,
      video_url VARCHAR(255) NULL,
      audio_url VARCHAR(255) NULL,
      tags VARCHAR(255) NULL,
      pinned TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_notes_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    )`
  )
  const ensureCol = async (name, ddl) => {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = ?`,
      [dbName, name]
    )
    if (!rows.length) {
      await pool.query(ddl)
    }
  }
  await ensureCol('user_id', `ALTER TABLE notes ADD COLUMN user_id INT NULL AFTER id`)
  await ensureCol('image_url', `ALTER TABLE notes ADD COLUMN image_url VARCHAR(255) NULL AFTER content`)
  await ensureCol('video_url', `ALTER TABLE notes ADD COLUMN video_url VARCHAR(255) NULL AFTER image_url`)
  await ensureCol('audio_url', `ALTER TABLE notes ADD COLUMN audio_url VARCHAR(255) NULL AFTER video_url`)
  await ensureCol('tags', `ALTER TABLE notes ADD COLUMN tags VARCHAR(255) NULL AFTER audio_url`)
  await ensureCol('pinned', `ALTER TABLE notes ADD COLUMN pinned TINYINT(1) DEFAULT 0 AFTER tags`)
  await ensureCol('updated_at', `ALTER TABLE notes ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at`)
}

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT VERSION() AS version')
    res.json({ ok: true, db: 'connected', version: rows?.[0]?.version })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/api/notes', async (req, res) => {
  try {
    await ensureNotesTable()
    const userId = Number(req.query.userId)
    const q = (req.query.q || '').trim()
    const tag = (req.query.tag || '').trim()
    const pinned = req.query.pinned
    const sort = (req.query.sort || '').trim()
    let sql = 'SELECT id, user_id, title, content, image_url, video_url, audio_url, tags, pinned, created_at, updated_at FROM notes'
    const params = []
    const where = []
    if (userId) { where.push('user_id = ?'); params.push(userId) }
    if (q) { where.push('(title LIKE ? OR content LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
    if (tag) { where.push('FIND_IN_SET(?, REPLACE(tags, ", ", ","))'); params.push(tag) }
    if (pinned === '1' || pinned === '0') { where.push('pinned = ?'); params.push(Number(pinned)) }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`
    if (sort === 'date_asc') sql += ' ORDER BY created_at ASC'
    else if (sort === 'title_asc') sql += ' ORDER BY title ASC'
    else if (sort === 'title_desc') sql += ' ORDER BY title DESC'
    else sql += ' ORDER BY created_at DESC'
    const [notes] = await pool.query(sql, params)
    res.json({ ok: true, data: notes })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/notes', async (req, res) => {
  const { userId, title, content, tags, pinned, image, video, audio } = req.body || {}
  if (!title) return res.status(400).json({ ok: false, error: 'Título es requerido' })
  try {
    await ensureNotesTable()
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'notes')
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    const saveBase64 = async (data, typeHint, prefix) => {
      if (!data || typeof data !== 'string' || !data.includes('base64')) return null
      const isPng = data.includes('image/png')
      const isJpg = data.includes('image/jpeg') || data.includes('image/jpg')
      const isMp4 = data.includes('video/mp4')
      const isWebm = data.includes('video/webm')
      const isMp3 = data.includes('audio/mpeg') || data.includes('audio/mp3')
      const isWav = data.includes('audio/wav')
      let ext = 'bin'
      if (typeHint === 'image') ext = isPng ? 'png' : isJpg ? 'jpg' : 'png'
      if (typeHint === 'video') ext = isMp4 ? 'mp4' : isWebm ? 'webm' : 'mp4'
      if (typeHint === 'audio') ext = isMp3 ? 'mp3' : isWav ? 'wav' : 'mp3'
      const base64Data = data.split(',')[1]
      const filename = `${prefix}-${Date.now()}.${ext}`
      const filePath = path.join(uploadsDir, filename)
      await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))
      return `/uploads/notes/${filename}`
    }

    const imageUrl = await saveBase64(image, 'image', `img-${userId || 'u'}`)
    const videoUrl = await saveBase64(video, 'video', `vid-${userId || 'u'}`)
    const audioUrl = await saveBase64(audio, 'audio', `aud-${userId || 'u'}`)

    const [result] = await pool.query(
      'INSERT INTO notes (user_id, title, content, image_url, video_url, audio_url, tags, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId || null, title, content || null, imageUrl, videoUrl, audioUrl, tags || null, pinned ? 1 : 0]
    )
    res.json({ ok: true, id: result.insertId })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.put('/api/notes/:id', async (req, res) => {
  const { title, content, tags, pinned, image, video, audio } = req.body || {}
  if (!title) return res.status(400).json({ ok: false, error: 'Título es requerido' })
  try {
    await ensureNotesTable()
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'notes')
    await fs.promises.mkdir(uploadsDir, { recursive: true })
    const saveBase64 = async (data, typeHint, prefix) => {
      if (!data || typeof data !== 'string' || !data.includes('base64')) return null
      const isPng = data.includes('image/png')
      const isJpg = data.includes('image/jpeg') || data.includes('image/jpg')
      const isMp4 = data.includes('video/mp4')
      const isWebm = data.includes('video/webm')
      const isMp3 = data.includes('audio/mpeg') || data.includes('audio/mp3')
      const isWav = data.includes('audio/wav')
      let ext = 'bin'
      if (typeHint === 'image') ext = isPng ? 'png' : isJpg ? 'jpg' : 'png'
      if (typeHint === 'video') ext = isMp4 ? 'mp4' : isWebm ? 'webm' : 'mp4'
      if (typeHint === 'audio') ext = isMp3 ? 'mp3' : isWav ? 'wav' : 'mp3'
      const base64Data = data.split(',')[1]
      const filename = `${prefix}-${Date.now()}.${ext}`
      const filePath = path.join(uploadsDir, filename)
      await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))
      return `/uploads/notes/${filename}`
    }
    const imageUrl = await saveBase64(image, 'image', `img-${req.params.id}`)
    const videoUrl = await saveBase64(video, 'video', `vid-${req.params.id}`)
    const audioUrl = await saveBase64(audio, 'audio', `aud-${req.params.id}`)

    const fields = ['title = ?', 'content = ?', 'tags = ?', 'pinned = ?']
    const params = [title, content || null, tags || null, pinned ? 1 : 0]
    if (imageUrl) { fields.push('image_url = ?'); params.push(imageUrl) }
    if (videoUrl) { fields.push('video_url = ?'); params.push(videoUrl) }
    if (audioUrl) { fields.push('audio_url = ?'); params.push(audioUrl) }
    params.push(req.params.id)
    await pool.query(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await ensureNotesTable()
    await pool.query('DELETE FROM notes WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})


// Registro de usuarios
app.post('/api/signup', async (req, res) => {
  const { name, lastName, username, region, commune, sex, birthdate, email, password, termsAccepted } = req.body || {}
  
  if (!name || !lastName || !username || !region || !commune || !sex || !birthdate || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' })
  }
  if (!termsAccepted) {
    return res.status(400).json({ ok: false, error: 'Debes aceptar términos y condiciones' })
  }

  try {
    await ensureUsersTable()

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const [result] = await pool.query(
      'INSERT INTO users (name, last_name, username, country, region, commune, sex, birthdate, email, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, lastName, username, 'Chile', region, commune, sex, birthdate, email, hash]
    )
    res.json({ ok: true, id: result.insertId })
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'El correo o nombre de usuario ya está registrado' })
    }
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Login de usuarios
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Correo y contraseña son requeridos' })
  }

  try {
    await ensureUsersTable()
    const [rows] = await pool.query('SELECT id, name, last_name, username, country, region, commune, sex, birthdate, email, password_hash, avatar_url FROM users WHERE email = ?', [email])
    const user = rows?.[0]
    if (!user) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })

    // Crear token de sesión y cookie segura
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, { userId: user.id, createdAt: Date.now() })
    res.cookie('session', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    })

    return res.json({ ok: true, user: {
      id: user.id,
      name: user.name,
      lastName: user.last_name,
      username: user.username,
      country: user.country,
      region: user.region,
      commune: user.commune,
      sex: user.sex,
      birthdate: user.birthdate,
      email: user.email,
      avatarUrl: user.avatar_url,
    } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Logout: limpia cookie y sesión
app.post('/api/logout', (req, res) => {
  const cookieHeader = req.headers.cookie || ''
  const token = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('session='))
    ?.split('=')[1]
  if (token) sessions.delete(token)
  res.clearCookie('session', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/',
  })
  res.json({ ok: true })
})

// Obtener usuario por id
app.get('/api/user/:id', async (req, res) => {
  try {
    await ensureUsersTable()
    const [rows] = await pool.query('SELECT id, name, last_name, username, country, region, commune, sex, birthdate, email, avatar_url FROM users WHERE id = ?', [req.params.id])
    const u = rows?.[0]
    if (!u) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    res.json({ ok: true, user: {
      id: u.id, name: u.name, lastName: u.last_name, username: u.username,
      country: u.country, region: u.region, commune: u.commune, sex: u.sex, birthdate: u.birthdate, email: u.email, avatarUrl: u.avatar_url
    } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Actualizar usuario por id
app.put('/api/user/:id', async (req, res) => {
  const { name, lastName, username, email, region, commune, sex, birthdate } = req.body || {}
  if (!name || !lastName || !username || !email) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes' })
  try {
    await ensureUsersTable()
    await pool.query(
      'UPDATE users SET name=?, last_name=?, username=?, email=?, country=?, region=?, commune=?, sex=?, birthdate=? WHERE id=?',
      [name, lastName, username, email, 'Chile', region || '', commune || '', sex || '', birthdate || null, req.params.id]
    )
    res.json({ ok: true, user: { name, lastName, username, email, country: 'Chile', region, commune, sex, birthdate } })
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'Correo o usuario ya existe' })
    }
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Subida de avatar
app.post('/api/user/:id/avatar', async (req, res) => {
  try {
    const { image } = req.body || {}
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, error: 'Imagen inválida' })
    }
    await ensureUsersTable()
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    const ext = image.includes('image/png') ? 'png' : image.includes('image/jpeg') ? 'jpg' : 'png'
    const base64Data = image.split(',')[1]
    const filename = `avatar-${req.params.id}-${Date.now()}.${ext}`
    const filePath = path.join(uploadsDir, filename)
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))
    const url = `/uploads/${filename}`
    await pool.query('UPDATE users SET avatar_url=? WHERE id=?', [url, req.params.id])
    res.json({ ok: true, avatarUrl: url })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})