// Route for saving media (photos/videos) to database after upload
import { getAuth } from "@hono/auth-js";
import { ObjectStorageService } from "../../../../../../server/objectStorage";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function POST(request, { params }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = auth.user.id;
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
      INSERT INTO auth_user_media (user_id, type, url)
      VALUES (${userId}, ${type}, ${objectPath})
    `;

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
    const auth = await getAuth(request);
    if (!auth?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = auth.user.id;
    const url = new URL(request.url);
    const mediaUrl = url.searchParams.get("url");

    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: "url parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete from database
    await sql`
      DELETE FROM auth_user_media
      WHERE user_id = ${userId} AND url = ${mediaUrl}
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
