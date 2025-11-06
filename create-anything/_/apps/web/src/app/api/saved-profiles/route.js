import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const savedProfiles = await sql`
      SELECT 
        sp.id as save_id,
        sp.created_at as saved_at,
        u.id,
        u.name,
        u.bio,
        u.primary_photo_url as photo
      FROM saved_profiles sp
      JOIN auth_users u ON sp.saved_user_id = u.id
      WHERE sp.user_id = ${userId}
      ORDER BY sp.created_at DESC
    `;

    return Response.json({ savedProfiles: savedProfiles || [] });
  } catch (err) {
    console.error("GET /api/saved-profiles error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { savedUserId } = await request.json();

    if (!savedUserId) {
      return Response.json({ error: "Missing savedUserId" }, { status: 400 });
    }

    if (savedUserId === userId) {
      return Response.json({ error: "Cannot save your own profile" }, { status: 400 });
    }

    const currentSaves = await sql`
      SELECT COUNT(*) as count 
      FROM saved_profiles 
      WHERE user_id = ${userId}
    `;

    if (parseInt(currentSaves[0]?.count || 0) >= 5) {
      return Response.json({ 
        error: "You can only save up to 5 profiles. Remove one to add another.",
        limitReached: true 
      }, { status: 400 });
    }

    const [saved] = await sql`
      INSERT INTO saved_profiles (user_id, saved_user_id)
      VALUES (${userId}, ${savedUserId})
      ON CONFLICT (user_id, saved_user_id) DO NOTHING
      RETURNING id, created_at
    `;

    if (!saved) {
      return Response.json({ 
        message: "Profile already saved",
        alreadySaved: true 
      }, { status: 200 });
    }

    return Response.json({ 
      success: true,
      saveId: saved.id,
      savedAt: saved.created_at 
    });
  } catch (err) {
    console.error("POST /api/saved-profiles error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const savedUserId = searchParams.get("savedUserId");

    if (!savedUserId) {
      return Response.json({ error: "Missing savedUserId" }, { status: 400 });
    }

    await sql`
      DELETE FROM saved_profiles 
      WHERE user_id = ${userId} AND saved_user_id = ${savedUserId}
    `;

    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/saved-profiles error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
