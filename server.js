require('dotenv').config();

const express = require('express')
const cors = require('cors')
const { pool } = require('./database')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ✅ ПОДКЛЮЧЕНИЕ РОУТОВ
const suggestionsRoutes = require('./routes/suggestions');
const authRoutes = require('./routes/auth');

app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/auth', authRoutes);

// ✅ СОЗДАНИЕ ВСЕХ ТАБЛИЦ
const initTable = async () => {
  try {
    // Таблица для предложений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'new',
        is_pinned BOOLEAN DEFAULT false,
        priority VARCHAR(20),
        category VARCHAR(50)
      )
    `)
    console.log('✅ Table "suggestions" created/verified')
    
    // Таблица для отчетов о лесах
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forest_reports (
        id SERIAL PRIMARY KEY,
        forest_name VARCHAR(100) NOT NULL,
        location VARCHAR(200) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        reporter_name VARCHAR(100),
        urgency_level VARCHAR(20) DEFAULT 'medium',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table "forest_reports" created/verified')

    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table "users" created/verified')

    // Таблица сессий
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table "user_sessions" created/verified')

    // Обновляем таблицу комментариев
    await pool.query(`
      ALTER TABLE suggestion_comments 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `)
    console.log('✅ Table "suggestion_comments" updated')

  } catch (error) {
    console.error('❌ Error creating tables:', error)
  }
}

// Инициализация
initTable()

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Forest monitoring backend is running' })
})

// ✅ ПОЛУЧИТЬ ВСЕ ОТЧЁТЫ О ЛЕСАХ
app.get('/api/forest-reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forest_reports ORDER BY date DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error getting forest reports:', error)
    res.status(500).json({ error: error.message })
  }
})

// ✅ ОТПРАВИТЬ ОТЧЁТ О ЛЕСЕ
app.post('/api/forest-reports', async (req, res) => {
  try {
    const { 
      forest_name, 
      location, 
      report_type, 
      description, 
      reporter_name,
      urgency_level
    } = req.body
    
    if (!forest_name || !location || !report_type || !description) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' })
    }

    const result = await pool.query(
      `INSERT INTO forest_reports 
      (forest_name, location, report_type, description, reporter_name, urgency_level) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [forest_name, location, report_type, description, reporter_name, urgency_level]
    )
    
    const newReport = result.rows[0]
    console.log('✅ New forest report added:', newReport.id)
    
    res.json(newReport)
  } catch (error) {
    console.error('Error creating forest report:', error)
    res.status(500).json({ error: error.message })
  }
})

// ✅ ЭКСТРЕННОЕ УВЕДОМЛЕНИЕ
app.post('/api/forest-alert', async (req, res) => {
  try {
    const { forest_name, location, emergency_type, details, reporter_name } = req.body
    
    const result = await pool.query(
      `INSERT INTO forest_reports 
      (forest_name, location, report_type, description, reporter_name, urgency_level) 
      VALUES ($1, $2, $3, $4, $5, 'critical') RETURNING *`,
      [forest_name, location, emergency_type, details, reporter_name]
    )
    
    console.log('✅ Emergency alert added:', result.rows[0].id)
    
    res.json({ success: true, message: 'Экстренное уведомление отправлено' })
  } catch (error) {
    console.error('Error sending emergency alert:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Forest monitoring backend running on port ${PORT}`)
  console.log(`📡 Routes available:`)
  console.log(`   - /api/suggestions/*`)
  console.log(`   - /api/auth/*`)
  console.log(`   - /api/forest-reports`)
  console.log(`   - /api/forest-alert`)
  console.log(`   - /api/health`)
})