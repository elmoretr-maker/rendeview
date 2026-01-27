import { Pool } from '@neondatabase/serverless';
import { encode } from '@auth/core/jwt';
import { randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STAFF_EMAIL = 'trelmore.staff@gmail.com';
const STAFF_NAME = 'Trelmore Staff';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const devKey = url.searchParams.get('dev_key');
    const expectedKey = process.env.DEV_BYPASS_KEY;

    if (!expectedKey) {
      console.log('[DEV BYPASS] DEV_BYPASS_KEY secret not configured');
      return Response.redirect(new URL('/welcome', request.url));
    }

    if (!devKey || devKey !== expectedKey) {
      console.log('[DEV BYPASS] Invalid or missing dev_key');
      return Response.redirect(new URL('/account/signin?error=AccessDenied', request.url));
    }

    let userResult = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1',
      [STAFF_EMAIL]
    );

    let user;
    if (userResult.rowCount === 0) {
      const createResult = await pool.query(
        `INSERT INTO auth_users (email, name, "emailVerified", role, profile_completed, data_consent_given)
         VALUES ($1, $2, NOW(), 'admin', true, true)
         RETURNING *`,
        [STAFF_EMAIL, STAFF_NAME]
      );
      user = createResult.rows[0];

      await pool.query(
        `INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId")
         VALUES ($1, 'dev-bypass', 'dev-bypass', $1)`,
        [user.id]
      );

      console.log('[DEV BYPASS] Created admin user:', STAFF_EMAIL);
    } else {
      user = userResult.rows[0];
      
      if (user.role !== 'admin') {
        await pool.query(
          'UPDATE auth_users SET role = $1 WHERE id = $2',
          ['admin', user.id]
        );
        user.role = 'admin';
      }
    }

    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO auth_sessions ("userId", expires, "sessionToken")
       VALUES ($1, $2, $3)`,
      [user.id, expires, sessionToken]
    );

    if (!process.env.AUTH_SECRET) {
      throw new Error('AUTH_SECRET is not configured');
    }

    const jwtToken = await encode({
      token: {
        sub: user.id.toString(),
        email: user.email,
        name: user.name || STAFF_NAME,
        sessionToken: sessionToken,
        sessionExpires: expires.toISOString(),
      },
      secret: process.env.AUTH_SECRET,
      maxAge: 12 * 60 * 60,
      salt: 'authjs.session-token',
    });

    const secureCookie = process.env.AUTH_URL?.startsWith('https') ?? false;
    const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const cookieValue = `${cookieName}=${jwtToken}; Path=/; HttpOnly; ${secureCookie ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${12 * 60 * 60}`;

    console.log('[DEV BYPASS] Successfully authenticated as admin:', STAFF_EMAIL);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/discovery',
        'Set-Cookie': cookieValue,
      },
    });
  } catch (error) {
    console.error('[DEV BYPASS] Error:', error);
    return Response.redirect(new URL('/account/signin?error=Configuration', request.url));
  }
}
