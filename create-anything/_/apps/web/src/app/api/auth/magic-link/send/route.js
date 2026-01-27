import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO auth_verification_token (identifier, token, expires)
       VALUES ($1, $2, $3)
       ON CONFLICT (identifier, token) DO UPDATE SET expires = $3`,
      [normalizedEmail, token, expires]
    );

    const baseUrl = process.env.AUTH_URL || 'http://localhost:5000';
    const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    console.log('\n========================================');
    console.log('[CONSOLE EMAIL PROVIDER] Magic Link Generated');
    console.log('========================================');
    console.log(`To: ${normalizedEmail}`);
    console.log(`Expires: ${expires.toISOString()}`);
    console.log(`\nMagic Link:\n${magicLink}`);
    console.log('========================================\n');

    return Response.json({ 
      success: true, 
      message: 'Magic link sent. Check server logs in development mode.',
      expiresAt: expires.toISOString()
    });
  } catch (error) {
    console.error('[MAGIC LINK SEND] Error:', error);
    return Response.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
