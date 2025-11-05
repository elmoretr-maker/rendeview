import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    
    return Response.json({
      authenticated: !!session?.user,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      } : null,
      hasSession: !!session,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/auth-status error", err);
    return Response.json({ 
      error: "Internal Server Error", 
      details: err.message,
      authenticated: false,
    }, { status: 500 });
  }
}
