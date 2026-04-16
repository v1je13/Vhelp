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
  // 🔥 Получаем заголовок
  const authHeader = c.req.header('Authorization');
  console.log('🔐 [Auth] Header:', authHeader);  // ← добавь лог для отладки
  
  if (!authHeader) {
    console.warn('⚠️ [Auth] No Authorization header');
    return c.json({ error: 'No token' }, 401);
  }
  
  // 🔥 Убираем префикс "Bearer "
  const token = authHeader.replace('Bearer ', '');
  console.log('🔐 [Auth] Token (first 30):', token.substring(0, 30) + '...');
  
  try {
    // 🔥 Проверяем токен
    const decoded = jwt.verify(token, c.env.JWT_SECRET);  // ← c.env, не process.env!
    console.log('✅ [Auth] Token valid:', decoded);
    c.set('user', decoded);
    await next();
  } catch (err) {
    console.error('❌ [Auth] Token invalid:', err.message);
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

// Получить профиль пользователя
app.get('/api/users/:id', async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.req.param('id');
    
    console.log('📥 Fetching user profile:', userId);
    
    const user = await db.prepare(`
      SELECT id, vk_id, first_name, last_name, avatar, bio, created_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();
    
    if (!user) {
      console.warn('⚠️ User not found:', userId);
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Считаем количество постов пользователя
    const postsCount = await db.prepare(`
      SELECT COUNT(*) as count FROM posts WHERE user_id = ?
    `).bind(userId).first();
    
    // Заглушки для друзей/подписчиков (можно расширить позже)
    return c.json({ 
      user: {
        ...user,
        friends_count: 0,  // ← Пока 0, можно добавить таблицу friends
        subscribers_count: postsCount?.count || 0  // ← Используем количество постов
      }
    });
    
  } catch (err) {
    console.error('❌ Error fetching user:', err);
    return c.json({ error: 'Failed to fetch user: ' + err.message }, 500);
  }
});

// Получить посты пользователя
app.get('/api/users/:id/posts', async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.req.param('id');
    
    console.log('📥 Fetching user posts:', userId);
    
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 50
    `).bind(userId).all();
    
    console.log('✅ Found posts:', results.length);
    
    return c.json({ posts: results });
    
  } catch (err) {
    console.error('❌ Error fetching user posts:', err);
    return c.json({ error: 'Failed to fetch posts: ' + err.message }, 500);
  }
});

// 🌍 Получить путешествия пользователя
app.get('/api/trips', auth, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('user').userId;

    const { results } = await db.prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM posts WHERE trip_id = t.id) as notes_count
      FROM trips t
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).bind(userId).all();

    return c.json({ trips: results });
  } catch (err) {
    console.error('Fetch trips error:', err);
    return c.json({ error: 'Failed to fetch trips' }, 500);
  }
});

// 🌍 Создать путешествие
app.post('/api/trips', auth, async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get('user').userId;
    const { name, description, cover_image } = await c.req.json();
    
    if (!name || name.trim().length < 3) {
      return c.json({ error: 'Name required (min 3 chars)' }, 400);
    }
    
    const tripId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO trips (id, user_id, name, description, cover_image)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tripId, userId, name.trim(), description || '', cover_image || '').run();
    
    const trip = await db.prepare(`
      SELECT * FROM trips WHERE id = ?
    `).bind(tripId).first();
    
    return c.json({ trip }, 201);
  } catch (err) {
    return c.json({ error: 'Failed to create trip' }, 500);
  }
});

// 🌍 Удалить путешествие
app.delete('/api/trips/:id', auth, async (c) => {
  try {
    const db = c.env.DB;
    const tripId = c.req.param('id');
    const userId = c.get('user').userId;
    
    // Проверяем, что путешествие принадлежит пользователю
    const trip = await db.prepare(`
      SELECT * FROM trips WHERE id = ? AND user_id = ?
    `).bind(tripId, userId).first();
    
    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }
    
    // Удаляем все заметки путешествия
    await db.prepare(`DELETE FROM notes WHERE trip_id = ?`).bind(tripId).run();
    
    // Удаляем путешествие
    await db.prepare(`DELETE FROM trips WHERE id = ?`).bind(tripId).run();
    
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete trip' }, 500);
  }
});

