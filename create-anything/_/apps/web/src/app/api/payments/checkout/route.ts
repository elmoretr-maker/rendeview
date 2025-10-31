import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";
import { checkFeatureFlag, FeatureFlag } from "@/utils/featureFlags";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CheckoutRequestBody {
  kind?: 'subscription' | 'extension' | 'second-date';
  tier?: string;
  cents?: number;
  redirectURL?: string;
}

interface IdempotencyRecord {
  response_body: string | object;
  status_code?: number;
}

interface UserRecord {
  email: string;
  stripe_id: string | null;
}

interface AdminSettings {
  pricing: {
    tiers?: Record<string, { minutes: number; price_cents: number }>;
    second_date_cents?: number;
  };
}

export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Check feature flag
    const featureCheck = checkFeatureFlag(FeatureFlag.PAYMENT_CHECKOUT);
    if (featureCheck) {
      logger.warn('Payment checkout feature is disabled', {
        feature: FeatureFlag.PAYMENT_CHECKOUT,
      });
      return featureCheck;
    }

    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized checkout attempt');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const uid = session.user.id;
    const body: CheckoutRequestBody = await request.json();
    const { kind, tier, cents, redirectURL } = body;
    
    logger.info('Payment checkout initiated', {
      userId: uid,
      kind,
      tier,
      cents,
    });
    
    logger.business(BusinessEvent.PAYMENT_INITIATED, {
      userId: uid,
      kind,
      tier,
      amount: tier ? 
        (tier === 'casual' ? 999 : tier === 'dating' ? 2999 : tier === 'business' ? 4999 : 0) : 
        cents || 0,
    });

    // Idempotency key support for preventing duplicate charges
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      const [existing] = await sql<IdempotencyRecord[]>`
        SELECT response_body, status_code 
        FROM idempotency_keys 
        WHERE key = ${idempotencyKey} 
        AND user_id = ${uid}
        AND expires_at > NOW()
      `;
      
      if (existing?.response_body) {
        logger.info('Returning cached idempotent response', {
          userId: uid,
          idempotencyKey,
        });
        const cachedResponse = typeof existing.response_body === 'string' 
          ? JSON.parse(existing.response_body) 
          : existing.response_body;
        return Response.json(cachedResponse, { status: existing.status_code || 200 });
      }
    }

    // Ensure customer exists
    const [user] = await sql<UserRecord[]>`
      SELECT email, stripe_id FROM auth_users WHERE id = ${uid}
    `;
    
    if (!user?.email) {
      logger.error('User not found for checkout', { userId: uid });
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

    // Load pricing from admin settings
    const [settings] = await sql<AdminSettings[]>`
      SELECT pricing FROM admin_settings WHERE id = 1
    `;
    const pricing = settings?.pricing || {};

    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
    
    if (kind === "subscription") {
      const minutes = pricing?.tiers?.[tier!]?.minutes ?? null;
      const amount = pricing?.tiers?.[tier!]?.price_cents ?? null;
      
      if (!minutes || amount == null) {
        logger.error('Invalid subscription tier', { userId: uid, tier });
        return Response.json({ error: "Invalid tier" }, { status: 400 });
      }
      
      lineItem = {
        price_data: {
          currency: "usd",
          product_data: { name: `Rende-View ${tier} plan (${minutes} min)` },
          recurring: { interval: "month" },
          unit_amount: amount,
        },
        quantity: 1,
      };
    } else if (kind === "extension") {
      const allowed = [800];
      if (!allowed.includes(Number(cents))) {
        logger.error('Invalid extension amount', { userId: uid, cents });
        return Response.json(
          { error: "Invalid extension amount" },
          { status: 400 },
        );
      }
      
      lineItem = {
        price_data: {
          currency: "usd",
          product_data: { name: `Call Extension (10 minutes)` },
          unit_amount: Number(cents),
        },
        quantity: 1,
      };
    } else if (kind === "second-date") {
      const amount = pricing?.second_date_cents ?? 1000;
      lineItem = {
        price_data: {
          currency: "usd",
          product_data: { name: `Second Date Fee` },
          unit_amount: amount,
        },
        quantity: 1,
      };
    } else {
      logger.error('Invalid checkout kind', { userId: uid, kind });
      return Response.json({ error: "Invalid kind" }, { status: 400 });
    }

    const successUrl = redirectURL || process.env.APP_URL || "https://example.com";

    let checkout: Stripe.Checkout.Session;
    try {
      const base: Stripe.Checkout.SessionCreateParams = {
        line_items: [lineItem],
        mode: kind === "subscription" ? "subscription" : "payment",
        success_url: successUrl,
        cancel_url: successUrl,
        metadata: {
          kind: kind || "",
          tier: tier || "",
          cents: cents != null ? String(cents) : "",
          user_id: String(uid),
        },
        client_reference_id: String(uid),
      };
      
      if (stripeCustomerId) {
        checkout = await stripe.checkout.sessions.create({
          ...base,
          customer: stripeCustomerId,
        });
      } else {
        checkout = await stripe.checkout.sessions.create({
          ...base,
          customer_email: user.email,
        });
      }
      
      logger.info('Stripe checkout session created', {
        userId: uid,
        sessionId: checkout.id,
        amount: lineItem.price_data?.unit_amount,
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      logger.error('Stripe checkout creation failed', e, {
        userId: uid,
        kind,
        tier,
      });
      
      // Fallback: when the Stripe proxy returns HTML (common in certain dev environments)
      if (msg.includes("Unexpected token '<'")) {
        try {
          if (kind === "subscription" && tier) {
            const v = String(tier).toLowerCase();
            if (["casual", "dating", "business"].includes(v)) {
              await sql`
                UPDATE auth_users 
                SET membership_tier = ${v}, 
                    subscription_status = 'active', 
                    last_check_subscription_status_at = now() 
                WHERE id = ${uid}
              `;
              
              logger.warn('Fallback membership update applied', {
                userId: uid,
                tier: v,
              });
            }
          }
        } catch (e2: any) {
          logger.error('Fallback membership update failed', e2, { userId: uid });
        }
        return Response.json({ url: successUrl + "?mockStripe=1" });
      }
      
      // Development fallback
      if (process.env.ENV === "DEVELOPMENT") {
        try {
          if (kind === "subscription" && tier) {
            const v = String(tier).toLowerCase();
            if (["casual", "dating", "business"].includes(v)) {
              await sql`
                UPDATE auth_users 
                SET membership_tier = ${v}, 
                    subscription_status = 'active', 
                    last_check_subscription_status_at = now() 
                WHERE id = ${uid}
              `;
              
              logger.warn('Dev fallback membership update applied', {
                userId: uid,
                tier: v,
              });
            }
          }
        } catch (e2: any) {
          logger.error('Dev fallback membership update failed', e2, { userId: uid });
        }
        return Response.json({ url: successUrl + "?mockStripe=1" });
      }
      
      logger.business(BusinessEvent.PAYMENT_FAILED, {
        userId: uid,
        error: msg,
      });
      
      return Response.json({ error: msg || "Stripe error" }, { status: 500 });
    }

    const response = { url: checkout.url };
    
    // Store response with idempotency key if provided
    if (idempotencyKey) {
      try {
        await sql`
          INSERT INTO idempotency_keys (key, user_id, request_body, response_body, status_code)
          VALUES (${idempotencyKey}, ${uid}, ${JSON.stringify(body)}, ${JSON.stringify(response)}, ${200})
          ON CONFLICT (key) DO NOTHING
        `;
        logger.debug('Stored idempotency key', { userId: uid, idempotencyKey });
      } catch (idempErr: any) {
        logger.error('Failed to store idempotency key', idempErr, { userId: uid });
      }
    }
    
    const duration = Date.now() - startTime;
    logger.info('Payment checkout completed successfully', {
      userId: uid,
      duration,
      sessionId: checkout.id,
    });
    
    return Response.json(response);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error('POST /api/payments/checkout error', err, { duration });
    
    // Store error response with idempotency key if provided
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      try {
        const session = await auth();
        const uid = session?.user?.id;
        if (uid) {
          const errorResponse = { error: "Internal Server Error" };
          await sql`
            INSERT INTO idempotency_keys (key, user_id, request_body, response_body, status_code)
            VALUES (${idempotencyKey}, ${uid}, ${'{}'}, ${JSON.stringify(errorResponse)}, ${500})
            ON CONFLICT (key) DO NOTHING
          `;
        }
      } catch (idempErr: any) {
        logger.error('Failed to store error idempotency key', idempErr);
      }
    }
    
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
