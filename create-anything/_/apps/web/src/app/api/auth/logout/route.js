export async function POST(request) {
  try {
    // List of auth-related cookies to clear
    const authCookies = [
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.callback-url',
      '__Secure-authjs.callback-url',
      'authjs.csrf-token',
      '__Secure-authjs.csrf-token',
    ];
    
    // Create Set-Cookie headers to expire all auth cookies
    const cookieHeaders = authCookies.map(name => 
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    );
    
    return new Response(JSON.stringify({ success: true, message: "Logged out successfully" }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeaders
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify({ error: "Failed to logout" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request) {
  // Also support GET for simple browser navigation
  return POST(request);
}