// 🔥 Получить заметки путешествия (обновлённый)
app.get('/api/trips/:id/notes', auth, async (c) => {
  try {
    const db = c.env.DB;
    const tripId = c.req.param('id');
    const userId = c.get('user').userId;

    // Проверяем, что путешествие принадлежит пользователю
    const trip = await db.prepare(`
      SELECT * FROM trips WHERE id = ? AND user_id = ?
    `).bind(tripId, userId).first();

    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    // 🔥 Получаем посты с trip_id
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.trip_id = ?
      ORDER BY p.created_at DESC
    `).bind(tripId).all();

    return c.json({ notes: results, posts: results });
  } catch (err) {
    console.error('Fetch trip notes error:', err);
    return c.json({ error: 'Failed to fetch notes' }, 500);
  }
});

// � Получить один пост по ID (добавлен ПЕРЕД /api/posts)
app.get('/api/posts/:id', async (c) => {
  try {
    const db = c.env.DB;
    const postId = c.req.param('id');
    
    console.log('📥 Fetching post:', postId);
    
    const post = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).bind(postId).first();
    
    if (!post) {
      console.warn('⚠️ Post not found:', postId);
      return c.json({ error: 'Post not found' }, 404);
    }
    
    console.log('✅ Post found:', post.id);
    return c.json({ post });
    
  } catch (err) {
    console.error('❌ Error fetching post:', err);
    return c.json({ error: 'Failed to fetch post: ' + err.message }, 500);
  }
});

// 🔍 Получить посты по тэгу
app.get('/api/tags/:tag/posts', auth, async (c) => {
  try {
    const db = c.env.DB;
    const tag = c.req.param('tag');
    
    // Ищем тэг внутри JSON-строки (безопасный LIKE)
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.tags LIKE ?
      ORDER BY p.created_at DESC
    `).bind(`%"${tag}"%`).all();
    
    return c.json({ posts: results });
  } catch (err) {
    return c.json({ error: 'Failed to fetch posts by tag' }, 500);
  }
});

// Лента постов
app.get('/api/posts', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const { results } = await db.prepare('SELECT p.*, u.first_name, u.last_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
    
    // 🔥 Проверяем, что images есть в результате
    console.log('📋 Post images:', results[0]?.images);
    
    // 🔥 Приводим поля к единому формату
    const postsWithDetails = results.map(post => ({
      ...post,
      first_name: post.first_name || post.firstName,
      last_name: post.last_name || post.lastName,
      avatar: post.avatar || post.photo
    }));
    
    return c.json({ posts: postsWithDetails, page, hasMore: results.length === limit });
  } catch (err) {
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// ✨ Создать пост
app.post('/api/posts', auth, async (c) => {
  try {
    const db = c.env.DB;
    const { text, images, tags = [], trip_id = null } = await c.req.json();

    if (!text || text.trim().length < 3) {
      return c.json({ error: 'Text required (min 3 chars)' }, 400);
    }

    const postId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO posts (id, user_id, text, images, tags, trip_id, location, likes_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
      postId,
      c.get('user').userId,
      text.trim(),
      JSON.stringify(images || []),
      JSON.stringify(tags),
      trip_id, // ← Привязка к путешествию
      JSON.stringify(null)
    ).run();
    
    const post = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).bind(postId).first();
    
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

// 💬 Получить комментарии к посту
app.get('/api/posts/:id/comments', async (c) => {
  try {
    const db = c.env.DB;
    const postId = c.req.param('id');
    
    const { results } = await db.prepare(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).bind(postId).all();
    
    return c.json({ comments: results });
  } catch (err) {
    console.error('Fetch comments error:', err);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// ✨ Создать комментарий
app.post('/api/posts/:id/comments', auth, async (c) => {
  try {
    const db = c.env.DB;
    const postId = c.req.param('id');
    const { text } = await c.req.json();
    
    if (!text || text.trim().length < 1) {
      return c.json({ error: 'Comment text required' }, 400);
    }
    
    const commentId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO comments (id, post_id, user_id, text)
      VALUES (?, ?, ?, ?)
    `).bind(commentId, postId, c.get('user').userId, text.trim()).run();
    
    const comment = await db.prepare(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).bind(commentId).first();
    
    return c.json({ comment }, 201);
  } catch (err) {
    return c.json({ error: 'Failed to create comment' }, 500);
  }
});

// 👥 Поиск пользователей (по имени/фамилии)
app.get('/api/users/search', async (c) => {
  try {
    const db = c.env.DB;
    const query = c.req.query('q')?.trim();
    
    if (!query || query.length < 2) {
      return c.json({ users: [], message: 'Query too short (min 2 chars)' });
    }
    
    const { results } = await db.prepare(`
      SELECT id, vk_id, first_name, last_name, avatar
      FROM users
      WHERE first_name LIKE ? OR last_name LIKE ?
      LIMIT 20
    `).bind(`%${query}%`, `%${query}%`).all();
    
    return c.json({ users: results });
  } catch (err) {
    return c.json({ error: 'Search failed' }, 500);
  }
});

// 🔎 Поиск постов (по тексту)
app.get('/api/posts/search', async (c) => {
  try {
    const db = c.env.DB;
    const query = c.req.query('q')?.trim();
    
    if (!query || query.length < 2) {
      return c.json({ posts: [], message: 'Query too short (min 2 chars)' });
    }
    
    // Вариант 1: Простой LIKE-поиск
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.text LIKE ?
      ORDER BY p.created_at DESC
      LIMIT 20
    `).bind(`%${query}%`).all();
    
    // Вариант 2 (опционально): Полнотекстовый поиск через FTS
    // const { results } = await db.prepare(`
    //   SELECT p.*, u.first_name, u.last_name, u.avatar
    //   FROM posts p
    //   JOIN posts_fts f ON p.rowid = f.rowid
    //   JOIN users u ON p.user_id = u.id
    //   WHERE posts_fts MATCH ?
    //   ORDER BY p.created_at DESC
    //   LIMIT 20
    // `).bind(query).all();
    
    return c.json({ posts: results });
  } catch (err) {
    return c.json({ error: 'Search failed' }, 500);
  }
});

export default app;
