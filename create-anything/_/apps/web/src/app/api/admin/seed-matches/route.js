import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id;

    // Get all demo profile users (the 6 fake profiles we created)
    const demoProfiles = await sql`
      SELECT id, name FROM auth_users 
      WHERE email IN (
        'emma.rodriguez@example.com',
        'marcus.johnson@example.com',
        'sophia.chen@example.com',
        'james.martinez@example.com',
        'olivia.taylor@example.com',
        'ryan.thompson@example.com'
      )
    `;

    if (demoProfiles.length === 0) {
      return Response.json({ 
        error: "No demo profiles found. Run /api/admin/seed-profiles first." 
      }, { status: 400 });
    }

    // Select 3 random profiles to match with
    const shuffled = [...demoProfiles].sort(() => Math.random() - 0.5);
    const profilesToMatch = shuffled.slice(0, 3);

    const createdMatches = [];

    for (const profile of profilesToMatch) {
      // Determine user_a and user_b (user_a_id must be < user_b_id due to constraint)
      const userA = Math.min(currentUserId, profile.id);
      const userB = Math.max(currentUserId, profile.id);

      // Check if match already exists
      const existing = await sql`
        SELECT id FROM matches 
        WHERE user_a_id = ${userA} AND user_b_id = ${userB}
      `;

      let matchId;

      if (existing.length > 0) {
        matchId = existing[0].id;
      } else {
        // Create match
        const match = await sql`
          INSERT INTO matches (user_a_id, user_b_id, created_at)
          VALUES (${userA}, ${userB}, now())
          RETURNING id
        `;
        matchId = match[0].id;

        // Create some initial messages
        const messages = [
          { from: profile.id, text: `Hey! Nice to match with you! I'm ${profile.name}. 😊` },
          { from: currentUserId, text: "Hi! Great to meet you too!" },
          { from: profile.id, text: "What are you looking for on here?" },
        ];

        for (let i = 0; i < messages.length; i++) {
          await sql`
            INSERT INTO messages (match_id, sender_id, content, created_at)
            VALUES (
              ${matchId}, 
              ${messages[i].from}, 
              ${messages[i].text}, 
              now() + interval '${i} seconds'
            )
          `;
        }
      }

      createdMatches.push({
        matchId,
        profileName: profile.name,
        profileId: profile.id,
      });
    }

    return Response.json({
      ok: true,
      message: `Successfully created ${createdMatches.length} matches with demo messages`,
      matches: createdMatches,
    });
  } catch (err) {
    console.error("POST /api/admin/seed-matches error", err);
    return Response.json({ 
      error: "Internal Server Error", 
      details: err.message 
    }, { status: 500 });
  }
}
