// backend/src/index.js
import { Hono } from 'hono';

const app = new Hono();

// � Ручной CORS middleware (работает всегда)
app.use('*', async (c, next) => {
  // Разрешённые источники
  const allowedOrigins = [
    'https://vhelp.vercel.app',
    'https://vk.com',
    'https://*.vk.com',
    'https://vk.ru',
    'https://*.vk.ru'
  ];
  
  const origin = c.req.header('Origin') || '';
  const isAllowed = allowedOrigins.some(pattern => 
    origin === pattern || 
    (pattern.includes('*') && new RegExp('^' + pattern.replace(/\*/g, '.*') + '$').test(origin))
  );
  
  if (isAllowed || process.env.NODE_ENV !== 'production') {
    c.header('Access-Control-Allow-Origin', origin === '' ? '*' : origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400'); // кэш preflight на 24 часа
  }
  
  // Обработка preflight-запроса
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  
  await next();
});

// 🏥 Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    worker: 'vhelp-api',
    timestamp: new Date().toISOString()
  });
});

// � Пример: авторизация (заглушка)
app.post('/api/auth/vk', async (c) => {
  // Ваша логика авторизации здесь
  return c.json({ message: 'Auth endpoint ready' });
});

// 🔁 Экспорт для Cloudflare Workers
export default app;
