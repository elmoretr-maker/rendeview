import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { checkRateLimit } from "@/app/api/utils/rateLimit";
import { RATE_LIMITS } from "@/config/constants";

export async function GET(request) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql`
      SELECT b.id, b.blocked_id, u.name, u.image, b.created_at, b.notes
      FROM blockers b
      JOIN auth_users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ${uid}
      ORDER BY b.created_at DESC`;

    return Response.json({ blockers: rows });
  } catch (err) {
    console.error("GET /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Rate limiting from central config
    const { maxRequests, windowMinutes, endpoint } = RATE_LIMITS.BLOCK_USER;
    const rateCheck = await checkRateLimit(uid, endpoint, maxRequests, windowMinutes);
    if (!rateCheck.allowed) {
      console.warn(`[RATE_LIMIT] User ${uid} exceeded blocker creation limit`);
      return Response.json(
        { 
          error: "Too many block requests. Please try again later.",
          retryAfter: rateCheck.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateCheck.resetAt.toISOString()
          }
        }
      );
    }
    
    const { blockedId } = await request.json();
    if (!blockedId || blockedId === uid) {
      return Response.json({ error: "Invalid user" }, { status: 400 });
    }

    // Execute block insertion with atomic counter increment AND moderation updates
    // CTE pattern ensures UPDATE only runs when INSERT actually created a new row
    // Handles both new blocks and duplicate attempts atomically in single transaction
    await sql.transaction([
      sql`
        WITH inserted AS (
          INSERT INTO blockers (blocker_id, blocked_id) 
          VALUES (${uid}, ${blockedId})
          ON CONFLICT (blocker_id, blocked_id) DO NOTHING
          RETURNING id
        )
        UPDATE auth_users 
        SET 
          block_count = COALESCE(block_count, 0) + 1,
          flagged_for_admin = CASE 
            WHEN COALESCE(block_count, 0) + 1 >= 3 THEN true 
            ELSE flagged_for_admin 
          END,
          account_status = CASE 
            WHEN COALESCE(block_count, 0) + 1 >= 4 THEN 'under_review' 
            ELSE account_status 
          END
        WHERE id = ${blockedId}
          AND EXISTS (SELECT 1 FROM inserted)
      `
    ]);

    // Get updated block count and user info for response
    const [updated] = await sql`
      SELECT block_count, name FROM auth_users WHERE id = ${blockedId}`;
    const blockCount = updated?.block_count || 0;
    const userName = updated?.name || '';
    let warning = null;

    if (blockCount === 3) {
      warning = `This user (${userName}) has now been blocked by 3 people and has been flagged for admin review.`;
    } else if (blockCount >= 4) {
      warning = `This user (${userName}) has been blocked by ${blockCount} people and their account is now under review.`;
    }

    return Response.json({ ok: true, warning, blockCount });
  } catch (err) {
    console.error("POST /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { blockedId, notes } = await request.json();
    if (!blockedId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`
      UPDATE blockers 
      SET notes = ${notes || null}
      WHERE blocker_id = ${uid} AND blocked_id = ${blockedId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const uid = await getAuthenticatedUserId(request);
    if (!uid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { blockedId } = await request.json();
    if (!blockedId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    await sql`DELETE FROM blockers WHERE blocker_id = ${uid} AND blocked_id = ${blockedId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/blockers error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
