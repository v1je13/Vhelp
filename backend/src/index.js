// backend/src/index.js
import { Hono } from 'hono';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const app = new Hono();

// � CORS (ручной, надёжный)
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '';
  const allowed = ['https://vhelp.vercel.app', 'https://vk.com', 'https://*.vk.com'];
  const isAllowed = allowed.some(p => 
    origin === p || (p.includes('*') && new RegExp('^' + p.replace(/\*/g, '.*') + '$').test(origin))
  );
  
  if (isAllowed || process.env.NODE_ENV !== 'production') {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    c.res.headers.set('Access-Control-Max-Age', '86400');
  }
  
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c.res.headers });
  await next();
});

// 🗄 MongoDB с кэшем подключения
let cachedDB = null;
async function getDB() {
  if (cachedDB) return cachedDB;
  cachedDB = await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false, maxPoolSize: 5 });
  console.log('MongoDB connected');
  return cachedDB;
}

// 🔐 Проверка подписи VK
function verifyVKSignature(params, clientSecret) {
  const { sign, ...data } = params;
  const sorted = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('');
  const hash = crypto.createHmac('sha256', clientSecret).update(sorted).digest('hex');
  return hash === sign;
}

// 🔐 Middleware: проверка токена
const auth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token' }, 401);
  
  try {
    // Проверяем blacklist в KV (если есть)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof STORAGE !== 'undefined') {
      const blacklisted = await STORAGE.get(`blacklist:${decoded.jti}`);
      if (blacklisted) return c.json({ error: 'Token revoked' }, 401);
    }
    c.set('user', decoded);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// 🏥 Health check
app.get('/api/health', (c) => c.json({ status: 'ok', env: process.env.NODE_ENV }));

// 🔐 VK авторизация
app.post('/api/auth/vk', async (c) => {
  try {
    const body = await c.req.json();
    const { vk_user_id, sign, first_name, last_name, photo, ...rest } = body;
    
    // 🔥 sign теперь опционален (для простых мини-приложений)
    if (!vk_user_id) {
      return c.json({ error: 'VK user ID required' }, 400);
    }
    
    // Level 2: проверка подписи ТОЛЬКО если sign предоставлен
    if (sign && process.env.NODE_ENV === 'production' && process.env.VK_CLIENT_SECRET) {
      if (!verifyVKSignature({ vk_user_id, first_name, last_name, photo, ...rest, sign }, process.env.VK_CLIENT_SECRET)) {
        return c.json({ error: 'Invalid signature' }, 403);
      }
    } else if (!sign) {
      console.warn('⚠️ No sign provided - skipping signature verification (OK for simple VK Mini Apps)');
    }
    
    const db = await getDB();
    const User = db.model('User', new mongoose.Schema({
      vkId: { type: String, required: true, unique: true },
      firstName: String,
      lastName: String,
      avatar: String,
      bio: { type: String, default: '' }
    }, { timestamps: true }));
    
    // Найти или создать пользователя
    let user = await User.findOne({ vkId: vk_user_id });
    if (!user) {
      user = await User.create({
        vkId: vk_user_id,
        firstName: first_name || 'User',
        lastName: last_name || '',
        avatar: photo || ''
      });
    } else {
      // Обновить данные, если изменились
      if (user.firstName !== first_name || user.avatar !== photo) {
        user.firstName = first_name || user.firstName;
        user.lastName = last_name || user.lastName;
        user.avatar = photo || user.avatar;
        await user.save();
      }
    }
    
    // Выдаём JWT с уникальным jti для отзыва
    const token = jwt.sign(
      { userId: user._id, vkId: user.vkId },
      process.env.JWT_SECRET,
      { expiresIn: '30d', jwtid: crypto.randomUUID() }
    );
    
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
  } catch (err) {
    console.error('VK auth error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 👤 Текущий пользователь
app.get('/api/auth/me', auth, async (c) => {
  try {
    const db = await getDB();
    const User = db.model('User');
    const user = await User.findById(c.get('user').userId).select('-__v');
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
  } catch (err) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// 📦 Модель поста
const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000 },
  images: [String],
  location: { lat: Number, lng: Number, name: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

// � Получить ленту постов (с кэшем в KV)
app.get('/api/posts', async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = 20;
    const cacheKey = `posts:page:${page}`;
    
    // Проверяем кэш в KV
    if (typeof STORAGE !== 'undefined') {
      const cached = await STORAGE.get(cacheKey, 'json');
      if (cached && Date.now() - cached.ts < 300000) { // 5 минут
        return c.json({ ...cached, fromCache: true });
      }
    }
    
    const db = await getDB();
    const Post = db.model('Post', PostSchema);
    const User = db.model('User');
    
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'firstName lastName avatar')
      .lean();
    
    const result = {
      posts,
      page,
      hasMore: posts.length === limit
    };
    
    // Сохраняем в кэш
    if (typeof STORAGE !== 'undefined') {
      await STORAGE.put(cacheKey, JSON.stringify({ ...result, ts: Date.now() }), { expirationTtl: 300 });
    }
    
    return c.json(result);
  } catch (err) {
    console.error('Posts fetch error:', err);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// ✨ Создать пост
app.post('/api/posts', auth, async (c) => {
  try {
    const { text, images, location } = await c.req.json();
    if (!text || text.trim().length < 3) return c.json({ error: 'Text is required (min 3 chars)' }, 400);
    
    const db = await getDB();
    const Post = db.model('Post', PostSchema);
    
    const post = await Post.create({
      userId: c.get('user').userId,
      text: text.trim(),
      images: images || [],
      location: location || null
    });
    
    // Очистить кэш ленты
    if (typeof STORAGE !== 'undefined') {
      await STORAGE.delete('posts:page:1');
    }
    
    // Populate автора для ответа
    const populated = await Post.findById(post._id).populate('userId', 'firstName lastName avatar');
    return c.json({ post: populated }, 201);
  } catch (err) {
    console.error('Create post error:', err);
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

// ❤️ Лайкнуть пост
app.post('/api/posts/:id/like', auth, async (c) => {
  try {
    const db = await getDB();
    const Post = db.model('Post', PostSchema);
    const User = db.model('User');
    
    const post = await Post.findById(c.req.param('id'));
    if (!post) return c.json({ error: 'Post not found' }, 404);
    
    const userId = c.get('user').userId;
    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    
    return c.json({ liked: !isLiked, count: post.likes.length });
  } catch (err) {
    return c.json({ error: 'Failed to toggle like' }, 500);
  }
});

// 🔁 Экспорт для Cloudflare Workers
export default app;
