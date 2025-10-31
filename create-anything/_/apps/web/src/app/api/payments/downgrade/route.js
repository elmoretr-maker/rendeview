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

    let periodEndDate = null;

    if (currentUser.stripe_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: currentUser.stripe_id,
          status: 'active',
          limit: 100,
        });

        if (subscriptions.data.length === 0) {
          return Response.json({ 
            error: "No active subscription found. Please upgrade through the subscription page instead." 
          }, { status: 400 });
        }

        const [settings] = await sql`SELECT pricing FROM admin_settings WHERE id = 1`;
        const pricing = settings?.pricing || {};
        
        for (const sub of subscriptions.data) {
          periodEndDate = new Date(sub.current_period_end * 1000);
          
          if (tierLower === "free") {
            await stripe.subscriptions.update(sub.id, {
              cancel_at_period_end: true,
              metadata: { scheduled_tier: "free" }
            });
            console.log(`[DOWNGRADE] Scheduled cancellation for subscription ${sub.id} at period end: ${periodEndDate}`);
          } else {
            const newAmount = pricing?.tiers?.[tierLower]?.price_cents;
            const newMinutes = pricing?.tiers?.[tierLower]?.minutes;
            
            if (!newAmount || !newMinutes) {
              throw new Error(`Invalid tier configuration for ${tierLower}`);
            }

            await stripe.subscriptions.update(sub.id, {
              metadata: { scheduled_tier: tierLower }
            });
            
            await stripe.subscriptionSchedules.create({
              from_subscription: sub.id,
              end_behavior: 'release',
              phases: [
                {
                  items: sub.items.data.map(item => ({
                    price: item.price.id,
                    quantity: item.quantity
                  })),
                  start_date: sub.current_period_start,
                  end_date: sub.current_period_end
                },
                {
                  items: [{
                    price_data: {
                      currency: 'usd',
                      product: sub.items.data[0].price.product,
                      recurring: { interval: 'month' },
                      unit_amount: newAmount
                    },
                    quantity: 1
                  }],
                  start_date: sub.current_period_end,
                  metadata: { tier: tierLower }
                }
              ],
              metadata: { scheduled_tier: tierLower, user_id: uid }
            });
            console.log(`[DOWNGRADE] Created subscription schedule for ${sub.id} to change to ${tierLower} at ${periodEndDate}`);
          }
        }
      } catch (stripeErr) {
        console.error("[DOWNGRADE] Stripe operation failed:", stripeErr?.message || stripeErr);
        return Response.json({ 
          error: "Failed to schedule downgrade with Stripe. Please try again or contact support." 
        }, { status: 500 });
      }
    }

    await sql`
      UPDATE auth_users 
      SET scheduled_tier = ${tierLower},
          tier_change_at = ${periodEndDate ? periodEndDate.toISOString() : null}
      WHERE id = ${uid}
    `;

    const tierName = tierLower.charAt(0).toUpperCase() + tierLower.slice(1);
    const currentTierName = currentUser.membership_tier.charAt(0).toUpperCase() + currentUser.membership_tier.slice(1);
    const formattedDate = periodEndDate ? periodEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of your billing cycle';
    
    const message = `Your downgrade is scheduled. You retain your current ${currentTierName} benefits until ${formattedDate}.`;

    return Response.json({ 
      success: true, 
      message,
      scheduledTier: tierLower,
      tierChangeAt: periodEndDate ? periodEndDate.toISOString() : null
    });
  } catch (err) {
    console.error("POST /api/payments/downgrade error", err?.message || err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
