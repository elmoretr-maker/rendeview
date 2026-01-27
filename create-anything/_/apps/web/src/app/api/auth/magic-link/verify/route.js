import { Pool } from '@neondatabase/serverless';
import { encode } from '@auth/core/jwt';
import { randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
      return Response.redirect(new URL('/account/signin?error=InvalidLink', request.url));
    }

    const normalizedEmail = email.toLowerCase().trim();

    const verifyResult = await pool.query(
      `DELETE FROM auth_verification_token 
       WHERE identifier = $1 AND token = $2 AND expires > NOW()
       RETURNING identifier, token, expires`,
      [normalizedEmail, token]
    );

    if (verifyResult.rowCount === 0) {
      return Response.redirect(new URL('/account/signin?error=ExpiredLink', request.url));
    }

    let userResult = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1',
      [normalizedEmail]
    );

    let user;
    if (userResult.rowCount === 0) {
      const createResult = await pool.query(
        `INSERT INTO auth_users (email, "emailVerified", role)
         VALUES ($1, NOW(), 'user')
         RETURNING *`,
        [normalizedEmail]
      );
      user = createResult.rows[0];
      
      await pool.query(
        `INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId")
         VALUES ($1, 'email', 'email', $1)`,
        [user.id]
      );
    } else {
      user = userResult.rows[0];
      
      if (!user.emailVerified) {
        await pool.query(
          'UPDATE auth_users SET "emailVerified" = NOW() WHERE id = $1',
          [user.id]
        );
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
        name: user.name,
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

    const redirectUrl = user.profile_completed ? '/discovery' : '/onboarding/profile';

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Set-Cookie': cookieValue,
      },
    });
  } catch (error) {
    console.error('[MAGIC LINK VERIFY] Error:', error);
    return Response.redirect(new URL('/account/signin?error=VerificationFailed', request.url));
  }
}
