import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const cookie = cookies.find(c => c.startsWith(`${name}=`));
  return cookie ? cookie.substring(name.length + 1) : null;
}

export default function CreateAuth(config = {}) {
        const adapter = config.adapter;
        
        const auth = async () => {
                const c = getContext();
                const req = c.req.raw;
                
                const token = await getToken({
                        req,
                        secret: process.env.AUTH_SECRET,
                        secureCookie: process.env.AUTH_URL.startsWith('https'),
                });
                
                if (!token) {
                        return null;
                }
                
                const sessionToken = token.sessionToken;
                
                if (adapter && adapter.getSessionAndUser && sessionToken) {
                        try {
                                const result = await adapter.getSessionAndUser(sessionToken);
                                if (result) {
                                        const { session, user } = result;
                                        const now = new Date();
                                        const sessionExpiry = new Date(session.expires);
                                        
                                        if (sessionExpiry < now) {
                                                await adapter.deleteSession(sessionToken);
                                                return null;
                                        }
                                        
                                        return {
                                                user: {
                                                        id: user.id.toString(),
                                                        email: user.email,
                                                        name: user.name,
                                                        image: user.image,
                                                },
                                                expires: session.expires,
                                        };
                                }
                        } catch (error) {
                                console.error('Session lookup error:', error);
                        }
                }
                
                if (token) {
                        console.log('[CREATE-AUTH] JWT-only fallback - creating database session for user:', token.sub);
                        
                        if (adapter && adapter.createSession) {
                                try {
                                        const sessionToken = crypto.randomUUID();
                                        const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
                                        
                                        await adapter.createSession({
                                                sessionToken,
                                                userId: token.sub,
                                                expires,
                                        });
                                        
                                        console.log('[CREATE-AUTH] Database session created successfully for user:', token.sub);
                                } catch (error) {
                                        console.error('[CREATE-AUTH] Failed to create database session:', error);
                                }
                        }
                        
                        return {
                                user: {
                                        id: token.sub,
                                        email: token.email,
                                        name: token.name,
                                        image: token.picture,
                                },
                                expires: token.exp ? new Date(token.exp * 1000).toISOString() : null,
                        };
                }
                
                return null;
        };
        
        return {
                auth,
        };
}
