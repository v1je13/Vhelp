import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
import { randomUUID, createHmac } from 'crypto';

const app = new Hono();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// JWT helpers using Node.js crypto
const getSecret = () => process.env.JWT_SECRET || 'fallback-secret-key-change-it';

const jwt = {
  sign: async (payload, secret, options = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (options.expiresIn === '30d' ? 30 * 24 * 60 * 60 : 7200);

    const tokenPayload = {
      ...payload,
      iat: now,
      exp: exp,
      jti: randomUUID()
    };

    const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)).toString('base64'));
    const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(tokenPayload)).toString('base64'));
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', secret).update(data).digest('base64');
    const encodedSignature = base64UrlEncode(signature);

    return `${data}.${encodedSignature}`;
  },

  verify: async (token, secret) => {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', secret).update(data).digest('base64');
    const encodedSignatureCheck = base64UrlEncode(signature);

    if (encodedSignature !== encodedSignatureCheck) throw new Error('Invalid signature');

    const payload = JSON.parse(Buffer.from(base64UrlDecode(encodedPayload), 'base64').toString());

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return { payload };
  }
};

// Helper functions for URL-safe base64
function base64UrlEncode(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return str;
}

// CORS — исправленный для Android
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-VK-Sign'],
  credentials: true,
  maxAge: 86400,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// VK Auth
