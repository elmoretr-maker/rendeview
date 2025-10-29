import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = session.user.id;
    const [user] = await sql`SELECT email, stripe_id FROM auth_users WHERE id = ${uid}`;
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // If no customer yet, return empty list gracefully
    if (!user.stripe_id) {
      return Response.json({ charges: [], subscriptions: [], customerEmailFallback: !!user.email });
    }

    // List most recent successful charges to get receipt URLs
    const charges = await stripe.charges.list({
      customer: user.stripe_id,
      limit: 10,
    });

    // Also surface active subscription status from DB (source of truth for app gating)
    const subs = await stripe.subscriptions.list({ customer: user.stripe_id, status: "all", limit: 5 });

    const result = {
      charges: (charges?.data || []).map((c) => ({
        id: c.id,
        amount_cents: c.amount,
        currency: c.currency,
        description: c.description,
        created: c.created,
        receipt_url: c.receipt_url,
        status: c.status,
      })),
      subscriptions: (subs?.data || []).map((s) => ({
        id: s.id,
        status: s.status,
        created: s.created,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: s.current_period_end,
      })),
    };

    return Response.json(result);
  } catch (err) {
    console.error("GET /api/payments/receipts error", err?.message || err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
