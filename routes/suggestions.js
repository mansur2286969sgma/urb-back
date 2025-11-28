const express = require('express')
const router = express.Router()
const { pool } = require('../database')

// Middleware для проверки админа (упрощенный)
const isAdmin = (req, res, next) => {
  // Временная заглушка - всегда разрешаем для теста
  next()
}

// Получить все предложения с комментариями
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, 
        s.name, 
        s.message, 
        s.date, 
        s.likes, 
        s.status, 
        s.is_pinned as "isPinned", 
        s.priority, 
        s.category,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'author', c.author,
              'text', c.text,
              'date', c.date
            ) ORDER BY c.date
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as comments
      FROM suggestions s
      LEFT JOIN suggestion_comments c ON s.id = c.suggestion_id
      GROUP BY s.id
      ORDER BY 
        s.is_pinned DESC,
        CASE WHEN s.priority = 'high' THEN 0 ELSE 1 END,
        s.date DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    res.status(500).json({ error: error.message })
  }
})

// Создать новое предложение
router.post('/', async (req, res) => {
  try {
    const { name, message, category = 'other' } = req.body
    
    const result = await pool.query(
      `INSERT INTO suggestions (name, message, category) 
       VALUES ($1, $2, $3) RETURNING *`,
      [name, message, category]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('❌ Ошибка при создании предложения:', error)
    res.status(500).json({ error: error.message })
  }
})

// Добавить лайк
router.post('/:id/like', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE suggestions SET likes = COALESCE(likes, 0) + 1 WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    
    res.json({ success: true, likes: result.rows[0].likes })
  } catch (error) {
    console.error('Error liking suggestion:', error)
    res.status(500).json({ error: error.message })
  }
})

// Закрепить/открепить предложение
router.put('/:id/pin', isAdmin, async (req, res) => {
  try {
    const { isPinned } = req.body
    console.log('📌 Закрепление:', { id: req.params.id, isPinned })
    
    const result = await pool.query(
      'UPDATE suggestions SET is_pinned = $1 WHERE id = $2 RETURNING *',
      [isPinned, req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    
    console.log('✅ Закреплено:', result.rows[0])
    res.json({ success: true, isPinned: result.rows[0].is_pinned })
  } catch (error) {
    console.error('Error toggling pin:', error)
    res.status(500).json({ error: error.message })
  }
})

// Установить приоритет
router.put('/:id/priority', isAdmin, async (req, res) => {
  try {
    const { priority } = req.body
    console.log('🔥 Приоритет:', { id: req.params.id, priority })
    
    const result = await pool.query(
      'UPDATE suggestions SET priority = $1 WHERE id = $2 RETURNING *',
      [priority, req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    
    console.log('✅ Приоритет установлен:', result.rows[0])
    res.json({ success: true, priority: result.rows[0].priority })
  } catch (error) {
    console.error('Error setting priority:', error)
    res.status(500).json({ error: error.message })
  }
})

// Изменить статус
router.put('/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body
    console.log('📋 Статус:', { id: req.params.id, status })
    
    const result = await pool.query(
      'UPDATE suggestions SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    
    console.log('✅ Статус изменен:', result.rows[0])
    res.json({ success: true, status: result.rows[0].status })
  } catch (error) {
    console.error('Error changing status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Добавить комментарий (доступно всем) - альтернативный маршрут
router.post('/:id/comments', async (req, res) => {
  try {
    const { author, text } = req.body
    const suggestionId = req.params.id
    
    console.log('💬 Добавление комментария:', { suggestionId, author, text })
    
    if (!author || !text) {
      return res.status(400).json({ error: 'Author and text are required' })
    }
    
    const result = await pool.query(
      `INSERT INTO suggestion_comments (suggestion_id, author, text) 
       VALUES ($1, $2, $3) RETURNING *`,
      [suggestionId, author, text]
    )
    
    console.log('✅ Комментарий добавлен:', result.rows[0])
    res.json({ success: true, comment: result.rows[0] })
  } catch (error) {
    console.error('Error adding comment:', error)
    res.status(500).json({ error: error.message })
  }
})

// Удалить предложение
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    console.log('🗑️ Удаление предложения:', req.params.id)
    
    const result = await pool.query(
      'DELETE FROM suggestions WHERE id = $1 RETURNING id',
      [req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' })
    }
    
    console.log('✅ Предложение удалено:', result.rows[0])
    res.json({ success: true, deletedId: result.rows[0].id })
  } catch (error) {
    console.error('Error deleting suggestion:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router