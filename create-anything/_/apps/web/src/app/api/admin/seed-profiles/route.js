import sql from "@/app/api/utils/sql";
import argon2 from "argon2";

export async function POST(request) {
  try {
    const profiles = [
      {
        name: "Alex Chen",
        email: "alex.chen@example.com",
        bio: "Software engineer passionate about hiking and cooking. Looking for meaningful connections!",
        age: 28,
        location: "San Francisco, CA",
        interests: ["hiking", "cooking", "tech", "photography"],
        membershipTier: "dating",
      },
      {
        name: "Maria Garcia",
        email: "maria.garcia@example.com",
        bio: "Artist and yoga instructor. Love traveling and meeting new people. Let's grab coffee!",
        age: 26,
        location: "Austin, TX",
        interests: ["yoga", "art", "travel", "coffee"],
        membershipTier: "casual",
      },
      {
        name: "Jordan Smith",
        email: "jordan.smith@example.com",
        bio: "Marketing professional by day, musician by night. Always up for a concert or trying new restaurants.",
        age: 30,
        location: "New York, NY",
        interests: ["music", "food", "concerts", "marketing"],
        membershipTier: "dating",
      },
      {
        name: "Taylor Johnson",
        email: "taylor.johnson@example.com",
        bio: "Fitness enthusiast and outdoor adventurer. Looking for someone to join me on my next adventure!",
        age: 27,
        location: "Denver, CO",
        interests: ["fitness", "hiking", "skiing", "adventure"],
        membershipTier: "casual",
      },
      {
        name: "Sam Patel",
        email: "sam.patel@example.com",
        bio: "Data scientist who loves board games and trivia nights. Let's test our knowledge together!",
        age: 29,
        location: "Seattle, WA",
        interests: ["games", "trivia", "data", "coffee"],
        membershipTier: "business",
      },
      {
        name: "Casey Williams",
        email: "casey.williams@example.com",
        bio: "Teacher and book lover. When I'm not reading, you'll find me at the dog park with my golden retriever!",
        age: 25,
        location: "Portland, OR",
        interests: ["reading", "dogs", "teaching", "nature"],
        membershipTier: "dating",
      },
    ];

    const password = "testpass123";
    const hashedPassword = await argon2.hash(password);

    const createdUsers = [];

    for (const profile of profiles) {
      // Check if user already exists
      const existing = await sql`SELECT id FROM auth_users WHERE email = ${profile.email}`;
      let userId = existing?.[0]?.id || null;

      if (!userId) {
        // Create user with complete profile
        const primaryPhotoUrl = "https://placehold.co/600x800/" + 
          (createdUsers.length === 0 ? "5B3BAF" : 
           createdUsers.length === 1 ? "00BFA6" : 
           createdUsers.length === 2 ? "E91E63" : 
           createdUsers.length === 3 ? "FF9800" : 
           createdUsers.length === 4 ? "2196F3" : "4CAF50") + 
          "/FFFFFF?text=" + encodeURIComponent(profile.name.split(' ')[0]);
        
        const created = await sql`
          INSERT INTO auth_users (
            name, 
            email, 
            bio,
            membership_tier, 
            consent_accepted, 
            timezone,
            typical_availability,
            primary_photo_url
          )
          VALUES (
            ${profile.name}, 
            ${profile.email},
            ${profile.bio},
            ${profile.membershipTier},
            true,
            ${"America/New_York"},
            ${JSON.stringify({
              typical: [
                { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "18:00", end: "22:00" },
                { days: ["Sat", "Sun"], start: "10:00", end: "20:00" }
              ],
              timezone: "America/New_York"
            })}::jsonb,
            ${primaryPhotoUrl}
          )
          RETURNING id`;
        userId = created[0].id;

        // Create credentials account
        await sql`
          INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
          VALUES (${userId}, 'credentials', 'credentials', ${userId}::text, ${hashedPassword})`;

        // Create profile photos (3 photos per user with different colors)
        const colors = [
          ["5B3BAF", "FFFFFF"], // Purple
          ["00BFA6", "FFFFFF"], // Teal
          ["E91E63", "FFFFFF"], // Pink
          ["FF9800", "FFFFFF"], // Orange
          ["2196F3", "FFFFFF"], // Blue
          ["4CAF50", "FFFFFF"], // Green
        ];
        const userColor = colors[createdUsers.length % colors.length];
        
        await sql`
          INSERT INTO profile_media (user_id, type, url, sort_order)
          VALUES 
            (${userId}, 'photo', ${"https://placehold.co/600x800/" + userColor[0] + "/" + userColor[1] + "?text=" + encodeURIComponent(profile.name.split(' ')[0])}, 0),
            (${userId}, 'photo', ${"https://placehold.co/600x800/" + userColor[0] + "/" + userColor[1] + "?text=Photo+2"}, 1),
            (${userId}, 'photo', ${"https://placehold.co/600x800/" + userColor[0] + "/" + userColor[1] + "?text=Photo+3"}, 2)`;

        // Create a profile video (using sample video for testing)
        // Note: Using Big Buck Bunny sample video for demonstration
        await sql`
          INSERT INTO profile_media (user_id, type, url, sort_order)
          VALUES (${userId}, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 3)`;

        createdUsers.push({
          id: userId,
          name: profile.name,
          email: profile.email,
          membershipTier: profile.membershipTier,
        });
      } else {
        createdUsers.push({
          id: userId,
          name: profile.name,
          email: profile.email,
          alreadyExists: true,
        });
      }
    }

    return Response.json({
      ok: true,
      message: "Successfully created 6 test profiles",
      users: createdUsers,
      testPassword: password,
      note: "All test users can login with password: " + password,
    });
  } catch (err) {
    console.error("POST /api/admin/seed-profiles error", err);
    return Response.json({ 
      error: "Internal Server Error", 
      details: err.message 
    }, { status: 500 });
  }
}
