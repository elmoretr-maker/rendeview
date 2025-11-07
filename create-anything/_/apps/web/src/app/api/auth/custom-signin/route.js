import { Pool } from '@neondatabase/serverless';
import { verify } from 'argon2';
import { encode } from '@auth/core/jwt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function Adapter(client) {
  return {
    async getUserByEmail(email) {
      const sql = 'select * from auth_users where email = $1';
      const result = await client.query(sql, [email]);
      if (result.rowCount === 0) {
        return null;
      }
      const userData = result.rows[0];
      const accountsData = await client.query(
        'select * from auth_accounts where "providerAccountId" = $1',
        [userData.id]
      );
      return {
        ...userData,
        accounts: accountsData.rows,
      };
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === undefined) {
        throw Error('userId is undef in createSession');
      }
      const sql = `insert into auth_sessions ("userId", expires, "sessionToken")
      values ($1, $2, $3)
      RETURNING id, "sessionToken", "userId", expires`;

      const result = await client.query(sql, [userId, expires, sessionToken]);
      return result.rows[0];
    },
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adapter = Adapter(pool);
    
    const user = await adapter.getUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const matchingAccount = user.accounts.find(
      (account) => account.provider === 'credentials'
    );
    const accountPassword = matchingAccount?.password;
    if (!accountPassword) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verify(accountPassword, password);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);

    await adapter.createSession({
      sessionToken,
      userId: user.id,
      expires,
    });

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

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieValue,
        },
      }
    );
  } catch (error) {
    console.error('[CUSTOM SIGNIN] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
