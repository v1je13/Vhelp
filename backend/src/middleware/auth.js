import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (c, next) => {
  try {
    // Get token from header
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ message: 'No token, authorization denied' }, 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return c.json({ message: 'User not found' }, 401);
    }

    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ message: 'Token is not valid' }, 401);
  }
};

export { auth };
