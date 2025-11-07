import { Pool } from '@neondatabase/serverless';
import { hash } from 'argon2';
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
      return result.rows[0];
    },
    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const sql = `
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, "emailVerified", image`;
      const result = await client.query(sql, [
        name,
        email,
        emailVerified,
        image,
      ]);
      return result.rows[0];
    },
    async linkAccount(account) {
      const sql = `
      insert into auth_accounts
      (
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning
        id,
        "userId",
        provider,
        type,
        "providerAccountId",
        access_token,
        expires_at,
        refresh_token,
        id_token,
        scope,
        session_state,
        token_type,
        password
      `;

      const params = [
        account.userId,
        account.provider,
        account.type,
        account.providerAccountId,
        account.access_token,
        account.expires_at,
        account.refresh_token,
        account.id_token,
        account.scope,
        account.session_state,
        account.token_type,
        account.extraData?.password,
      ];

      const result = await client.query(sql, params);
      return result.rows[0];
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
    const name = formData.get('name');

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adapter = Adapter(pool);

    const existingUser = await adapter.getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newUser = await adapter.createUser({
      id: crypto.randomUUID(),
      emailVerified: null,
      email,
      name: name && name.trim().length > 0 ? name : null,
      image: null,
    });

    await adapter.linkAccount({
      extraData: {
        password: await hash(password),
      },
      type: 'credentials',
      userId: newUser.id,
      providerAccountId: newUser.id,
      provider: 'credentials',
    });

    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);

    await adapter.createSession({
      sessionToken,
      userId: newUser.id,
      expires,
    });

    if (!process.env.AUTH_SECRET) {
      throw new Error('AUTH_SECRET is not configured');
    }

    const jwtToken = await encode({
      token: {
        sub: newUser.id.toString(),
        email: newUser.email,
        name: newUser.name,
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
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
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
    console.error('[CUSTOM SIGNUP] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
