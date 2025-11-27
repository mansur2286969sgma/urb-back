require('dotenv').config();

const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ✅ ОБНОВЛЕННОЕ ПОДКЛЮЧЕНИЕ К POSTGRESQL ДЛЯ RENDER
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// ✅ ПОДКЛЮЧЕНИЕ РОУТОВ ИЗ ПАПКИ routes
const telegramRoutes = require('./routes/telegram');
const authRoutes = require('./routes/auth');
const suggestionsRoutes = require('./routes/suggestions');
const usersRoutes = require('./routes/users');

// ✅ ИСПОЛЬЗОВАНИЕ РОУТОВ
app.use('/api/telegram', telegramRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/users', usersRoutes);

// ✅ ФУНКЦИЯ ДЛЯ ОТПРАВКИ В TELEGRAM (остается без изменений)
const sendToTelegram = async (message) => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log('⚠️ Telegram credentials not set')
      return
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }
    )
    
    console.log('✅ Message sent to Telegram')
    return response.data
  } catch (error) {
    console.error('❌ Telegram error:', error.response?.data || error.message)
  }
}


// Создание таблицы для данных о лесах
const initTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forest_reports (
        id SERIAL PRIMARY KEY,
        forest_name VARCHAR(100) NOT NULL,
        location VARCHAR(200) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        reporter_name VARCHAR(100),
        urgency_level VARCHAR(20) DEFAULT 'medium',
        coordinates VARCHAR(100),
        photo_url TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'new'
      )
    `)
    console.log('✅ Table "forest_reports" created/verified')
  } catch (error) {
    console.error('❌ Error creating table:', error)
  }
}

// Инициализация
initTable()
// Эндпоинт для принудительной инициализации БД на Render
app.post('/api/init-db', async (req, res) => {
  try {
    await initTable()
    res.json({ success: true, message: 'Database tables initialized successfully' })
  } catch (error) {
    console.error('Error initializing database:', error)
    res.status(500).json({ error: error.message })
  }
})
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Forest monitoring backend is running' })
})

// Получить все отчёты о лесах
app.get('/api/forest-reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forest_reports ORDER BY date DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error getting forest reports:', error)
    res.status(500).json({ error: error.message })
  }
})

// ✅ ОТПРАВИТЬ ОТЧЁТ О ЛЕСЕ + TELEGRAM
app.post('/api/forest-reports', async (req, res) => {
  try {
    const { 
      forest_name, 
      location, 
      report_type, 
      description, 
      reporter_name,
      urgency_level,
      coordinates 
    } = req.body
    
    if (!forest_name || !location || !report_type || !description) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' })
    }

    const result = await pool.query(
      `INSERT INTO forest_reports 
      (forest_name, location, report_type, description, reporter_name, urgency_level, coordinates) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [forest_name, location, report_type, description, reporter_name, urgency_level, coordinates]
    )
    
    const newReport = result.rows[0]
    console.log('✅ New forest report added:', newReport.id)

    // ✅ ОТПРАВКА В TELEGRAM
    const urgencyEmoji = {
      'low': '🟢',
      'medium': '🟡', 
      'high': '🟠',
      'critical': '🔴'
    }[urgency_level] || '⚪'

    const telegramMessage = `
${urgencyEmoji} НОВЫЙ ОТЧЁТ О ЛЕСЕ ПЕТРОПАВЛОВСКА:

🌲 Лес: ${forest_name}
📍 Район: ${location}
📋 Тип отчёта: ${report_type}

📝 Описание:
${description}

👤 Сообщил: ${reporter_name || 'Аноним'}
🚨 Срочность: ${urgency_level}
🕒 Время: ${new Date().toLocaleString('ru-RU')}

#лес_петропавловск #экология
    `.trim()

    await sendToTelegram(telegramMessage)
    
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
    
    const telegramMessage = `
🚨🚨🚨 ЭКСТРЕННОЕ УВЕДОМЛЕНИЕ 🚨🚨🚨

🌲 Лесной массив: ${forest_name}
📍 Местоположение: ${location}
⚠️ Тип ЧС: ${emergency_type}

📋 Детали:
${details}

👤 Сообщил: ${reporter_name || 'Аноним'}
🕒 Время: ${new Date().toLocaleString('ru-RU')}

‼️ ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ РЕАГИРОВАНИЕ ‼️
    `.trim()

    await sendToTelegram(telegramMessage)
    
    res.json({ success: true, message: 'Экстренное уведомление отправлено' })
  } catch (error) {
    console.error('Error sending emergency alert:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Forest monitoring backend running on port ${PORT}`)
  console.log(`📡 Routes available:`)
  console.log(`   - /api/telegram/*`)
  console.log(`   - /api/auth/*`)
  console.log(`   - /api/suggestions/*`)
  console.log(`   - /api/users/*`)
})
