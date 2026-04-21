import { SignJWT, jwtVerify } from 'jose';

export const getJWT = (env) => {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  return {
    sign: (payload, options = {}) => {
      return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(options.expiresIn || '30d')
        .setJti(crypto.randomUUID())
        .sign(secret);
    },
    
    verify: (token) => {
      return jwtVerify(token, secret, { algorithms: ['HS256'] });
    }
  };
};
