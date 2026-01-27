import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await sql`
      SELECT role, email FROM auth_users WHERE id = ${session.user.id}
    `;

    const isAdmin = user?.role === 'admin' || 
                   user?.email?.toLowerCase().includes('staff') ||
                   user?.email?.toLowerCase() === 'trelmore.staff@gmail.com';

    if (!isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, adminNotes } = body;

    if (!action || !['resolve', 'ban'].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const [report] = await sql`
      SELECT * FROM safety_reports WHERE id = ${Number(id)}
    `;

    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    if (action === 'resolve') {
      await sql`
        UPDATE safety_reports
        SET 
          status = 'resolved',
          reviewed_at = NOW(),
          reviewed_by = ${session.user.id},
          admin_notes = ${adminNotes || null},
          updated_at = NOW()
        WHERE id = ${Number(id)}
      `;

      return Response.json({ success: true, action: 'resolved' });
    }

    if (action === 'ban') {
      await sql.begin(async (tx) => {
        await tx`
          UPDATE safety_reports
          SET 
            status = 'actioned',
            reviewed_at = NOW(),
            reviewed_by = ${session.user.id},
            admin_notes = ${adminNotes || 'User banned'},
            updated_at = NOW()
          WHERE id = ${Number(id)}
        `;

        await tx`
          UPDATE auth_users
          SET 
            account_status = 'banned',
            updated_at = NOW()
          WHERE id = ${report.reported_user_id}
        `;
      });

      return Response.json({ success: true, action: 'banned', userId: report.reported_user_id });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/safety-reports/[id] error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
