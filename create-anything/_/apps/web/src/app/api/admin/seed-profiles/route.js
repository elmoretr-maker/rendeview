import sql from "@/app/api/utils/sql";
import argon2 from "argon2";
import { getAuthenticatedUserId } from "@/app/api/utils/auth";

export async function POST(request) {
  try {
    // Get current user to create likes directed at them
    const currentUserId = await getAuthenticatedUserId(request);
    const profiles = [
      {
        name: "Emma Rodriguez",
        email: "emma.rodriguez@example.com",
        bio: "NYC event planner who loves Broadway shows and rooftop bars. Let's explore the city together!",
        age: 28,
        gender: "female",
        location: "New York, NY",
        latitude: 40.7128,
        longitude: -74.0060,
        interests: ["theater", "events", "nightlife", "travel"],
        membershipTier: "dating",
      },
      {
        name: "Marcus Johnson",
        email: "marcus.johnson@example.com",
        bio: "Detroit entrepreneur and car enthusiast. Love trying new restaurants and weekend road trips.",
        age: 32,
        gender: "male",
        location: "Detroit, MI",
        latitude: 42.3314,
        longitude: -83.0458,
        interests: ["cars", "food", "business", "travel"],
        membershipTier: "business",
      },
      {
        name: "Sophia Chen",
        email: "sophia.chen@example.com",
        bio: "Brooklyn artist and yoga instructor. Always looking for coffee shop recommendations and art galleries!",
        age: 26,
        gender: "female",
        location: "Brooklyn, NY",
        latitude: 40.6782,
        longitude: -73.9442,
        interests: ["art", "yoga", "coffee", "photography"],
        membershipTier: "casual",
      },
      {
        name: "James Martinez",
        email: "james.martinez@example.com",
        bio: "Ann Arbor professor who loves hiking, cooking, and live music. Looking for someone to share adventures with!",
        age: 30,
        gender: "male",
        location: "Ann Arbor, MI",
        latitude: 42.2808,
        longitude: -83.7430,
        interests: ["hiking", "cooking", "music", "education"],
        membershipTier: "dating",
      },
      {
        name: "Olivia Taylor",
        email: "olivia.taylor@example.com",
        bio: "Manhattan finance professional by day, foodie by night. Let's find the best pizza in NYC together!",
        age: 29,
        gender: "female",
        location: "Manhattan, NY",
        latitude: 40.7831,
        longitude: -73.9712,
        interests: ["finance", "food", "fitness", "wine"],
        membershipTier: "business",
      },
      {
        name: "Ryan Thompson",
        email: "ryan.thompson@example.com",
        bio: "Grand Rapids craft beer lover and outdoor adventurer. When I'm not on the trails, you'll find me at a brewery!",
        age: 27,
        gender: "male",
        location: "Grand Rapids, MI",
        latitude: 42.9634,
        longitude: -85.6681,
        interests: ["beer", "hiking", "outdoors", "music"],
        membershipTier: "casual",
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
        
        const timezone = profile.location.includes("MI") ? "America/Detroit" : "America/New_York";
        
        const created = await sql`
          INSERT INTO auth_users (
            name, 
            email, 
            bio,
            gender,
            membership_tier, 
            consent_accepted, 
            timezone,
            typical_availability,
            primary_photo_url,
            location,
            latitude,
            longitude
          )
          VALUES (
            ${profile.name}, 
            ${profile.email},
            ${profile.bio},
            ${profile.gender},
            ${profile.membershipTier},
            true,
            ${timezone},
            ${JSON.stringify({
              typical: [
                { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "18:00", end: "22:00" },
                { days: ["Sat", "Sun"], start: "10:00", end: "20:00" }
              ],
              timezone: timezone
            })}::jsonb,
            ${primaryPhotoUrl},
            ${profile.location},
            ${profile.latitude},
            ${profile.longitude}
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

    // Create likes from fake profiles to current user (for "New Matches" page)
    const likers = [];
    if (currentUserId) {
      // Have 3 fake profiles like the current user (Emma, Sophia, Olivia - all females)
      const likersToCreate = createdUsers.filter(u => 
        ['Emma Rodriguez', 'Sophia Chen', 'Olivia Taylor'].includes(u.name)
      );
      
      for (const liker of likersToCreate) {
        // Check if like already exists
        const existingLike = await sql`
          SELECT id FROM likes 
          WHERE liker_id = ${liker.id} AND liked_id = ${currentUserId}`;
        
        if (!existingLike?.length) {
          await sql`
            INSERT INTO likes (liker_id, liked_id)
            VALUES (${liker.id}, ${currentUserId})`;
          likers.push(liker.name);
        }
      }
    }

    return Response.json({
      ok: true,
      message: "Successfully created 6 test profiles" + (likers.length > 0 ? ` and ${likers.length} likes` : ""),
      users: createdUsers,
      likers: likers.length > 0 ? likers : undefined,
      testPassword: password,
      note: "All test users can login with password: " + password + 
        (likers.length > 0 ? `. Check 'New Matches' to see who liked you!` : ""),
    });
  } catch (err) {
    console.error("POST /api/admin/seed-profiles error", err);
    return Response.json({ 
      error: "Internal Server Error", 
      details: err.message 
    }, { status: 500 });
  }
}
