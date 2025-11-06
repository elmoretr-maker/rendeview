import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { upload } from "@/app/api/utils/upload";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = request.headers.get("Content-Type");
    let uploadParams = {};
    let mediaType = "photo";

    if (contentType === "application/octet-stream") {
      const buffer = await request.arrayBuffer();
      uploadParams = { buffer: Buffer.from(buffer), userId };
    } else {
      const body = await request.json();
      const { base64, url, type } = body;

      if (!base64 && !url) {
        return new Response(JSON.stringify({ error: "Missing base64 or url" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate and normalize type to allowed values only
      if (type && !["photo", "video"].includes(type)) {
        return new Response(JSON.stringify({ error: "Invalid type. Must be 'photo' or 'video'" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      mediaType = type || "photo";
      uploadParams = base64 ? { base64, userId } : { url, userId };
    }

    const result = await upload(uploadParams);
    const objectPath = result.url;

    // Get the current max sort_order for this user's media
    const [maxOrder] = await sql`
      SELECT COALESCE(MAX(sort_order), -1) as max_order 
      FROM profile_media 
      WHERE user_id = ${userId}`;
    
    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    // Save to database
    const [inserted] = await sql`
      INSERT INTO profile_media (user_id, type, url, sort_order)
      VALUES (${userId}, ${mediaType}, ${objectPath}, ${sortOrder})
      RETURNING id, user_id, type, url, sort_order, created_at`;

    // If this is the first photo and user doesn't have a primary_photo_url, set it
    if (mediaType === "photo") {
      const [user] = await sql`SELECT primary_photo_url FROM auth_users WHERE id = ${userId}`;
      if (!user?.primary_photo_url) {
        await sql`UPDATE auth_users SET primary_photo_url = ${objectPath} WHERE id = ${userId}`;
      }
    }
    
    return new Response(JSON.stringify({ 
      ...result, 
      ok: true,
      media: inserted 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error uploading:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
