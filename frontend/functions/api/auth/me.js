import { getJWT } from '../../utils/jwt'; 
import { getDB } from '../../utils/db'; 
import { json, error } from '../../utils/response'; 

export async function onRequestGet(context) { 
  try { 
    const authHeader = context.request.headers.get('Authorization'); 
    if (!authHeader) return error('No token', 401); 

    const token = authHeader.replace('Bearer ', ''); 
    const jwt = getJWT(context.env);
    const decoded = await jwt.verify(token); 
    
    const db = getDB(context); 
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.payload.userId).first(); 
    
    if (!user) return error('User not found', 404); 
    
    return json({ 
      id: user.id, 
      vkId: user.vk_id, 
      firstName: user.first_name, 
      lastName: user.last_name, 
      avatar: user.avatar, 
      bio: user.bio 
    }); 
  } catch (err) { 
    return error('Invalid token', 401); 
  } 
}
