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
                let reqHeaders;
                
                if (explicitRequest) {
                        // Path 1: We are in a Next.js API Route. Get headers from the passed request.
                        reqHeaders = explicitRequest.headers;
                } else {
                        // Path 2: We are in a Hono context. Get headers from the context.
                        const honoReq = getContext()?.req?.raw;
                        reqHeaders = honoReq ? honoReq.headers : new Headers();
                }
                
                // Create a minimal, normalized req object that ONLY contains headers.
                // This prevents the "Cannot read 'type'" error.
                const minimalReq = { headers: reqHeaders };
                
                const token = await getToken({
                        req: minimalReq,
                        secret: process.env.AUTH_SECRET,
                        secureCookie: process.env.AUTH_URL?.startsWith('https') ?? false,
                        salt: 'authjs.session-token',
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
