import { Hono } from 'hono';
import { cors } from 'hono/cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const app = new Hono();

// 🔐 CORS — разрешаем только ваш фронтенд и VK
app.use('/*', cors({
  origin: ['https://vk.com', 'https://*.vk.com', process.env.FRONTEND_URL],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 🗄 MongoDB connection (кэшируем)
let mongoClient = null;
async function getDB() {
  if (mongoClient) return mongoClient;
  mongoClient = await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  console.log('MongoDB connected');
  return mongoClient;
}

// 🔐 VK Auth middleware (упрощённая версия)
const vkAuth = async (c, next) => {
  const { vk_user_id, sign } = await c.req.json();
  if (!vk_user_id || !sign) return c.json({ message: 'VK auth data required' }, 401);
  
  // В production добавьте проверку подписи через crypto
  // if (process.env.NODE_ENV === 'production' && !verifyVKSignature(...)) ...
  
  const db = await getDB();
  let user = await db.model('User').findOne({ vkId: vk_user_id });
  if (!user) {
    // Создаём нового пользователя (упрощённо)
    user = new db.model('User')({ vkId: vk_user_id, firstName: 'User', lastName: '' });
    await user.save();
  }
  c.set('user', user);
  await next();
};

// 🏥 Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// 🔐 VK авторизация
app.post('/api/auth/vk', vkAuth, async (c) => {
  const user = c.get('user');
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return c.json({
    token,
    user: {
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

// 👤 Получение текущего пользователя
app.get('/api/auth/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ message: 'No token' }, 401);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await getDB();
    const user = await db.model('User').findById(decoded.userId).select('-password');
    if (!user) return c.json({ message: 'User not found' }, 404);
    return c.json({
      id: user._id,
      vkId: user.vkId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch {
    return c.json({ message: 'Invalid token' }, 401);
  }
});

// 📦 Пример: получение постов (адаптируйте под вашу логику)
app.get('/api/posts', async (c) => {
  const db = await getDB();
  const posts = await db.model('Post').find().sort({ createdAt: -1 }).limit(50);
  return c.json({ posts });
});

// 🔁 Экспорт для Cloudflare Workers
export default app;
