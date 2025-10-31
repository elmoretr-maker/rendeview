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

    const [currentUser] = await sql`
      SELECT scheduled_tier, tier_change_at, stripe_id 
      FROM auth_users 
      WHERE id = ${uid}
    `;

    if (!currentUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (!currentUser.scheduled_tier) {
      return Response.json({ 
        error: "No scheduled downgrade to cancel" 
      }, { status: 400 });
    }

    if (currentUser.stripe_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: currentUser.stripe_id,
          status: 'active',
          limit: 100,
        });

        for (const sub of subscriptions.data) {
          if (sub.cancel_at_period_end) {
            await stripe.subscriptions.update(sub.id, {
              cancel_at_period_end: false,
              metadata: { scheduled_tier: null }
            });
            console.log(`[CANCEL_DOWNGRADE] Removed cancellation for subscription ${sub.id}`);
          } else if (sub.metadata?.scheduled_tier) {
            await stripe.subscriptions.update(sub.id, {
              metadata: { scheduled_tier: null }
            });
            console.log(`[CANCEL_DOWNGRADE] Cleared scheduled tier metadata for subscription ${sub.id}`);
          }

          const schedules = await stripe.subscriptionSchedules.list({
            customer: currentUser.stripe_id,
            limit: 10,
          });

          for (const schedule of schedules.data) {
            if (schedule.status === 'active' && schedule.metadata?.scheduled_tier) {
              await stripe.subscriptionSchedules.release(schedule.id);
              console.log(`[CANCEL_DOWNGRADE] Released subscription schedule ${schedule.id}`);
            }
          }
        }
      } catch (stripeErr) {
        console.error("[CANCEL_DOWNGRADE] Stripe operation failed:", stripeErr?.message || stripeErr);
        return Response.json({ 
          error: "Failed to cancel downgrade with Stripe. Please try again or contact support." 
        }, { status: 500 });
      }
    }

    await sql`
      UPDATE auth_users 
      SET scheduled_tier = NULL,
          tier_change_at = NULL
      WHERE id = ${uid}
    `;

    console.log(`[CANCEL_DOWNGRADE] Successfully cancelled scheduled downgrade for user ${uid}`);

    return Response.json({ 
      success: true, 
      message: "Scheduled downgrade has been cancelled. You will continue on your current plan."
    });
  } catch (err) {
    console.error("POST /api/payments/cancel-downgrade error", err?.message || err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
