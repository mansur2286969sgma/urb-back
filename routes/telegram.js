const express = require('express');
const router = express.Router();
const axios = require('axios');

// Временное хранилище подписчиков (в реальном проекте используйте БД)
let subscribers = [];

// Маршрут для отправки в Telegram (администраторам)
router.post('/send-to-telegram', async (req, res) => {
  try {
    const { name, contact, message } = req.body;

    // Валидация
    if (!name || !contact || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Все поля обязательны для заполнения' 
      });
    }

    const telegramMessage = `
📨 Новая заявка с сайта Clean Waters:

👤 Имя: ${name}
📞 Контакты: ${contact}
💬 Сообщение: ${message}

🌐 Сайт: Clean Waters
🕒 ${new Date().toLocaleString('ru-RU')}
    `.trim();

    // Отправка администраторам
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: telegramMessage,
        parse_mode: 'HTML'
      }
    );

    res.json({ 
      success: true, 
      message: 'Сообщение успешно отправлено' 
    });

  } catch (error) {
    console.error('Telegram error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при отправке сообщения' 
    });
  }
});

// Подписка на уведомления о проблемах в лесах
router.post('/subscribe', async (req, res) => {
  try {
    const { name, telegram_id, notifications, forests } = req.body;

    if (!name || !telegram_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Имя и Telegram ID обязательны' 
      });
    }

    // Проверяем, не подписан ли уже пользователь
    const existingSubscriber = subscribers.find(sub => sub.telegram_id === telegram_id);
    if (existingSubscriber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Вы уже подписаны на уведомления' 
      });
    }

    // Сохраняем подписчика
    const newSubscriber = {
      id: Date.now(),
      name,
      telegram_id,
      notifications: notifications || [],
      forests: forests || [],
      subscribed_at: new Date()
    };
    
    subscribers.push(newSubscriber);

    const welcomeMessage = `
🌲 Добро пожаловать в систему мониторинга лесов Петропавловска!

👋 Здравствуйте, ${name}!
✅ Вы успешно подписались на уведомления о состоянии лесов.

📋 Вы будете получать:
• 🚨 Экстренные оповещения о пожарах и вырубках
• 📊 Уведомления о новых проблемах в лесах
• 🔄 Информацию о решении проблем
• 🌤️ Погодные предупреждения

🌳 Отслеживаемые леса: ${forests.join(', ')}

Теперь вы будете в курсе всех важных событий в лесах нашего города!

Спасибо за ваш вклад в защиту природы! 🌿

🕒 ${new Date().toLocaleString('ru-RU')}
    `.trim();

    // Отправляем приветственное сообщение
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: telegram_id,
        text: welcomeMessage,
        parse_mode: 'HTML'
      }
    );

    res.json({ 
      success: true, 
      message: 'Подписка оформлена успешно' 
    });

  } catch (error) {
    console.error('Telegram subscription error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при оформлении подписки' 
    });
  }
});

// Функция для рассылки уведомлений всем подписчикам
async function broadcastToSubscribers(message, problemForest = null) {
  try {
    const promises = subscribers.map(async (subscriber) => {
      // Проверяем, интересует ли пользователя этот лес
      if (problemForest && subscriber.forests.length > 0 && 
          !subscriber.forests.includes(problemForest)) {
        return; // Пропускаем если пользователь не отслеживает этот лес
      }

      try {
        await axios.post(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            chat_id: subscriber.telegram_id,
            text: message,
            parse_mode: 'HTML'
          }
        );
      } catch (error) {
        console.error(`Error sending to ${subscriber.telegram_id}:`, error.message);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

// Роут для отправки отчета о лесе (администраторам + подписчикам)
router.post('/forest-report', async (req, res) => {
  try {
    const { forest_name, location, report_type, description, reporter_name, urgency_level } = req.body;

    // Валидация
    if (!forest_name || !location || !report_type || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Все обязательные поля должны быть заполнены' 
      });
    }

    // Сообщение для администраторов
    const adminMessage = `
🚨 НОВЫЙ ОТЧЕТ О ПРОБЛЕМЕ В ЛЕСУ

🌲 Лесной массив: ${forest_name}
📍 Район: ${location}
⚠️ Тип проблемы: ${report_type}
🚩 Срочность: ${getUrgencyText(urgency_level)}
📝 Описание: ${description}
👤 Отправитель: ${reporter_name || 'Не указано'}

🕒 ${new Date().toLocaleString('ru-RU')}
    `.trim();

    // Отправка администраторам
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: adminMessage,
        parse_mode: 'HTML'
      }
    );

    // Сообщение для подписчиков (более краткое)
    const subscriberMessage = `
🌲 Новая проблема в лесу "${forest_name}"

⚠️ ${report_type}
📍 ${location}
📝 ${description.length > 100 ? description.substring(0, 100) + '...' : description}

ℹ️ Срочность: ${getUrgencyText(urgency_level)}

Следите за обновлениями по этой проблеме!
    `.trim();

    // Рассылка всем подписчикам
    await broadcastToSubscribers(subscriberMessage, forest_name);

    res.json({ 
      success: true, 
      message: 'Отчет отправлен администраторам и подписчикам' 
    });

  } catch (error) {
    console.error('Forest report error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при отправке отчета' 
    });
  }
});

// Вспомогательная функция
function getUrgencyText(level) {
  const levels = {
    'low': '🟢 Низкая',
    'medium': '🟡 Средняя', 
    'high': '🟠 Высокая',
    'critical': '🔴 Критическая'
  };
  return levels[level] || '🟡 Средняя';
}

// Роут для получения списка подписчиков (для админки)
router.get('/subscribers', (req, res) => {
  res.json({
    success: true,
    count: subscribers.length,
    subscribers: subscribers
  });
});

module.exports = router;