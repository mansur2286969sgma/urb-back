const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
})

const initDB = async () => {
  try {
    console.log('✅ Connected to PostgreSQL successfully')
    // Проверим что таблица существует
    const result = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suggestions')")
    if (result.rows[0].exists) {
      console.log('✅ Table suggestions exists')
    } else {
      console.log('❌ Table suggestions does not exist')
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
  }
}

module.exports = { pool, initDB }