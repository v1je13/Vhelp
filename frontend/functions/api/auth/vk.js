import { getJWT } from '../../utils/jwt'; 
import { getDB } from '../../utils/db'; 
import { json, error } from '../../utils/response'; 

export async function onRequestPost(context) { 
  try { 
    const db = getDB(context); 
    const jwt = getJWT(context.env);
    const body = await context.request.json(); 
    const { vk_user_id, first_name, last_name, photo } = body; 

    if (!vk_user_id) return error('VK user ID required', 400); 

    const existing = await db.prepare('SELECT * FROM users WHERE vk_id = ?').bind(vk_user_id).first(); 

    let user; 
    if (!existing) { 
      const userId = crypto.randomUUID(); 
      await db.prepare('INSERT INTO users (id, vk_id, first_name, last_name, avatar) VALUES (?, ?, ?, ?, ?)') 
        .bind(userId, vk_user_id, first_name || 'User', last_name || '', photo || '').run(); 
      user = { id: userId, vk_id: vk_user_id, first_name, last_name, avatar: photo }; 
    } else { 
      await db.prepare('UPDATE users SET first_name = ?, last_name = ?, avatar = ?, updated_at = ? WHERE vk_id = ?') 
        .bind(first_name || existing.first_name, last_name || existing.last_name, photo || existing.avatar, Date.now(), vk_user_id).run(); 
      user = existing; 
    } 

    const token = await jwt.sign({ userId: user.id, vkId: user.vk_id }, { expiresIn: '30d' }); 
    
    return json({ token, user: { 
      id: user.id, 
      vkId: user.vk_id, 
      firstName: user.first_name, 
      lastName: user.last_name, 
      avatar: user.avatar 
    }}); 
  } catch (err) { 
    return error(err.message, 500); 
  } 
 }
