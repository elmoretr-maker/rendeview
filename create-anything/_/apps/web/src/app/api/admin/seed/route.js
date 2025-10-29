import sql from "@/app/api/utils/sql";
import argon2 from "argon2";

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const email = body.email || "trelmore.staff@gmail.com";
    const password = body.password || "ADMIN";
    const name = body.name || "Admin";

    // Create or get admin user
    const existing =
      await sql`SELECT id FROM auth_users WHERE email = ${email}`;
    let userId = existing?.[0]?.id || null;
    if (!userId) {
      const created = await sql`
        INSERT INTO auth_users (name, email, "emailVerified")
        VALUES (${name}, ${email}, NULL)
        RETURNING id`;
      userId = created[0].id;
    }

    // Ensure credentials account exists with hashed password
    const hashed = await argon2.hash(password);
    const accounts = await sql`
      SELECT id FROM auth_accounts WHERE "userId" = ${userId} AND provider = 'credentials'`;
    if (accounts.length === 0) {
      await sql`
        INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
        VALUES (${userId}, 'credentials', 'credentials', ${userId}::text, ${hashed})`;
    } else {
      await sql`UPDATE auth_accounts SET password = ${hashed} WHERE id = ${accounts[0].id}`;
    }

    // Promote to admin role on auth_users
    await sql`UPDATE auth_users SET role = 'admin' WHERE id = ${userId}`;

    // Ensure pricing defaults exist in admin_settings
    const pricing = {
      tiers: {
        casual: { price_cents: 0, minutes: 0 },
        active: { price_cents: 1499, minutes: 999 },
        dating: { price_cents: 2999, minutes: 999 },
        business: { price_cents: 4999, minutes: 999 },
      },
      extensions: [
        { minutes: 5, cents: 500 },
        { minutes: 15, cents: 1000 },
        { minutes: 30, cents: 2000 },
      ],
      second_date_cents: 1000,
    };
    const exists = await sql`SELECT id FROM admin_settings WHERE id = 1`;
    if (exists.length === 0) {
      await sql`INSERT INTO admin_settings (id, pricing) VALUES (1, ${JSON.stringify(pricing)}::jsonb)`;
    } else {
      await sql`UPDATE admin_settings SET pricing = ${JSON.stringify(pricing)}::jsonb, updated_at = now() WHERE id = 1`;
    }

    // --- Seed mock users A and B and a scheduled appointment ---
    const usersToSeed = [
      { name: "User A", email: "usera@example.com" },
      { name: "User B", email: "userb@example.com" },
    ];

    const ids = [];
    for (const u of usersToSeed) {
      let uid = null;
      const found =
        await sql`SELECT id FROM auth_users WHERE email = ${u.email}`;
      if (found.length) {
        uid = found[0].id;
      } else {
        const created = await sql`
          INSERT INTO auth_users (name, email, timezone, typical_availability)
          VALUES (${u.name}, ${u.email}, ${"America/New_York"}, ${JSON.stringify({ typical: [{ days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "18:00", end: "21:00" }], timezone: "America/New_York" })}::jsonb)
          RETURNING id`;
        uid = created[0].id;
      }
      // Give each a simple credentials account with known password for testing
      const acct =
        await sql`SELECT id FROM auth_accounts WHERE "userId" = ${uid} AND provider = 'credentials'`;
      if (acct.length === 0) {
        const pw = await argon2.hash("password");
        await sql`INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password) VALUES (${uid}, 'credentials', 'credentials', ${uid}::text, ${pw})`;
      }
      // Seed media if none
      const media =
        await sql`SELECT id FROM profile_media WHERE user_id = ${uid} LIMIT 1`;
      if (media.length === 0) {
        await sql`INSERT INTO profile_media (user_id, type, url, sort_order) VALUES (${uid}, 'photo', ${"https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+1"}, 0)`;
        await sql`INSERT INTO profile_media (user_id, type, url, sort_order) VALUES (${uid}, 'photo', ${"https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+2"}, 1)`;
        await sql`INSERT INTO profile_media (user_id, type, url, sort_order) VALUES (${uid}, 'photo', ${"https://placehold.co/400x400/8A2BE2/FFFFFF?text=Photo+3"}, 2)`;
      }
      ids.push(uid);
    }

    const ua = Math.min(ids[0], ids[1]);
    const ub = Math.max(ids[0], ids[1]);

    // Ensure match exists
    let matchId = null;
    const match =
      await sql`SELECT id FROM matches WHERE user_a_id = ${ua} AND user_b_id = ${ub}`;
    if (match.length) {
      matchId = match[0].id;
    } else {
      const createdMatch =
        await sql`INSERT INTO matches (user_a_id, user_b_id) VALUES (${ua}, ${ub}) RETURNING id`;
      matchId = createdMatch[0].id;
    }

    // Ensure a future schedule proposal exists
    const existingProposal =
      await sql`SELECT id FROM schedule_proposals WHERE match_id = ${matchId} LIMIT 1`;
    if (existingProposal.length === 0) {
      // 24 hours from now, 20-minute window
      await sql`
        INSERT INTO schedule_proposals (match_id, proposer_id, proposed_start, proposed_end, status)
        VALUES (
          ${matchId},
          ${ua},
          now() + interval '1 day',
          now() + interval '1 day' + interval '20 minutes',
          'pending'
        )`;
    }

    return Response.json({
      ok: true,
      adminId: userId,
      userA: ids[0],
      userB: ids[1],
      matchId,
    });
  } catch (err) {
    console.error("POST /api/admin/seed error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