app.post('/api/auth/vk', async (c) => {
  try {
    const secret = getSecret();
    const { vk_user_id, first_name, last_name, photo } = await c.req.json();

    if (!vk_user_id) return c.json({ error: 'VK user ID required' }, 400);

    let user = (await pool.query('SELECT * FROM users WHERE vk_id = $1', [vk_user_id])).rows[0];

    if (!user) {
      const userId = randomUUID();
      await pool.query(
        'INSERT INTO users (id, vk_id, first_name, last_name, avatar) VALUES ($1, $2, $3, $4, $5)',
        [userId, vk_user_id, first_name || 'User', last_name || '', photo || '']
      );
      user = { id: userId, vk_id: vk_user_id, first_name, last_name, avatar: photo };
    } else {
      await pool.query(
        'UPDATE users SET first_name = $1, last_name = $2, avatar = $3, updated_at = $4 WHERE vk_id = $5',
        [first_name || user.first_name, last_name || user.last_name, photo || user.avatar, Date.now(), vk_user_id]
      );
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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [decoded.payload.userId])).rows[0];

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
    const page = parseInt(c.req.query('page')) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return c.json({ posts: rows, page, hasMore: rows.length === limit });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get single post
app.get('/api/posts/:id', async (c) => {
  try {
    const post = (await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1
    `, [c.req.param('id')])).rows[0];

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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const { text, images, tags = [], trip_id = null } = await c.req.json();

    if (!text || text.trim().length < 3) {
      return c.json({ error: 'Text required (min 3 chars)' }, 400);
    }

    const postId = randomUUID();
    await pool.query(`
      INSERT INTO posts (id, user_id, text, images, tags, trip_id, location, likes_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
    `, [postId, decoded.payload.userId, text.trim(), JSON.stringify(images || []),
        JSON.stringify(tags), trip_id, JSON.stringify(null)]);

    const post = (await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1
    `, [postId])).rows[0];

    return c.json({ post }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Toggle like
app.post('/api/posts/:id/like', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'No token' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const postId = c.req.param('id');
    const userId = decoded.payload.userId;

    const existing = (await pool.query('SELECT * FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId])).rows[0];

    if (existing) {
      await pool.query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      await pool.query('UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1', [postId]);
    } else {
      await pool.query('INSERT INTO likes (id, post_id, user_id) VALUES ($1, $2, $3)', [randomUUID(), postId, userId]);
      await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
    }

    const newCount = (await pool.query('SELECT likes_count FROM posts WHERE id = $1', [postId])).rows[0];
    return c.json({ liked: !existing, count: newCount.likes_count });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get comments
app.get('/api/posts/:id/comments', async (c) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1 ORDER BY c.created_at ASC
    `, [c.req.param('id')]);

    return c.json({ comments: rows });
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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const { text } = await c.req.json();

    if (!text || text.trim().length < 1) {
      return c.json({ error: 'Comment text required' }, 400);
    }

    const commentId = randomUUID();
    await pool.query(
      'INSERT INTO comments (id, post_id, user_id, text) VALUES ($1, $2, $3, $4)',
      [commentId, c.req.param('id'), decoded.payload.userId, text.trim()]
    );

    const comment = (await pool.query(`
      SELECT c.*, u.first_name, u.last_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1
    `, [commentId])).rows[0];

    return c.json({ comment }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get user profile
app.get('/api/users/:id', async (c) => {
  try {
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [c.req.param('id')])).rows[0];

    if (!user) return c.json({ error: 'User not found' }, 404);

    const postsCount = (await pool.query('SELECT COUNT(*) as count FROM posts WHERE user_id = $1', [c.req.param('id')])).rows[0];

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
    const { rows } = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50
    `, [c.req.param('id')]);

    return c.json({ posts: rows });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Search users
app.get('/api/users/search', async (c) => {
  try {
    const query = c.req.query('q')?.trim();

    if (!query || query.length < 2) return c.json({ users: [] });

    const { rows } = await pool.query(`
      SELECT id, vk_id, first_name, last_name, avatar FROM users
      WHERE first_name LIKE $1 OR last_name LIKE $2 LIMIT 20
    `, [`%${query}%`, `%${query}%`]);

    return c.json({ users: rows });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Search posts
app.get('/api/posts/search', async (c) => {
  try {
    const query = c.req.query('q')?.trim();

    if (!query || query.length < 2) return c.json({ posts: [] });

    const { rows } = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.text LIKE $1 ORDER BY p.created_at DESC LIMIT 20
    `, [`%${query}%`]);

    return c.json({ posts: rows });
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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const { rows } = await pool.query(`
      SELECT t.*, (SELECT COUNT(*) FROM posts WHERE trip_id = t.id) as notes_count
      FROM trips t WHERE t.user_id = $1 ORDER BY t.created_at DESC
    `, [decoded.payload.userId]);

    return c.json({ trips: rows });
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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const { name, description, cover_image } = await c.req.json();

    if (!name || name.trim().length < 3) {
      return c.json({ error: 'Name required (min 3 chars)' }, 400);
    }

    const tripId = randomUUID();
    await pool.query(
      'INSERT INTO trips (id, user_id, name, description, cover_image) VALUES ($1, $2, $3, $4, $5)',
      [tripId, decoded.payload.userId, name.trim(), description || '', cover_image || '']
    );

    const trip = (await pool.query('SELECT * FROM trips WHERE id = $1', [tripId])).rows[0];
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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const tripId = c.req.param('id');

    const trip = (await pool.query('SELECT * FROM trips WHERE id = $1 AND user_id = $2', [tripId, decoded.payload.userId])).rows[0];

    if (!trip) return c.json({ error: 'Trip not found' }, 404);

    await pool.query('DELETE FROM posts WHERE trip_id = $1', [tripId]);
    await pool.query('DELETE FROM trips WHERE id = $1', [tripId]);

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
    const secret = getSecret();
    const decoded = await jwt.verify(token, secret);

    const tripId = c.req.param('id');

    const trip = (await pool.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, decoded.payload.userId])).rows[0];

    if (!trip) return c.json({ error: 'Trip not found' }, 404);

    const { rows } = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.trip_id = $1 ORDER BY p.created_at DESC
    `, [tripId]);

    return c.json({ notes: rows });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Get posts by tag
app.get('/api/tags/:tag/posts', async (c) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.tags LIKE $1 ORDER BY p.created_at DESC
    `, [`%"${c.req.param('tag')}"%`]);

    return c.json({ posts: rows });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Start server
serve({
  fetch: app.fetch,
  port: process.env.PORT || 3000,
});

console.log('Server running on port', process.env.PORT || 3000);
