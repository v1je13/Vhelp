import { Pool } from 'pg';
import { randomUUID, createHmac } from 'crypto';

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

function base64UrlEncode(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return str;
}

// Helper function to send JSON response with CORS
function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper function to get URL parameter
function getUrlParam(url, param) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(param);
}

// Helper function to get path parameter
function getPathParam(url, index) {
  const parts = url.pathname.split('/').filter(p => p);
  return parts[index] || null;
}

// Helper function to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Routes
const routes = {
  'GET /api/health': async (url, req, res) => {
    sendJson(res, { status: 'ok' });
  },

  'POST /api/auth/vk': async (url, req, res) => {
    try {
      const body = await parseBody(req);
      const { vk_user_id, first_name, last_name, photo } = body;
      const secret = getSecret();

      if (!vk_user_id) return sendJson(res, { error: 'VK user ID required' }, 400);

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

      sendJson(res, {
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
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/auth/me': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const user = (await pool.query('SELECT * FROM users WHERE id = $1', [decoded.payload.userId])).rows[0];

      if (!user) return sendJson(res, { error: 'User not found' }, 404);

      sendJson(res, {
        id: user.id,
        vkId: user.vk_id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio
      });
    } catch (err) {
      sendJson(res, { error: 'Invalid token' }, 401);
    }
  },

  'GET /api/posts': async (url, req, res) => {
    try {
      const page = parseInt(getUrlParam(url, 'page')) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const { rows } = await pool.query(`
        SELECT p.*, u.first_name, u.last_name, u.avatar
        FROM posts p JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC LIMIT $1 OFFSET $2
      `, [limit, offset]);

      sendJson(res, { posts: rows, page, hasMore: rows.length === limit });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'POST /api/posts': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const { text, images, tags = [], trip_id = null } = await parseBody(req);

      if (!text || text.trim().length < 3) {
        return sendJson(res, { error: 'Text required (min 3 chars)' }, 400);
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

      sendJson(res, { post }, 201);
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/trips': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const { rows } = await pool.query(`
        SELECT t.*, (SELECT COUNT(*) FROM posts WHERE trip_id = t.id) as notes_count
        FROM trips t WHERE t.user_id = $1 ORDER BY t.created_at DESC
      `, [decoded.payload.userId]);

      sendJson(res, { trips: rows });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'POST /api/trips': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const { name, description, cover_image } = await parseBody(req);

      if (!name || name.trim().length < 3) {
        return sendJson(res, { error: 'Name required (min 3 chars)' }, 400);
      }

      const tripId = randomUUID();
      await pool.query(
        'INSERT INTO trips (id, user_id, name, description, cover_image) VALUES ($1, $2, $3, $4, $5)',
        [tripId, decoded.payload.userId, name.trim(), description || '', cover_image || '']
      );

      const trip = (await pool.query('SELECT * FROM trips WHERE id = $1', [tripId])).rows[0];
      sendJson(res, { trip }, 201);
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/users/:id': async (url, req, res) => {
    try {
      const userId = getPathParam(url, 2);
      const user = (await pool.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];

      if (!user) return sendJson(res, { error: 'User not found' }, 404);

      sendJson(res, {
        id: user.id,
        vkId: user.vk_id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        bio: user.bio
      });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/posts/:id': async (url, req, res) => {
    try {
      const postId = getPathParam(url, 2);
      const post = (await pool.query(`
        SELECT p.*, u.first_name, u.last_name, u.avatar
        FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1
      `, [postId])).rows[0];

      if (!post) return sendJson(res, { error: 'Post not found' }, 404);
      sendJson(res, { post });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'POST /api/posts/:id/like': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const postId = getPathParam(url, 2);
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
      sendJson(res, { liked: !existing, count: newCount.likes_count });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/posts/:id/comments': async (url, req, res) => {
    try {
      const postId = getPathParam(url, 2);
      const { rows } = await pool.query(`
        SELECT c.*, u.first_name, u.last_name, u.avatar
        FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1 ORDER BY c.created_at ASC
      `, [postId]);

      sendJson(res, { comments: rows });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'POST /api/posts/:id/comments': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const { text } = await parseBody(req);

      if (!text || text.trim().length < 1) {
        return sendJson(res, { error: 'Comment text required' }, 400);
      }

      const commentId = randomUUID();
      const postId = getPathParam(url, 2);
      await pool.query(
        'INSERT INTO comments (id, post_id, user_id, text) VALUES ($1, $2, $3, $4)',
        [commentId, postId, decoded.payload.userId, text.trim()]
      );

      const comment = (await pool.query(`
        SELECT c.*, u.first_name, u.last_name, u.avatar
        FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1
      `, [commentId])).rows[0];

      sendJson(res, { comment }, 201);
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/users/:id/posts': async (url, req, res) => {
    try {
      const userId = getPathParam(url, 2);
      const { rows } = await pool.query(`
        SELECT p.*, u.first_name, u.last_name, u.avatar
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50
      `, [userId]);

      sendJson(res, { posts: rows });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'DELETE /api/trips/:id': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const tripId = getPathParam(url, 2);

      const trip = (await pool.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, decoded.payload.userId])).rows[0];

      if (!trip) return sendJson(res, { error: 'Trip not found' }, 404);

      await pool.query('DELETE FROM posts WHERE trip_id = $1', [tripId]);
      await pool.query('DELETE FROM trips WHERE id = $1', [tripId]);

      sendJson(res, { success: true });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },

  'GET /api/trips/:id/notes': async (url, req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'No token' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const secret = getSecret();
      const decoded = await jwt.verify(token, secret);

      const tripId = getPathParam(url, 2);

      const trip = (await pool.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, decoded.payload.userId])).rows[0];

      if (!trip) return sendJson(res, { error: 'Trip not found' }, 404);

      const { rows } = await pool.query(`
        SELECT p.*, u.first_name, u.last_name, u.avatar
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.trip_id = $1 ORDER BY p.created_at DESC
      `, [tripId]);

      sendJson(res, { notes: rows });
    } catch (err) {
      sendJson(res, { error: err.message }, 500);
    }
  },
};

// Vercel Node.js serverless function handler
export default async function handler(req, res) {
  const origin = req.headers['origin'] || 'https://frontend-roan-eight-57.vercel.app';

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-VK-Sign');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
    res.writeHead(204);
    res.end();
    return;
  }

  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-VK-Sign');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = url.pathname;

  // Route matching with dynamic parameters
  if (pathname === '/api/health' && method === 'GET') {
    return await routes['GET /api/health'](url, req, res);
  } else if (pathname === '/api/auth/vk' && method === 'POST') {
    return await routes['POST /api/auth/vk'](url, req, res);
  } else if (pathname === '/api/auth/me' && method === 'GET') {
    return await routes['GET /api/auth/me'](url, req, res);
  } else if (pathname === '/api/posts' && method === 'GET') {
    return await routes['GET /api/posts'](url, req, res);
  } else if (pathname === '/api/posts' && method === 'POST') {
    return await routes['POST /api/posts'](url, req, res);
  } else if (pathname.startsWith('/api/posts/') && pathname.endsWith('/like') && method === 'POST') {
    return await routes['POST /api/posts/:id/like'](url, req, res);
  } else if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comments') && method === 'GET') {
    return await routes['GET /api/posts/:id/comments'](url, req, res);
  } else if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comments') && method === 'POST') {
    return await routes['POST /api/posts/:id/comments'](url, req, res);
  } else if (pathname.startsWith('/api/posts/') && method === 'GET' && pathname.split('/').length === 4) {
    return await routes['GET /api/posts/:id'](url, req, res);
  } else if (pathname === '/api/trips' && method === 'GET') {
    return await routes['GET /api/trips'](url, req, res);
  } else if (pathname === '/api/trips' && method === 'POST') {
    return await routes['POST /api/trips'](url, req, res);
  } else if (pathname.startsWith('/api/trips/') && pathname.endsWith('/notes') && method === 'GET') {
    return await routes['GET /api/trips/:id/notes'](url, req, res);
  } else if (pathname.startsWith('/api/trips/') && method === 'DELETE' && pathname.split('/').length === 4) {
    return await routes['DELETE /api/trips/:id'](url, req, res);
  } else if (pathname.startsWith('/api/users/') && pathname.endsWith('/posts') && method === 'GET') {
    return await routes['GET /api/users/:id/posts'](url, req, res);
  } else if (pathname.startsWith('/api/users/') && method === 'GET' && pathname.split('/').length === 4) {
    return await routes['GET /api/users/:id'](url, req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}
