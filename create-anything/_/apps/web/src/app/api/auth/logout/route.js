export async function POST(request) {
  try {
    const authCookies = [
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.callback-url',
      '__Secure-authjs.callback-url',
      'authjs.csrf-token',
      '__Secure-authjs.csrf-token',
    ];
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    authCookies.forEach(name => {
      const isSecure = name.startsWith('__Secure-');
      const cookieValue = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      headers.append('Set-Cookie', cookieValue);
    });
    
    return new Response(JSON.stringify({ success: true, message: "Logged out successfully" }), {
      status: 200,
      headers: headers
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
