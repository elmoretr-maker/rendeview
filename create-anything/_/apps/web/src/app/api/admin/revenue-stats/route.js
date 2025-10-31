import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
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

    // Get total users
    const [totalUsersResult] = await sql`
      SELECT COUNT(*) as total FROM auth_users
    `;

    // Get paid subscribers by tier
    const subscribersByTier = await sql`
      SELECT 
        membership_tier,
        COUNT(*) as count
      FROM auth_users
      WHERE membership_tier IN ('casual', 'dating', 'business')
      GROUP BY membership_tier
      ORDER BY membership_tier
    `;

    // Get scheduled downgrades (revenue at risk)
    const [scheduledDowngradesResult] = await sql`
      SELECT COUNT(*) as count
      FROM auth_users
      WHERE scheduled_tier IS NOT NULL
        AND tier_change_at IS NOT NULL
        AND tier_change_at > now()
    `;

    // Format the response
    const stats = {
      totalUsers: parseInt(totalUsersResult.total) || 0,
      paidSubscribers: {
        casual: subscribersByTier.find(s => s.membership_tier === 'casual')?.count || 0,
        dating: subscribersByTier.find(s => s.membership_tier === 'dating')?.count || 0,
        business: subscribersByTier.find(s => s.membership_tier === 'business')?.count || 0,
        total: subscribersByTier.reduce((sum, s) => sum + parseInt(s.count || 0), 0)
      },
      scheduledDowngrades: parseInt(scheduledDowngradesResult.count) || 0
    };

    return Response.json({ stats });
  } catch (err) {
    console.error("GET /api/admin/revenue-stats error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
