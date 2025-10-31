import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface PortalRequestBody {
  redirectURL?: string;
}

interface UserRecord {
  email: string;
  stripe_id: string | null;
}

interface PortalResponse {
  url: string;
  error?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized billing portal attempt');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const uid = session.user.id;
    const body: PortalRequestBody = await request.json().catch(() => ({}));
    const { redirectURL } = body;

    const [user] = await sql<UserRecord[]>`SELECT email, stripe_id FROM auth_users WHERE id = ${uid}`;
    
    if (!user) {
      logger.error('User not found for billing portal', { userId: uid });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = user.stripe_id;
    
    if (!stripeCustomerId) {
      if (!user.email) {
        logger.warn('User has no email for customer creation', { userId: uid });
        return Response.json({ error: "No email for user" }, { status: 400 });
      }
      
      logger.info('Creating Stripe customer for billing portal access', {
        userId: uid,
        email: user.email,
      });
      
      const customer = await stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
      
      await sql`UPDATE auth_users SET stripe_id = ${stripeCustomerId} WHERE id = ${uid}`;
      
      logger.business(BusinessEvent.PAYMENT_INITIATED, {
        userId: uid,
        kind: 'customer_created',
        stripeCustomerId,
      });
    }

    const returnUrl = redirectURL || (process.env.APP_URL ? `${process.env.APP_URL}/account/billing` : "https://example.com");

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    logger.info('Billing portal session created', {
      userId: uid,
      stripeCustomerId,
      returnUrl,
    });

    logger.business(BusinessEvent.SUBSCRIPTION_VIEWED, {
      userId: uid,
      action: 'billing_portal_accessed',
    });

    const response: PortalResponse = { url: portal.url };
    return Response.json(response);
  } catch (err: any) {
    logger.error('Billing portal endpoint error', {
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
