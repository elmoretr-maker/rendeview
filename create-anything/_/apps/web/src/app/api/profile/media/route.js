// Route for saving media (photos/videos) to database after upload
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { ObjectStorageService } from "../../../../../server/objectStorage";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function POST(request, { params }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json();
    const { mediaURL, type } = body; // type: "photo" or "video"

    if (!mediaURL || !type) {
      return new Response(JSON.stringify({ error: "mediaURL and type are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize the object entity path and set ACL policy
    const objectStorageService = new ObjectStorageService();
    const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
      mediaURL,
      {
        owner: userId,
        visibility: "public", // Profile photos/videos are public
      }
    );

    // Save to database
    await sql`
      INSERT INTO profile_media (user_id, type, url)
      VALUES (${userId}, ${type}, ${objectPath})
    `;

    // CRITICAL FIX: If this is a photo and the user has no primary_photo_url set, set it now
    if (type === "photo") {
      const userRows = await sql`
        SELECT primary_photo_url FROM auth_users WHERE id = ${userId}
      `;
      
      if (userRows.length > 0 && !userRows[0].primary_photo_url) {
        await sql`
          UPDATE auth_users 
          SET primary_photo_url = ${objectPath} 
          WHERE id = ${userId}
        `;
      }
    }

    return new Response(JSON.stringify({ success: true, objectPath }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving media:", error);
    return new Response(JSON.stringify({ error: "Failed to save media" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const url = new URL(request.url);
    const mediaUrl = url.searchParams.get("url");

    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: "url parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Strip /api prefix if present to get the database path
    // URLs are displayed as /api/objects/... but stored as /objects/...
    const dbPath = mediaUrl.startsWith('/api/objects/') 
      ? mediaUrl.replace('/api', '') 
      : mediaUrl;

    // Delete from database
    await sql`
      DELETE FROM profile_media
      WHERE user_id = ${userId} AND url = ${dbPath}
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    return new Response(JSON.stringify({ error: "Failed to delete media" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
