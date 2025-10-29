import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return Response.json({ error: "Missing email" }, { status: 400 });
    }

    const users = await sql`SELECT id, email FROM auth_users WHERE email = ${email} LIMIT 1`;
    if (!users?.length) {
      return Response.json({ exists: false, accounts: [] }, { status: 200 });
    }
    const user = users[0];

    const accounts = await sql`SELECT id, provider, type, "userId", (password IS NOT NULL) AS has_password FROM auth_accounts WHERE "userId" = ${user.id}`;

    return Response.json({ exists: true, userId: user.id, accounts });
  } catch (err) {
    console.error("GET /api/debug/credentials error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
