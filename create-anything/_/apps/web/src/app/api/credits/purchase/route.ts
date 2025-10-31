import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";
import { MESSAGE_CREDIT_PRICING } from "@/utils/membershipTiers";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreditPurchaseRequest {
  pack: 'PACK_SMALL' | 'PACK_MEDIUM' | 'PACK_LARGE';
  redirectURL?: string;
}

interface UserRecord {
  email: string;
  stripe_id: string | null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized credit purchase attempt');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const uid = session.user.id;
    const body: CreditPurchaseRequest = await request.json();
    const { pack, redirectURL } = body;
    
    if (!MESSAGE_CREDIT_PRICING[pack]) {
      logger.error('Invalid credit pack', { userId: uid, pack });
      return Response.json({ error: "Invalid pack" }, { status: 400 });
    }
    
    const packInfo = MESSAGE_CREDIT_PRICING[pack];
    
    logger.info('Credit purchase initiated', {
      userId: uid,
      pack,
      credits: packInfo.credits,
      amount: packInfo.priceInCents,
    });
    
    logger.business(BusinessEvent.PAYMENT_INITIATED, {
      userId: uid,
      kind: 'message_credits',
      pack,
      amount: packInfo.priceInCents,
    });

    const [user] = await sql<UserRecord[]>`
      SELECT email, stripe_id FROM auth_users WHERE id = ${uid}
    `;
    
    if (!user?.email) {
      logger.error('User not found for credit purchase', { userId: uid });
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    
    let stripeCustomerId = user.stripe_id;
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({ email: user.email });
        stripeCustomerId = customer.id;
        await sql`UPDATE auth_users SET stripe_id = ${stripeCustomerId} WHERE id = ${uid}`;
        
        logger.info('Created Stripe customer', {
          userId: uid,
          stripeCustomerId,
        });
      } catch (e: any) {
        logger.warn('Stripe customer creation failed, proceeding with email', {
          userId: uid,
          error: e?.message,
        });
        stripeCustomerId = null;
      }
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "usd",
        product_data: { 
          name: `${packInfo.credits} Message Credits${packInfo.label ? ` (${packInfo.label})` : ''}`,
          description: `Add ${packInfo.credits} messages to your account`
        },
        unit_amount: packInfo.priceInCents,
      },
      quantity: 1,
    };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [lineItem],
      success_url: redirectURL || `${process.env.AUTH_URL}/settings/subscription?credits_success=true`,
      cancel_url: redirectURL || `${process.env.AUTH_URL}/settings/subscription?credits_cancelled=true`,
      metadata: {
        user_id: String(uid),
        kind: "message_credits",
        pack: pack,
        credits: String(packInfo.credits),
      },
    };
    
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else {
      sessionParams.customer_email = user.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
    
    logger.info('Credit purchase checkout session created', {
      userId: uid,
      sessionId: checkoutSession.id,
      pack,
    });
    
    logger.business(BusinessEvent.PAYMENT_INITIATED, {
      userId: uid,
      kind: 'message_credits',
      sessionId: checkoutSession.id,
      amount: packInfo.priceInCents,
    });

    return Response.json({ url: checkoutSession.url });
  } catch (err: any) {
    logger.error('Credit purchase error', {
      error: err?.message,
      stack: err?.stack,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
