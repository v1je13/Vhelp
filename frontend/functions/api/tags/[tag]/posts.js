import { getDB } from '../../../utils/db'; 
import { json, error } from '../../../utils/response'; 

export async function onRequestGet(context) { 
  const db = getDB(context); 
  const tag = context.params.tag; 
  
  try { 
    const { results } = await db.prepare(` 
      SELECT p.*, u.first_name, u.last_name, u.avatar 
      FROM posts p JOIN users u ON p.user_id = u.id 
      WHERE p.tags LIKE ? ORDER BY p.created_at DESC 
    `).bind(`%"${tag}"%`).all(); 
    
    return json({ posts: results }); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
}
