import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { logger } from "@/utils/logger";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin access
    const [user] = await sql`SELECT email FROM auth_users WHERE id = ${session.user.id}`;
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = user.email?.toLowerCase().includes('staff') || 
                   user.email?.toLowerCase() === 'trelmore.staff@gmail.com';
    
    if (!isAdmin) {
      return Response.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Clear the flagged_for_admin flag
    const result = await sql`
      UPDATE auth_users
      SET flagged_for_admin = false
      WHERE id = ${userId}
      RETURNING id, name, email, block_count, flagged_for_admin
    `;

    if (!result?.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    logger.safety('admin_cleared_flag', {
      adminId: session.user.id,
      adminEmail: user.email,
      targetUserId: userId,
      targetUserEmail: result[0].email
    });

    return Response.json({ 
      success: true, 
      user: result[0] 
    });
  } catch (err) {
    console.error("POST /api/admin/clear-flag error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
