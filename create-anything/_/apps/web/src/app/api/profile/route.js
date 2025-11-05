import sql from "@/app/api/utils/sql";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

export async function GET(request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rows = await sql`
      SELECT id, name, email, image, role, consent_accepted, consent_at,
             immediate_available, availability_override, video_call_available, timezone, typical_availability,
             membership_tier, primary_photo_url, scheduled_tier, tier_change_at,
             video_meetings_count, last_video_meeting_at, bio, interests,
             gender, sexual_orientation, looking_for, body_type, height_range,
             education, relationship_goals, drinking, smoking, exercise,
             religion, children_preference, pets, location, max_distance
      FROM auth_users WHERE id = ${userId} LIMIT 1`;
    const media =
      await sql`SELECT id, type, url, sort_order FROM profile_media WHERE user_id = ${userId} ORDER BY sort_order ASC, id ASC`;
    return Response.json({ user: rows?.[0] || null, media });
  } catch (err) {
    console.error("GET /api/profile error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// TEMPORARY STABILIZATION: Mock photo upload endpoint
// This POST handler returns placeholder image URLs to unblock onboarding when uploads fail.
// It does not persist anything; callers should subsequently save via PUT /api/profile.
export async function POST(request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let count = 3;
    try {
      const body = await request.json();
      const desired = Number(body?.count);
      if (Number.isFinite(desired)) {
        count = Math.max(1, Math.min(6, Math.trunc(desired)));
      }
    } catch {}

    const placeholders = [
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+1",
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+2",
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+3",
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+4",
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+5",
      "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+6",
    ];

    const urls = placeholders.slice(0, count);
    return Response.json({ ok: true, urls }, { status: 200 });
  } catch (err) {
    console.error("POST /api/profile mock upload error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const setClauses = [];
    const values = [];

    if (typeof body.name === "string") {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(body.name.trim());
    }
    if (typeof body.consent_accepted === "boolean") {
      setClauses.push(`consent_accepted = $${values.length + 1}`);
      values.push(body.consent_accepted);
      if (body.consent_accepted) {
        setClauses.push(`consent_at = now()`);
      } else {
        setClauses.push(`consent_at = NULL`);
      }
    }
    if (typeof body.immediate_available === "boolean") {
      setClauses.push(`immediate_available = $${values.length + 1}`);
      values.push(body.immediate_available);
    }
    if (typeof body.availability_override === "boolean") {
      setClauses.push(`availability_override = $${values.length + 1}`);
      values.push(body.availability_override);
    }
    if (typeof body.video_call_available === "boolean") {
      setClauses.push(`video_call_available = $${values.length + 1}`);
      values.push(body.video_call_available);
    }
    if (typeof body.timezone === "string") {
      setClauses.push(`timezone = $${values.length + 1}`);
      values.push(body.timezone);
    }
    if (body.typical && body.timezone) {
      setClauses.push(`typical_availability = $${values.length + 1}::jsonb`);
      values.push(
        JSON.stringify({ typical: body.typical, timezone: body.timezone }),
      );
    }
    // NEW: allow updating membership_tier
    if (typeof body.membership_tier === "string") {
      const v = body.membership_tier.toLowerCase();
      const allowed = ["casual", "active", "dating", "business"];
      if (allowed.includes(v)) {
        setClauses.push(`membership_tier = $${values.length + 1}`);
        values.push(v);
      }
    }
    // NEW: allow updating primary_photo_url
    if (typeof body.primary_photo_url === "string") {
      setClauses.push(`primary_photo_url = $${values.length + 1}`);
      values.push(body.primary_photo_url.trim());
    }
    
    // Bio
    if (body.bio !== undefined) {
      setClauses.push(`bio = $${values.length + 1}`);
      values.push(body.bio);
    }
    
    // Interests (JSONB array)
    if (body.interests !== undefined) {
      setClauses.push(`interests = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(body.interests));
    }
    
    // Preference fields (all TEXT)
    const preferenceFields = [
      'gender', 'sexual_orientation', 'looking_for', 'body_type', 'height_range',
      'education', 'relationship_goals', 'drinking', 'smoking', 'exercise',
      'religion', 'children_preference', 'pets', 'location'
    ];
    
    for (const field of preferenceFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = $${values.length + 1}`);
        values.push(body[field]);
      }
    }
    
    // max_distance is an INTEGER field
    if (typeof body.max_distance === 'number') {
      setClauses.push(`max_distance = $${values.length + 1}`);
      values.push(body.max_distance);
    }

    if (setClauses.length) {
      const q = `UPDATE auth_users SET ${setClauses.join(", ")} WHERE id = $${values.length + 1} RETURNING id`;
      await sql(q, [...values, userId]);
    }

    // Media updates with temporary placeholder fallback to stabilize onboarding
    let responseMedia = [];
    if (Array.isArray(body.media)) {
      const usePlaceholders = Boolean(body.media_placeholder);
      const placeholders = [
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+1",
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+2",
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+3",
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+4",
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+5",
        "https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+6",
      ];

      await sql.transaction([
        sql`DELETE FROM profile_media WHERE user_id = ${userId}`,
      ]);

      for (let i = 0; i < body.media.length; i++) {
        const m = body.media[i];
        const type = m?.type || "photo";
        const url =
          usePlaceholders || !m?.url
            ? placeholders[i] || placeholders[0]
            : m.url;
        const sortOrder = Number.isInteger(m?.sort_order) ? m.sort_order : i;
        await sql`INSERT INTO profile_media (user_id, type, url, sort_order) VALUES (${userId}, ${type}, ${url}, ${sortOrder})`;
        responseMedia.push({ type, url, sort_order: sortOrder });
      }

      // If no explicit primary provided, set it to first photo
      if (typeof body.primary_photo_url !== "string") {
        const firstPhoto = responseMedia.find((m) => m.type === "photo");
        if (firstPhoto?.url) {
          await sql`UPDATE auth_users SET primary_photo_url = ${firstPhoto.url} WHERE id = ${userId}`;
        }
      }
    }

    return Response.json({ ok: true, media: responseMedia });
  } catch (err) {
    console.error("PUT /api/profile error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
