import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'allnotes',
  port: Number(process.env.DB_PORT || 3306),
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
      sex VARCHAR(10) NOT NULL,
      birthdate DATE NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  )
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`,
    [dbName]
  )
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL UNIQUE AFTER last_name`
    )
  }
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
    const [rows] = await pool.query(
      'CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    )
    const [notes] = await pool.query('SELECT id, title, content, created_at FROM notes ORDER BY created_at DESC')
    res.json({ ok: true, data: notes })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body || {}
  if (!title) return res.status(400).json({ ok: false, error: 'title is required' })
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    )
    const [result] = await pool.query('INSERT INTO notes (title, content) VALUES (?, ?)', [title, content || null])
    res.json({ ok: true, id: result.insertId })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Registro de usuarios
app.post('/api/signup', async (req, res) => {
  const { name, lastName, username, sex, birthdate, email, password, termsAccepted } = req.body || {}

  if (!name || !lastName || !username || !sex || !birthdate || !email || !password) {
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
      'INSERT INTO users (name, last_name, username, sex, birthdate, email, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, lastName, username, sex, birthdate, email, hash]
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
    const [rows] = await pool.query('SELECT id, name, last_name, email, password_hash FROM users WHERE email = ?', [email])
    const user = rows?.[0]
    if (!user) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' })

    return res.json({ ok: true, user: { id: user.id, name: user.name, lastName: user.last_name, email: user.email } })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})