import { getJWT } from '../../utils/jwt'; 
import { getDB } from '../../utils/db'; 
import { json, error } from '../../utils/response'; 

export async function onRequestGet(context) { 
  const db = getDB(context); 
  const url = new URL(context.request.url); 
  const path = context.params.path || []; 
  
  try { 
    // GET /api/posts/123 — один пост 
    if (path.length === 1 && path[0] !== 'search') { 
      const post = await db.prepare(` 
        SELECT p.*, u.first_name, u.last_name, u.avatar 
        FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ? 
      `).bind(path[0]).first(); 
      
      if (!post) return error('Post not found', 404); 
      return json({ post }); 
    } 
    
    // GET /api/posts/123/comments 
    if (path.length === 2 && path[1] === 'comments') { 
      const { results } = await db.prepare(` 
        SELECT c.*, u.first_name, u.last_name, u.avatar 
        FROM comments c JOIN users u ON c.user_id = u.id 
        WHERE c.post_id = ? ORDER BY c.created_at ASC 
      `).bind(path[0]).all(); 
      return json({ comments: results }); 
    } 
    
    // GET /api/posts — лента 
    const page = parseInt(url.searchParams.get('page')) || 1; 
    const limit = 20; 
    const offset = (page - 1) * limit; 
    
    const { results } = await db.prepare(` 
      SELECT p.*, u.first_name, u.last_name, u.avatar 
      FROM posts p JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC LIMIT ? OFFSET ? 
    `).bind(limit, offset).all(); 
    
    return json({ posts: results, page, hasMore: results.length === limit }); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
} 

export async function onRequestPost(context) { 
  const db = getDB(context); 
  const path = context.params.path || []; 
  
  try { 
    const body = await context.request.json(); 
    const authHeader = context.request.headers.get('Authorization'); 
    if (!authHeader) return error('No token', 401); 
    
    const token = authHeader.replace('Bearer ', ''); 
    const jwt = getJWT(context.env);
    const decoded = await jwt.verify(token); 
    const userId = decoded.payload.userId; 
    
    // POST /api/posts/123/like 
    if (path.length === 2 && path[1] === 'like') { 
      const postId = path[0]; 
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
      return json({ liked: !existing, count: newCount.likes_count }); 
    } 
    
    // POST /api/posts/123/comments 
    if (path.length === 2 && path[1] === 'comments') { 
      const commentId = crypto.randomUUID(); 
      await db.prepare('INSERT INTO comments (id, post_id, user_id, text) VALUES (?, ?, ?, ?)') 
        .bind(commentId, path[0], userId, body.text.trim()).run(); 
      
      const comment = await db.prepare(` 
        SELECT c.*, u.first_name, u.last_name, u.avatar 
        FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ? 
      `).bind(commentId).first(); 
      
      return json({ comment }, 201); 
    } 
    
    // POST /api/posts — создать пост 
    const postId = crypto.randomUUID(); 
    await db.prepare(` 
      INSERT INTO posts (id, user_id, text, images, tags, trip_id, location, likes_count) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0) 
    `).bind(postId, userId, body.text.trim(), JSON.stringify(body.images || []), 
            JSON.stringify(body.tags || []), body.trip_id || null, JSON.stringify(null)).run(); 
    
    const post = await db.prepare(` 
      SELECT p.*, u.first_name, u.last_name, u.avatar 
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ? 
    `).bind(postId).first(); 
    
    return json({ post }, 201); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
}
