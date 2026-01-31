import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';
import { Resend } from 'resend';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[MAGIC LINK SEND] RESEND_API_KEY is not configured');
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
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

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Rende-View <onboarding@resend.dev>',
      to: normalizedEmail,
      subject: 'Sign in to Rende-View',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7C3AED; text-align: center;">Rende-View</h1>
          <h2 style="text-align: center;">Sign in to your account</h2>
          <p style="text-align: center; color: #666;">Click the button below to sign in. This link expires in 15 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
               style="background: linear-gradient(135deg, #7C3AED, #9333EA); 
                      color: white; 
                      padding: 14px 28px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              Sign In
            </a>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[MAGIC LINK SEND] Resend error:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('[MAGIC LINK SEND] Email sent successfully to:', normalizedEmail, 'Message ID:', data?.id);

    return Response.json({ 
      success: true, 
      message: 'Magic link sent to your email.',
      expiresAt: expires.toISOString()
    });
  } catch (error) {
    console.error('[MAGIC LINK SEND] Error:', error);
    return Response.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
