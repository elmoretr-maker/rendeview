import Stripe from "stripe";
import sql from "@/app/api/utils/sql";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface UserRecord {
  scheduled_tier: string | null;
  tier_change_at: string | null;
}

interface WebhookEventLog {
  event_id: string;
  event_type: string;
  signature_valid: boolean;
  processing_success: boolean;
  error_message?: string;
  request_id: string;
  source_ip: string;
}

type StripeCustomerId = string;
type SubscriptionId = string;

export async function POST(request: Request): Promise<Response> {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);
  const sourceIp = request.headers.get("x-forwarded-for") || "unknown";
  
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    logger.error('Webhook signature missing - potential unauthorized attempt', {
      sourceIp,
      requestId,
    });
    
    try {
      await sql`
        INSERT INTO webhook_events (event_id, event_type, signature_valid, processing_success, error_message, request_id, source_ip)
        VALUES (${'unknown-' + requestId}, ${'signature_missing'}, ${false}, ${false}, ${'Missing signature header'}, ${requestId}, ${sourceIp})
      `;
    } catch (logErr: any) {
      logger.error('Failed to log webhook security event', {
        error: logErr?.message || String(logErr),
      });
    }
    
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured - Webhook processing disabled');
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  let rawBody = "";
  
  try {
    rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    
    logger.info('Webhook signature verified', {
      eventType: event.type,
      eventId: event.id,
      requestId,
    });
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    
    logger.error('Webhook signature verification failed', {
      sourceIp,
      requestId,
      error: errorMessage,
      signaturePrefix: sig?.substring(0, 50),
      bodyLength: rawBody?.length || 0,
    });
    
    if (errorMessage.includes("timestamp")) {
      logger.warn('Webhook timestamp mismatch - possible replay attack or clock skew', {
        requestId,
        sourceIp,
      });
    }
    
    try {
      await sql`
        INSERT INTO webhook_events (event_id, event_type, signature_valid, processing_success, error_message, request_id, source_ip)
        VALUES (${'unknown-' + requestId}, ${'signature_failed'}, ${false}, ${false}, ${errorMessage}, ${requestId}, ${sourceIp})
      `;
    } catch (logErr: any) {
      logger.error('Failed to log webhook security event', {
        error: logErr?.message || String(logErr),
      });
    }
    
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    logger.info('Processing webhook event', {
      eventType: event.type,
      eventId: event.id,
      requestId,
    });
    
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as StripeCustomerId | null;
        const mode = session.mode;
        const kind = session.metadata?.kind || null;
        const tier = session.metadata?.tier || null;
        const refUserId = session.client_reference_id || null;

        if (mode === "subscription") {
          const queries = [];
          
          if (customerId) {
            queries.push(sql`UPDATE auth_users SET subscription_status = 'active', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`);
          }
          
          if (!customerId && refUserId) {
            queries.push(sql`UPDATE auth_users SET subscription_status = 'active', last_check_subscription_status_at = now() WHERE id = ${Number(refUserId)}`);
          }
          
          if (refUserId && tier) {
            const v = tier.toLowerCase();
            if (["casual", "dating", "business"].includes(v)) {
              queries.push(sql`UPDATE auth_users SET membership_tier = ${v} WHERE id = ${Number(refUserId)}`);
            }
          }

          if (queries.length > 0) {
            await sql.transaction(queries);
          }

          logger.business(BusinessEvent.SUBSCRIPTION_CREATED, {
            userId: refUserId ? Number(refUserId) : null,
            tier,
            kind,
            stripeCustomerId: customerId,
          });
        } else if (mode === "payment" && kind === "message_credits") {
          const userId = session.metadata?.user_id;
          const credits = session.metadata?.credits;
          
          if (userId && credits) {
            const creditsInt = parseInt(credits, 10);
            
            await sql.transaction([
              sql`
                INSERT INTO user_message_credits (user_id, credits_remaining, total_purchased)
                VALUES (${Number(userId)}, ${creditsInt}, ${creditsInt})
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                  credits_remaining = COALESCE(user_message_credits.credits_remaining, 0) + ${creditsInt},
                  total_purchased = COALESCE(user_message_credits.total_purchased, 0) + ${creditsInt},
                  updated_at = NOW()
              `
            ]);
            
            logger.business(BusinessEvent.PAYMENT_SUCCEEDED, {
              userId: Number(userId),
              kind: 'message_credits',
              credits: creditsInt,
              amount: session.amount_total,
            });
            
            logger.info('Message credits added successfully', {
              userId: Number(userId),
              creditsAdded: creditsInt,
              sessionId: session.id,
            });
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as StripeCustomerId;
        const subscriptionId = (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id) as SubscriptionId | null;
        
        if (customerId && subscriptionId && invoice.billing_reason === 'subscription_cycle') {
          const [user] = await sql<UserRecord[]>`SELECT scheduled_tier, tier_change_at FROM auth_users WHERE stripe_id = ${customerId}`;
          
          if (user?.scheduled_tier) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const scheduledTier = subscription.metadata?.scheduled_tier || user.scheduled_tier;
            
            if (scheduledTier && scheduledTier !== 'free') {
              const tierName = scheduledTier.toLowerCase();
              if (['casual', 'dating', 'business'].includes(tierName)) {
                await sql.transaction([
                  sql`
                    UPDATE auth_users 
                    SET membership_tier = ${tierName},
                        scheduled_tier = NULL,
                        tier_change_at = NULL,
                        subscription_status = 'active',
                        last_check_subscription_status_at = now()
                    WHERE stripe_id = ${customerId}
                  `
                ]);
                
                await stripe.subscriptions.update(subscriptionId, {
                  metadata: { scheduled_tier: '' }
                });
                
                logger.business(BusinessEvent.SUBSCRIPTION_DOWNGRADED, {
                  stripeCustomerId: customerId,
                  toTier: tierName,
                  triggeredBy: 'renewal',
                });
                
                logger.info('Finalized scheduled downgrade on renewal', {
                  tier: tierName,
                  customerId,
                  subscriptionId,
                });
              }
            }
          }
        }
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as StripeCustomerId;
        if (customerId) {
          await sql.transaction([
            sql`UPDATE auth_users SET subscription_status = 'past_due', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`
          ]);
          
          logger.warn('Invoice payment failed', {
            customerId,
            invoiceId: invoice.id,
            amount: invoice.amount_due,
          });
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as StripeCustomerId;
        if (customerId) {
          const scheduledTier = subscription.metadata?.scheduled_tier;
          
          if (scheduledTier === "free") {
            await sql.transaction([
              sql`
                UPDATE auth_users 
                SET subscription_status = 'canceled', 
                    membership_tier = 'free',
                    scheduled_tier = NULL,
                    tier_change_at = NULL,
                    last_check_subscription_status_at = now() 
                WHERE stripe_id = ${customerId}
              `
            ]);
            
            logger.business(BusinessEvent.SUBSCRIPTION_CANCELLED, {
              stripeCustomerId: customerId,
              reason: 'downgrade_to_free',
            });
            
            logger.info('Finalized downgrade to free tier', { customerId });
          } else {
            await sql.transaction([
              sql`UPDATE auth_users SET subscription_status = 'canceled', last_check_subscription_status_at = now() WHERE stripe_id = ${customerId}`
            ]);
            
            logger.business(BusinessEvent.SUBSCRIPTION_CANCELLED, {
              stripeCustomerId: customerId,
              reason: 'subscription_deleted',
            });
          }
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as StripeCustomerId;
        const scheduledTier = subscription.metadata?.scheduled_tier;
        
        if (customerId && subscription.status === 'active') {
          const [user] = await sql<UserRecord[]>`SELECT scheduled_tier FROM auth_users WHERE stripe_id = ${customerId}`;
          
          if (user?.scheduled_tier && scheduledTier && scheduledTier !== 'free') {
            const tierName = scheduledTier.toLowerCase();
            if (['casual', 'dating', 'business'].includes(tierName)) {
              await sql.transaction([
                sql`
                  UPDATE auth_users 
                  SET membership_tier = ${tierName},
                      scheduled_tier = NULL,
                      tier_change_at = NULL,
                      subscription_status = 'active',
                      last_check_subscription_status_at = now()
                  WHERE stripe_id = ${customerId}
                `
              ]);
              
              logger.business(BusinessEvent.SUBSCRIPTION_UPDATED, {
                stripeCustomerId: customerId,
                action: 'scheduled_downgrade_applied',
                tier: tierName,
              });
              
              logger.info('Finalized scheduled downgrade', {
                tier: tierName,
                customerId,
              });
            }
          }
        }
        break;
      }
      
      default:
        logger.info('Unhandled webhook event type - no action taken', {
          eventType: event.type,
          requestId,
        });
        break;
    }
    
    logger.info('Webhook event processed successfully', {
      eventType: event.type,
      eventId: event.id,
      requestId,
    });
    
    try {
      await sql`
        INSERT INTO webhook_events (event_id, event_type, signature_valid, processing_success, request_id, source_ip)
        VALUES (${event.id}, ${event.type}, ${true}, ${true}, ${requestId}, ${sourceIp})
        ON CONFLICT (event_id) DO UPDATE SET processing_success = true
      `;
    } catch (logErr: any) {
      logger.error('Failed to log successful webhook event', {
        error: logErr?.message || String(logErr),
      });
    }
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const errorStack = err?.stack || "";
    
    logger.error('Webhook processing error', {
      eventType: event?.type || "unknown",
      eventId: event?.id || "unknown",
      error: errorMessage,
      stack: errorStack,
      requestId,
    });
    
    if (errorMessage.includes("database") || errorMessage.includes("sql")) {
      logger.error('Database error during webhook processing - check connectivity and schema', {
        requestId,
      });
    }
    
    try {
      await sql`
        INSERT INTO webhook_events (event_id, event_type, signature_valid, processing_success, error_message, request_id, source_ip)
        VALUES (${event?.id || 'unknown-' + requestId}, ${event?.type || 'unknown'}, ${true}, ${false}, ${errorMessage}, ${requestId}, ${sourceIp})
        ON CONFLICT (event_id) DO UPDATE SET processing_success = false, error_message = ${errorMessage}
      `;
    } catch (logErr: any) {
      logger.error('Failed to log webhook error event', {
        error: logErr?.message || String(logErr),
      });
    }
    
    return Response.json({ error: "Webhook handler error" }, { status: 500 });
  }

  logger.info('Webhook processed and acknowledged', { requestId });
  return Response.json({ received: true });
}
