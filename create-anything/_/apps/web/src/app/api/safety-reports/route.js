import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reporterId = Number(session.user.id);
    const body = await request.json();
    const { reportedUserId, reason, videoSessionId, context } = body;

    if (!reportedUserId || !reason?.trim()) {
      return Response.json(
        { error: "Reported user ID and reason are required" },
        { status: 400 }
      );
    }

    if (reportedUserId === reporterId) {
      return Response.json(
        { error: "Cannot report yourself" },
        { status: 400 }
      );
    }

    const [report] = await sql`
      INSERT INTO safety_reports (
        reporter_id,
        reported_user_id,
        video_session_id,
        reason,
        context,
        status
      ) VALUES (
        ${reporterId},
        ${Number(reportedUserId)},
        ${videoSessionId ? Number(videoSessionId) : null},
        ${reason.trim()},
        ${context || 'video_call'},
        'pending'
      ) RETURNING id, created_at
    `;

    await sql`
      UPDATE auth_users
      SET 
        block_count = COALESCE(block_count, 0) + 1,
        flagged_for_admin = CASE 
          WHEN COALESCE(block_count, 0) + 1 >= 3 THEN true 
          ELSE flagged_for_admin 
        END
      WHERE id = ${Number(reportedUserId)}
    `;

    return Response.json({
      success: true,
      reportId: report.id,
      createdAt: report.created_at,
    });
  } catch (err) {
    console.error("POST /api/safety-reports error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await sql`
      SELECT role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (user?.role !== 'admin') {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const reports = await sql`
      SELECT 
        sr.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reported.name as reported_name,
        reported.email as reported_email,
        reported.block_count as reported_block_count
      FROM safety_reports sr
      JOIN auth_users reporter ON sr.reporter_id = reporter.id
      JOIN auth_users reported ON sr.reported_user_id = reported.id
      WHERE sr.status = ${status}
      ORDER BY sr.created_at DESC
      LIMIT 50
    `;

    return Response.json({ reports });
  } catch (err) {
    console.error("GET /api/safety-reports error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
