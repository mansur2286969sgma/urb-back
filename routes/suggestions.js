const express = require('express')
const router = express.Router()
const { pool } = require('../database')

// Middleware для проверки админа (упрощенный)
const isAdmin = (req, res, next) => {
  // Здесь можно добавить нормальную аутентификацию
  next()
}

// Получить все предложения
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suggestions ORDER BY date DESC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Добавить лайк
router.post('/:id/like', async (req, res) => {
  try {
    await pool.query('UPDATE suggestions SET likes = likes + 1 WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Изменить статус (только для админа)
router.put('/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body
    await pool.query('UPDATE suggestions SET status = $1 WHERE id = $2', [status, req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Удалить предложение (только для админа)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM suggestions WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router