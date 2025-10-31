import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const settings = await sql`SELECT id, pricing, discount_toggles, updated_at FROM admin_settings WHERE id = 1`;
    if (!settings?.length) {
      return Response.json({ error: "Settings not found" }, { status: 404 });
    }
    return Response.json({ settings: settings[0] });
  } catch (err) {
    console.error("GET /api/admin/settings error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Check if user has admin access (email contains 'staff' OR specific email)
    const [user] = await sql`SELECT email FROM auth_users WHERE id = ${session.user.id}`;
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = user.email?.toLowerCase().includes('staff') || 
                   user.email?.toLowerCase() === 'trelmore.staff@gmail.com';
    
    if (!isAdmin) {
      return Response.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { pricing, discount_toggles } = await request.json();

    const result = await sql`
      UPDATE admin_settings
      SET pricing = ${pricing ?? null}::jsonb,
          discount_toggles = ${discount_toggles ?? null}::jsonb,
          updated_at = now()
      WHERE id = 1
      RETURNING id, pricing, discount_toggles, updated_at`;

    return Response.json({ settings: result?.[0] || null });
  } catch (err) {
    console.error("PUT /api/admin/settings error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
