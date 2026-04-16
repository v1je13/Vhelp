// backend/src/index.js
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const app = new Hono();

// 🔐 CORS
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
  }
  
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c.res.headers });
  await next();
});

//  Middleware авторизации
const auth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token' }, 401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const db = c.env.DB;
    const { vk_user_id, first_name, last_name, photo } = await c.req.json();
    if (!vk_user_id) return c.json({ error: 'VK user ID required' }, 400);
    
    let user = await db.prepare('SELECT * FROM users WHERE vk_id = ?').bind(vk_user_id).first();
    
    if (!user) {
      const userId = crypto.randomUUID();
      await db.prepare('INSERT INTO users (id, vk_id, first_name, last_name, avatar) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, vk_user_id, first_name || 'User', last_name || '', photo || '').run();
      user = { id: userId, vk_id: vk_user_id, first_name, last_name, avatar: photo };
    } else {
      await db.prepare('UPDATE users SET first_name = ?, last_name = ?, avatar = ?, updated_at = ? WHERE vk_id = ?')
        .bind(first_name || user.first_name, last_name || user.last_name, photo || user.avatar, Date.now(), vk_user_id).run();
    }
    
const token = jwt.sign({ userId: user.id, vkId: user.vk_id }, c.env.JWT_SECRET, { expiresIn: '30d', jwtid: crypto.randomUUID() });
    return c.json({ token, user: { id: user.id, vkId: user.vk_id, firstName: user.first_name, lastName: user.last_name, avatar: user.avatar, bio: user.bio } });
  } catch (err) {
    console.error('VK auth error:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// 👤 Текущий пользователь
app.get('/api/auth/me', auth, async (c) => {
  try {
    const db = c.env.DB;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('user').userId).first();
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ id: user.id, vkId: user.vk_id, firstName: user.first_name, lastName: user.last_name, avatar: user.avatar, bio: user.bio, createdAt: user.created_at });
  } catch (err) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// 📰 Лента постов
app.get('/api/posts', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const { results } = await db.prepare('SELECT p.*, u.first_name, u.last_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
    return c.json({ posts: results, page, hasMore: results.length === limit });
  } catch (err) {
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// ✨ Создать пост
app.post('/api/posts', auth, async (c) => {
  try {
    const db = c.env.DB;
    const { text, images, location } = await c.req.json();
    if (!text || text.trim().length < 3) return c.json({ error: 'Text required (min 3 chars)' }, 400);
    const postId = crypto.randomUUID();
    await db.prepare('INSERT INTO posts (id, user_id, text, images, location) VALUES (?, ?, ?, ?, ?)')
      .bind(postId, c.get('user').userId, text.trim(), JSON.stringify(images || []), JSON.stringify(location || null)).run();
    const post = await db.prepare('SELECT p.*, u.first_name, u.last_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?').bind(postId).first();
    return c.json({ post }, 201);
  } catch (err) {
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

// ❤️ Лайкнуть пост
app.post('/api/posts/:id/like', auth, async (c) => {
  try {
    const db = c.env.DB;
    const postId = c.req.param('id');
    const userId = c.get('user').userId;
    const existing = await db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?').bind(postId, userId).first();
    if (existing) {
      await db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').bind(postId, userId).run();
      await db.prepare('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?').bind(postId).run();
      const newCount = (await db.prepare('SELECT likes_count FROM posts WHERE id = ?').bind(postId).first()).likes_count;
      return c.json({ liked: false, count: Math.max(0, newCount) });
    } else {
      await db.prepare('INSERT INTO likes (id, post_id, user_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), postId, userId).run();
      await db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').bind(postId).run();
      const newCount = (await db.prepare('SELECT likes_count FROM posts WHERE id = ?').bind(postId).first()).likes_count;
      return c.json({ liked: true, count: newCount });
    }
  } catch (err) {
    return c.json({ error: 'Failed to toggle like' }, 500);
  }
});

export default app;
