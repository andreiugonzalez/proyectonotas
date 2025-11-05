import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function run() {
  const dbName = process.env.DB_NAME || 'allnotes'

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  })

  console.log('Conectado a MySQL, creando base de datos si no existe…')
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`USE \`${dbName}\``)

  console.log('Creando/actualizando tabla users…')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `)
  const ensureCol = async (name, ddl) => {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [dbName, name]
    )
    if (!rows.length) {
      console.log(`Añadiendo columna ${name} a users…`)
      await conn.query(ddl)
    }
  }
  await ensureCol('username', `ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL UNIQUE AFTER last_name`)
  await ensureCol('country', `ALTER TABLE users ADD COLUMN country VARCHAR(80) NOT NULL DEFAULT 'Chile' AFTER username`)
  await ensureCol('region', `ALTER TABLE users ADD COLUMN region VARCHAR(120) NOT NULL AFTER country`)
  await ensureCol('commune', `ALTER TABLE users ADD COLUMN commune VARCHAR(120) NOT NULL AFTER region`)
  await ensureCol('avatar_url', `ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER password_hash`)

  console.log('Creando tabla notes con relación a users…')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS notes (
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
    ) ENGINE=InnoDB;
  `)

  // Asegurar columnas si ya existía la tabla sin medios
  const ensureNotesCol = async (name, ddl) => {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = ?`,
      [dbName, name]
    )
    if (!rows.length) {
      console.log(`Añadiendo columna ${name} a notes…`)
      await conn.query(ddl)
    }
  }
  await ensureNotesCol('image_url', `ALTER TABLE notes ADD COLUMN image_url VARCHAR(255) NULL AFTER content`)
  await ensureNotesCol('video_url', `ALTER TABLE notes ADD COLUMN video_url VARCHAR(255) NULL AFTER image_url`)
  await ensureNotesCol('audio_url', `ALTER TABLE notes ADD COLUMN audio_url VARCHAR(255) NULL AFTER video_url`)
  await ensureNotesCol('tags', `ALTER TABLE notes ADD COLUMN tags VARCHAR(255) NULL AFTER audio_url`)
  await ensureNotesCol('pinned', `ALTER TABLE notes ADD COLUMN pinned TINYINT(1) DEFAULT 0 AFTER tags`)
  await ensureNotesCol('updated_at', `ALTER TABLE notes ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at`)

  console.log('Migración completada ✅')
  await conn.end()
}

run().catch((err) => {
  console.error('Error en migración:', err)
  process.exit(1)
})