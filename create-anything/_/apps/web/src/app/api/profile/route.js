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
             religion, children_preference, pets, location, max_distance, latitude, longitude
      FROM auth_users WHERE id = ${userId} LIMIT 1`;
    
    // Transform primary_photo_url: /objects/... -> /api/objects/...
    const user = rows?.[0] ? {
      ...rows[0],
      primary_photo_url: rows[0].primary_photo_url && rows[0].primary_photo_url.startsWith('/objects/')
        ? `/api${rows[0].primary_photo_url}`
        : rows[0].primary_photo_url
    } : null;
    
    const mediaRows =
      await sql`SELECT id, type, url, sort_order FROM profile_media WHERE user_id = ${userId} ORDER BY sort_order ASC, id ASC`;
    
    // Transform media URLs to include /api prefix for display
    // URLs in DB are stored as /objects/... so we prepend /api to get /api/objects/...
    const media = mediaRows.map(m => ({
      ...m,
      url: m.url.startsWith('/objects/') ? `/api${m.url}` : m.url
    }));
    
    return Response.json({ user, media });
  } catch (err) {
    console.error("GET /api/profile error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  return Response.json({ 
    error: "Direct photo upload not supported. Use proper upload endpoints." 
  }, { status: 400 });
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
    
    // latitude and longitude for geo-filtering
    if (typeof body.latitude === 'number') {
      setClauses.push(`latitude = $${values.length + 1}`);
      values.push(body.latitude);
    }
    if (typeof body.longitude === 'number') {
      setClauses.push(`longitude = $${values.length + 1}`);
      values.push(body.longitude);
    }

    if (setClauses.length) {
      const q = `UPDATE auth_users SET ${setClauses.join(", ")} WHERE id = $${values.length + 1} RETURNING id`;
      await sql(q, [...values, userId]);
    }

    // Media updates - production version requires valid URLs
    let responseMedia = [];
    if (Array.isArray(body.media)) {
      await sql.transaction([
        sql`DELETE FROM profile_media WHERE user_id = ${userId}`,
      ]);

      for (let i = 0; i < body.media.length; i++) {
        const m = body.media[i];
        if (!m?.url) {
          return Response.json({ 
            error: "All media items must have a valid URL" 
          }, { status: 400 });
        }
        
        const type = m?.type || "photo";
        const url = m.url;
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
