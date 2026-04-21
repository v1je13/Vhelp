import { getDB } from '../../utils/db'; 
import { json, error } from '../../utils/response'; 

export async function onRequestGet(context) { 
  const db = getDB(context); 
  const url = new URL(context.request.url); 
  const path = context.params.path || []; 
  
  try { 
    // GET /api/users/search?q=... 
    if (path[0] === 'search') { 
      const query = url.searchParams.get('q')?.trim(); 
      if (!query || query.length < 2) return json({ users: [] }); 
      
      const { results } = await db.prepare(` 
        SELECT id, vk_id, first_name, last_name, avatar FROM users 
        WHERE first_name LIKE ? OR last_name LIKE ? LIMIT 20 
      `).bind(`%${query}%`, `%${query}%`).all(); 
      
      return json({ users: results }); 
    } 
    
    // GET /api/users/123 — профиль 
    if (path.length === 1) { 
      const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(path[0]).first(); 
      if (!user) return error('User not found', 404); 
      
      const postsCount = await db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?') 
        .bind(path[0]).first(); 
      
      return json({ user: { ...user, posts_count: postsCount.count } }); 
    } 
    
    // GET /api/users/123/posts 
    if (path.length === 2 && path[1] === 'posts') { 
      const { results } = await db.prepare(` 
        SELECT p.*, u.first_name, u.last_name, u.avatar 
        FROM posts p JOIN users u ON p.user_id = u.id 
        WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50 
      `).bind(path[0]).all(); 
      
      return json({ posts: results }); 
    } 
    
    return error('Not Found', 404);
  } catch (err) { 
    return error(err.message, 500); 
  } 
}
