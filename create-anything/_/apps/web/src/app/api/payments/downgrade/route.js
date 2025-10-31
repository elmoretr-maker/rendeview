import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const body = await request.json();
    const { tier } = body || {};

    if (!tier) {
      return Response.json({ error: "Tier is required" }, { status: 400 });
    }

    const validTiers = ["free", "casual", "dating", "business"];
    const tierLower = String(tier).toLowerCase();
    
    if (!validTiers.includes(tierLower)) {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    const [currentUser] = await sql`
      SELECT membership_tier, stripe_id, email FROM auth_users WHERE id = ${uid}
    `;

    if (!currentUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const tierRanks = { free: 0, casual: 1, dating: 2, business: 3 };
    const currentRank = tierRanks[currentUser.membership_tier] || 0;
    const newRank = tierRanks[tierLower];

    if (newRank >= currentRank) {
      return Response.json({ 
        error: "Can only downgrade to a lower tier" 
      }, { status: 400 });
    }

    if (currentUser.stripe_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: currentUser.stripe_id,
          status: 'active',
          limit: 100,
        });

        if (subscriptions.data.length === 0 && tierLower !== "free") {
          return Response.json({ 
            error: "No active subscription found. Please upgrade through the subscription page instead." 
          }, { status: 400 });
        }

        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id, {
            prorate: true,
            invoice_now: true
          });
          console.log(`[DOWNGRADE] Cancelled Stripe subscription ${sub.id} for user ${uid} (with prorated refund)`);
        }
      } catch (stripeErr) {
        console.error("[DOWNGRADE] Stripe operation failed:", stripeErr?.message || stripeErr);
        return Response.json({ 
          error: "Failed to cancel subscription with Stripe. Please try again or contact support." 
        }, { status: 500 });
      }
    }

    await sql`
      UPDATE auth_users 
      SET membership_tier = 'free',
          subscription_status = 'inactive',
          last_check_subscription_status_at = now()
      WHERE id = ${uid}
    `;

    const tierName = tierLower.charAt(0).toUpperCase() + tierLower.slice(1);
    const message = tierLower === "free" 
      ? `Successfully downgraded to Free tier. Your subscription has been cancelled with a prorated refund.`
      : `Your subscription has been cancelled with a prorated refund. You are now on the Free tier. To access ${tierName} tier features, please click "Upgrade to ${tierName}" to subscribe.`;

    return Response.json({ 
      success: true, 
      message,
      tier: "free"
    });
  } catch (err) {
    console.error("POST /api/payments/downgrade error", err?.message || err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
