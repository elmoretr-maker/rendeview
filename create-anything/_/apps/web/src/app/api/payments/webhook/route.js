import Stripe from "stripe";
import sql from "@/app/api/utils/sql";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  // Stripe requires the raw body to validate the signature
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const mode = session.mode;
        const kind = session.metadata?.kind || null;
        const tier = session.metadata?.tier || null;
        const refUserId = session.client_reference_id || null;

        if (mode === "subscription") {
          if (customerId) {
            await sql`UPDATE auth_users SET subscription_status = 'active', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`;
          }
          // Fallback: if no customer on file, use client_reference_id to activate
          if (!customerId && refUserId) {
            await sql`UPDATE auth_users SET subscription_status = 'active', last_check_subscription_status_at = now() WHERE id = ${Number(refUserId)}`;
          }
          // Optionally set membership tier from metadata when provided
          if (refUserId && tier) {
            const v = tier.toLowerCase();
            if (["casual", "active", "dating", "business"].includes(v)) {
              await sql`UPDATE auth_users SET membership_tier = ${v} WHERE id = ${Number(refUserId)}`;
            }
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await sql`UPDATE auth_users SET subscription_status = 'past_due', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`;
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        if (customerId) {
          await sql`UPDATE auth_users SET subscription_status = 'canceled', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`;
        }
        break;
      }
      default:
        // No-op for unhandled events
        break;
    }
  } catch (err) {
    console.error("Error handling Stripe webhook", err);
    return Response.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}
