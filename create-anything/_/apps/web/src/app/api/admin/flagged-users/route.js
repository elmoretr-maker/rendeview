import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
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

    // Fetch all users where flagged_for_admin is true
    const flaggedUsers = await sql`
      SELECT 
        id,
        name,
        email,
        block_count,
        account_status,
        flagged_for_admin,
        membership_tier,
        timezone,
        primary_photo_url,
        created_at
      FROM auth_users
      WHERE flagged_for_admin = true
      ORDER BY block_count DESC, created_at DESC
    `;

    return Response.json({ users: flaggedUsers });
  } catch (err) {
    console.error("GET /api/admin/flagged-users error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
