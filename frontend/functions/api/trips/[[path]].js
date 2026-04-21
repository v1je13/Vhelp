import { getJWT } from '../../utils/jwt'; 
import { getDB } from '../../utils/db'; 
import { json, error } from '../../utils/response'; 

async function auth(context) { 
  const authHeader = context.request.headers.get('Authorization'); 
  if (!authHeader) throw new Error('No token'); 
  const token = authHeader.replace('Bearer ', ''); 
  const jwt = getJWT(context.env);
  return jwt.verify(token); 
} 

export async function onRequestGet(context) { 
  const db = getDB(context); 
  const path = context.params.path || []; 
  
  try { 
    const decoded = await auth(context); 
    const userId = decoded.payload.userId; 
    
    // GET /api/trips 
    if (path.length === 0) { 
      const { results } = await db.prepare(` 
        SELECT t.*, (SELECT COUNT(*) FROM posts WHERE trip_id = t.id) as notes_count 
        FROM trips t WHERE t.user_id = ? ORDER BY t.created_at DESC 
      `).bind(userId).all(); 
      return json({ trips: results }); 
    } 
    
    // GET /api/trips/123/notes 
    if (path.length === 2 && path[1] === 'notes') { 
      const trip = await db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?') 
        .bind(path[0], userId).first(); 
      if (!trip) return error('Trip not found', 404); 
      
      const { results } = await db.prepare(` 
        SELECT p.*, u.first_name, u.last_name, u.avatar 
        FROM posts p JOIN users u ON p.user_id = u.id 
        WHERE p.trip_id = ? ORDER BY p.created_at DESC 
      `).bind(path[0]).all(); 
      
      return json({ notes: results }); 
    } 

    return error('Not Found', 404);
  } catch (err) { 
    return error(err.message, 401); 
  } 
} 

export async function onRequestPost(context) { 
  const db = getDB(context); 
  
  try { 
    const decoded = await auth(context); 
    const userId = decoded.payload.userId; 
    const body = await context.request.json(); 
    
    if (!body.name || body.name.trim().length < 3) { 
      return error('Name required (min 3 chars)', 400); 
    } 
    
    const tripId = crypto.randomUUID(); 
    await db.prepare(` 
      INSERT INTO trips (id, user_id, name, description, cover_image) 
      VALUES (?, ?, ?, ?, ?) 
    `).bind(tripId, userId, body.name.trim(), body.description || '', body.cover_image || '').run(); 
    
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').bind(tripId).first(); 
    return json({ trip }, 201); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
} 

export async function onRequestDelete(context) { 
  const db = getDB(context); 
  const path = context.params.path || []; 
  
  try { 
    const decoded = await auth(context); 
    const userId = decoded.payload.userId; 
    const tripId = path[0]; 
    
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?') 
      .bind(tripId, userId).first(); 
    if (!trip) return error('Trip not found', 404); 
    
    await db.prepare('DELETE FROM posts WHERE trip_id = ?').bind(tripId).run(); 
    await db.prepare('DELETE FROM trips WHERE id = ?').bind(tripId).run(); 
    
    return json({ success: true }); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
}
