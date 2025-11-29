// routes/auth.js
const express = require('express');
const router = express.Router();

// Вход администратора
router.post('/admin/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    // Проверка учетных данных (в реальном приложении используйте хеширование!)
    if (login === 'admin' && password === 'admin123') {
      // Создаем JWT токен
      const token = jwt.sign(
        { userId: 1, role: 'admin', login: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: 1,
          login: 'admin',
          role: 'admin',
          name: 'Администратор'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера'
    });
  }
});

// Проверка токена администратора
router.get('/admin/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен'
      });
    }

    res.json({
      success: true,
      user: {
        id: decoded.userId,
        login: decoded.login,
        role: decoded.role,
        name: 'Администратор'
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Неверный токен'
    });
  }
});

// Выход администратора (на бэкенде обычно просто удаляем токен на клиенте)
router.post('/admin/logout', async (req, res) => {
  res.json({
    success: true,
    message: 'Успешный выход'
  });
});

module.exports = router;