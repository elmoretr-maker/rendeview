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
        
        const auth = async (explicitRequest = null) => {
                // Accept explicit Request (for SSR/navigation) or fall back to Hono context
                let req;
                if (explicitRequest) {
                        req = explicitRequest;
                } else {
                        try {
                                const c = getContext();
                                req = c.req.raw;
                        } catch (error) {
                                // No context available (SSR without Hono)
                                return null;
                        }
                }
                
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
                        console.log('[CREATE-AUTH] JWT-only fallback for user:', token.sub);
                        
                        if (adapter) {
                                try {
                                        const result = await pool.query(
                                                'SELECT "sessionToken", expires FROM auth_sessions WHERE "userId" = $1 AND expires > NOW() ORDER BY expires DESC LIMIT 1',
                                                [token.sub]
                                        );
                                        
                                        if (result.rows.length === 0) {
                                                const sessionToken = crypto.randomUUID();
                                                const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
                                                
                                                await adapter.createSession({
                                                        sessionToken,
                                                        userId: token.sub,
                                                        expires,
                                                });
                                                
                                                console.log('[CREATE-AUTH] Created new database session for user:', token.sub);
                                        } else {
                                                console.log('[CREATE-AUTH] Found existing valid session for user:', token.sub);
                                        }
                                } catch (error) {
                                        console.error('[CREATE-AUTH] Session check/creation error:', error);
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
