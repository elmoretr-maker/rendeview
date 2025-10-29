import sql from "@/app/api/utils/sql";
import { hash } from 'argon2';

export async function POST(request) {
  try {
    if (process.env.ENV === 'production') {
      return Response.json({ error: 'Disabled in production' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { email, password } = body || {};
    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const users = await sql`SELECT id, email FROM auth_users WHERE email = ${email} LIMIT 1`;
    if (!users?.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    const accounts = await sql`SELECT id, provider, password FROM auth_accounts WHERE "userId" = ${user.id}`;
    const hasCredentials = accounts.some((a) => a.provider === 'credentials' && a.password);
    if (hasCredentials) {
      return Response.json({ ok: true, message: 'Credentials already provisioned' });
    }

    const pwdHash = await hash(password);
    const inserted = await sql`
      INSERT INTO auth_accounts (
        "userId", provider, type, "providerAccountId", password
      ) VALUES (
        ${user.id}, 'credentials', 'credentials', ${user.id}, ${pwdHash}
      ) RETURNING id, provider, "userId"`;

    return Response.json({ ok: true, account: inserted?.[0] || null });
  } catch (err) {
    console.error('POST /api/auth/credentials/provision error', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
