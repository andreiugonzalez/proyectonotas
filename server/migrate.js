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
      sex VARCHAR(10) NOT NULL,
      birthdate DATE NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `)
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'`,
    [dbName]
  )
  if (!rows.length) {
    console.log('Añadiendo columna username a users…')
    await conn.query(`ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL UNIQUE AFTER last_name`)
  }

  console.log('Creando tabla notes con relación a users…')
  await conn.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notes_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `)

  console.log('Migración completada ✅')
  await conn.end()
}

run().catch((err) => {
  console.error('Error en migración:', err)
  process.exit(1)
})