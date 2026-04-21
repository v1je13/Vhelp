import { Hono } from 'hono';

const app = new Hono();

// JWT helpers using Web Crypto API
const getSecret = (env) => env.JWT_SECRET || 'fallback-secret-key-change-it';

const jwt = {
  sign: async (payload, secret, options = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (options.expiresIn === '30d' ? 30 * 24 * 60 * 60 : 7200);
    
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: exp,
      jti: crypto.randomUUID()
    };

    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(tokenPayload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${data}.${encodedSignature}`;
  },

  verify: async (token, secret) => {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(encodedSignature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );

    if (!isValid) throw new Error('Invalid signature');

    const payload = JSON.parse(atob(encodedPayload));
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return { payload };
  }
};

// CORS — исправленный для Android
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '*';
  
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-VK-Sign');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
  
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  
  await next();
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// VK Auth
app.post('/api/auth/vk', async (c) => {
  try {
    const db = c.env.DB;
    const secret = getSecret(c.env);
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
    
    const token = await jwt.sign({ userId: user.id, vkId: user.vk_id }, secret, { expiresIn: '30d' });
    
    return c.json({
      token,
      user: {
        id: user.id,
        vkId: user.vk_id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get current user
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.payload.userId).first();
    
    if (!user) return c.json({ error: 'User not found' }, 404);
    
    return c.json({
      id: user.id,
      vkId: user.vk_id,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Get posts feed
app.get('/api/posts', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return c.json({ posts: results, page, hasMore: results.length === limit });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get single post
app.get('/api/posts/:id', async (c) => {
  try {
    const db = c.env.DB;
    const post = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).bind(c.req.param('id')).first();
    
    if (!post) return c.json({ error: 'Post not found' }, 404);
    return c.json({ post });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Create post
app.post('/api/posts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    console.log('JWT Secret length:', secret.length);
    console.log('Token prefix:', token.substring(0, 50) + '...');
    const decoded = await jwt.verify(token, secret);

    const db = c.env.DB;
    const { text, images, tags = [], trip_id = null } = await c.req.json();

    if (!text || text.trim().length < 3) {
      return c.json({ error: 'Text required (min 3 chars)' }, 400);
    }

    const postId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO posts (id, user_id, text, images, tags, trip_id, location, likes_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(postId, decoded.payload.userId, text.trim(), JSON.stringify(images || []),
            JSON.stringify(tags), trip_id, JSON.stringify(null)).run();

    const post = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).bind(postId).first();

    return c.json({ post }, 201);
  } catch (err) {
    console.error('JWT Verify Error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Toggle like
app.post('/api/posts/:id/like', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const postId = c.req.param('id');
    const userId = decoded.payload.userId;
    
    const existing = await db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?')
      .bind(postId, userId).first();
    
    if (existing) {
      await db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').bind(postId, userId).run();
      await db.prepare('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?').bind(postId).run();
    } else {
      await db.prepare('INSERT INTO likes (id, post_id, user_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), postId, userId).run();
      await db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').bind(postId).run();
    }
    
    const newCount = await db.prepare('SELECT likes_count FROM posts WHERE id = ?').bind(postId).first();
    return c.json({ liked: !existing, count: newCount.likes_count });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get comments
app.get('/api/posts/:id/comments', async (c) => {
  try {
    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `).bind(c.req.param('id')).all();
    
    return c.json({ comments: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Create comment
app.post('/api/posts/:id/comments', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const { text } = await c.req.json();
    
    if (!text || text.trim().length < 1) {
      return c.json({ error: 'Comment text required' }, 400);
    }
    
    const commentId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO comments (id, post_id, user_id, text) VALUES (?, ?, ?, ?)
    `).bind(commentId, c.req.param('id'), decoded.payload.userId, text.trim()).run();
    
    const comment = await db.prepare(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).bind(commentId).first();
    
    return c.json({ comment }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get user profile
app.get('/api/users/:id', async (c) => {
  try {
    const db = c.env.DB;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first();
    
    if (!user) return c.json({ error: 'User not found' }, 404);
    
    const postsCount = await db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?')
      .bind(c.req.param('id')).first();
    
    return c.json({
      user: {
        ...user,
        posts_count: postsCount.count
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get user posts
app.get('/api/users/:id/posts', async (c) => {
  try {
    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50
    `).bind(c.req.param('id')).all();
    
    return c.json({ posts: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Search users
app.get('/api/users/search', async (c) => {
  try {
    const db = c.env.DB;
    const query = c.req.query('q')?.trim();
    
    if (!query || query.length < 2) return c.json({ users: [] });
    
    const { results } = await db.prepare(`
      SELECT id, vk_id, first_name, last_name, avatar FROM users
      WHERE first_name LIKE ? OR last_name LIKE ? LIMIT 20
    `).bind(`%${query}%`, `%${query}%`).all();
    
    return c.json({ users: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Search posts
app.get('/api/posts/search', async (c) => {
  try {
    const db = c.env.DB;
    const query = c.req.query('q')?.trim();
    
    if (!query || query.length < 2) return c.json({ posts: [] });
    
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.text LIKE ? ORDER BY p.created_at DESC LIMIT 20
    `).bind(`%${query}%`).all();
    
    return c.json({ posts: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get trips
app.get('/api/trips', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM posts WHERE trip_id = t.id) as notes_count
      FROM trips t WHERE t.user_id = ? ORDER BY t.created_at DESC
    `).bind(decoded.payload.userId).all();
    
    return c.json({ trips: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Create trip
app.post('/api/trips', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const { name, description, cover_image } = await c.req.json();
    
    if (!name || name.trim().length < 3) {
      return c.json({ error: 'Name required (min 3 chars)' }, 400);
    }
    
    const tripId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO trips (id, user_id, name, description, cover_image)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tripId, decoded.payload.userId, name.trim(), description || '', cover_image || '').run();
    
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').bind(tripId).first();
    return c.json({ trip }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Delete trip
app.delete('/api/trips/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const tripId = c.req.param('id');
    
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?')
      .bind(tripId, decoded.payload.userId).first();
    
    if (!trip) return c.json({ error: 'Trip not found' }, 404);
    
    await db.prepare('DELETE FROM posts WHERE trip_id = ?').bind(tripId).run();
    await db.prepare('DELETE FROM trips WHERE id = ?').bind(tripId).run();
    
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get trip notes
app.get('/api/trips/:id/notes', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);
    
    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret(c.env);
    const decoded = await jwt.verify(token, secret);
    
    const db = c.env.DB;
    const tripId = c.req.param('id');
    
    const trip = await db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?')
      .bind(tripId, decoded.payload.userId).first();
    
    if (!trip) return c.json({ error: 'Trip not found' }, 404);
    
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.trip_id = ? ORDER BY p.created_at DESC
    `).bind(tripId).all();
    
    return c.json({ notes: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get posts by tag
app.get('/api/tags/:tag/posts', async (c) => {
  try {
    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.tags LIKE ? ORDER BY p.created_at DESC
    `).bind(`%"${c.req.param('tag')}"%`).all();
    
    return c.json({ posts: results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
