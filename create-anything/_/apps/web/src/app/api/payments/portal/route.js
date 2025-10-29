import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = session.user.id;
    const { redirectURL } = await request.json().catch(() => ({}));

    const [user] = await sql`SELECT email, stripe_id FROM auth_users WHERE id = ${uid}`;
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = user.stripe_id;
    if (!stripeCustomerId) {
      if (!user.email) {
        return Response.json({ error: "No email for user" }, { status: 400 });
      }
      // Create a customer if one doesn't exist so the user can access the portal
      const customer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
      await sql`UPDATE auth_users SET stripe_id = ${stripeCustomerId} WHERE id = ${uid}`;
    }

    const returnUrl = redirectURL || (process.env.APP_URL ? `${process.env.APP_URL}/account/billing` : "https://example.com");

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return Response.json({ url: portal.url });
  } catch (err) {
    console.error("POST /api/payments/portal error", err?.message || err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
