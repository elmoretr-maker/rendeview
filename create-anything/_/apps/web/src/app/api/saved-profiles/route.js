import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { calculateCompatibility } from "@/utils/calculateCompatibility";

function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Get current user's profile for distance and compatibility calculation
    const [currentUser] = await sql`
      SELECT latitude, longitude, interests, membership_tier, 
             relationship_goals, smoking, drinking, exercise
      FROM auth_users WHERE id = ${userId}
    `;
    const userLat = currentUser?.latitude != null ? parseFloat(currentUser.latitude) : null;
    const userLng = currentUser?.longitude != null ? parseFloat(currentUser.longitude) : null;

    const savedProfiles = await sql`
      SELECT 
        sp.id as save_id,
        sp.created_at as saved_at,
        u.id,
        u.name,
        u.bio,
        u.primary_photo_url as photo,
        u.immediate_available,
        u.latitude,
        u.longitude,
        u.interests,
        u.membership_tier,
        u.relationship_goals,
        u.smoking,
        u.drinking,
        u.exercise,
        u.last_active,
        (SELECT pm.url FROM profile_media pm WHERE pm.user_id = u.id AND pm.type = 'video' LIMIT 1) as video_url
      FROM saved_profiles sp
      JOIN auth_users u ON sp.saved_user_id = u.id
      WHERE sp.user_id = ${userId}
      ORDER BY sp.created_at DESC
    `;
    
    const transformedProfiles = (savedProfiles || []).map(p => {
      const profileLat = p.latitude != null ? parseFloat(p.latitude) : null;
      const profileLng = p.longitude != null ? parseFloat(p.longitude) : null;
      const distance_miles = calculateDistanceMiles(userLat, userLng, profileLat, profileLng);
      
      // Calculate compatibility score
      const compatibility_score = calculateCompatibility(currentUser || {}, p);
      
      return {
        ...p,
        photo: p.photo && p.photo.startsWith('/objects/') ? `/api${p.photo}` : p.photo,
        video_url: p.video_url && p.video_url.startsWith('/objects/') ? `/api${p.video_url}` : p.video_url,
        distance_miles: distance_miles != null ? Math.round(distance_miles) : null,
        compatibility_score,
      };
    });

    return Response.json({ savedProfiles: transformedProfiles });
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
