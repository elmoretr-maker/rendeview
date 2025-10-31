import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import Stripe from "stripe";
import { checkFeatureFlag, FeatureFlag } from "@/utils/featureFlags";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface DowngradeRequestBody {
  tier?: string;
}

interface UserRecord {
  membership_tier: string;
  stripe_id: string | null;
  email: string;
}

interface AdminSettings {
  pricing: {
    tiers?: Record<string, { price_cents: number; minutes: number }>;
  };
}

interface DowngradeResponse {
  success: boolean;
  message: string;
  scheduledTier: string;
  tierChangeAt: string | null;
  error?: string;
}

const VALID_TIERS = ["free", "casual", "dating", "business"] as const;
type ValidTier = typeof VALID_TIERS[number];

const TIER_RANKS: Record<ValidTier, number> = {
  free: 0,
  casual: 1,
  dating: 2,
  business: 3,
};

export async function POST(request: Request): Promise<Response> {
  try {
    const featureCheck = checkFeatureFlag(FeatureFlag.SCHEDULED_DOWNGRADES);
    if (featureCheck) {
      logger.warn('Scheduled downgrades feature is disabled', {
        feature: FeatureFlag.SCHEDULED_DOWNGRADES,
      });
      return featureCheck;
    }

    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized downgrade attempt');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const uid = session.user.id;
    const body: DowngradeRequestBody = await request.json();
    const { tier } = body || {};

    if (!tier) {
      logger.warn('Downgrade request missing tier', { userId: uid });
      return Response.json({ error: "Tier is required" }, { status: 400 });
    }

    const tierLower = String(tier).toLowerCase();
    
    if (!VALID_TIERS.includes(tierLower as ValidTier)) {
      logger.warn('Invalid tier provided for downgrade', { userId: uid, tier: tierLower });
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    const [currentUser] = await sql<UserRecord[]>`
      SELECT membership_tier, stripe_id, email FROM auth_users WHERE id = ${uid}
    `;

    if (!currentUser) {
      logger.error('User not found for downgrade', { userId: uid });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const currentRank = TIER_RANKS[currentUser.membership_tier as ValidTier] || 0;
    const newRank = TIER_RANKS[tierLower as ValidTier];

    if (newRank >= currentRank) {
      logger.warn('Attempted to downgrade to same or higher tier', {
        userId: uid,
        currentTier: currentUser.membership_tier,
        requestedTier: tierLower,
      });
      return Response.json({ 
        error: "Can only downgrade to a lower tier" 
      }, { status: 400 });
    }

    logger.info('Downgrade initiated', {
      userId: uid,
      fromTier: currentUser.membership_tier,
      toTier: tierLower,
    });

    let periodEndDate: Date | null = null;

    if (currentUser.stripe_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: currentUser.stripe_id,
          status: 'active',
          limit: 100,
        });

        if (subscriptions.data.length === 0) {
          logger.warn('No active subscription found for downgrade', {
            userId: uid,
            stripeId: currentUser.stripe_id,
          });
          return Response.json({ 
            error: "No active subscription found. Please upgrade through the subscription page instead." 
          }, { status: 400 });
        }

        const [settings] = await sql<AdminSettings[]>`SELECT pricing FROM admin_settings WHERE id = 1`;
        const pricing = settings?.pricing || {};
        
        for (const sub of subscriptions.data) {
          periodEndDate = new Date((sub.current_period_end as number) * 1000);
          
          if (tierLower === "free") {
            await stripe.subscriptions.update(sub.id, {
              cancel_at_period_end: true,
              metadata: { scheduled_tier: "free" }
            });
            logger.info('Scheduled subscription cancellation for free tier downgrade', {
              subscriptionId: sub.id,
              periodEnd: periodEndDate.toISOString(),
              userId: uid,
            });
          } else {
            const newAmount = pricing?.tiers?.[tierLower]?.price_cents;
            const newMinutes = pricing?.tiers?.[tierLower]?.minutes;
            
            if (!newAmount || !newMinutes) {
              logger.error('Invalid tier configuration', {
                tier: tierLower,
                userId: uid,
              });
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
                  start_date: (sub.current_period_start as number),
                  end_date: (sub.current_period_end as number)
                },
                {
                  items: [{
                    price_data: {
                      currency: 'usd',
                      product: sub.items.data[0].price.product as string,
                      recurring: { interval: 'month' },
                      unit_amount: newAmount
                    },
                    quantity: 1
                  }],
                  start_date: (sub.current_period_end as number),
                  metadata: { tier: tierLower }
                }
              ],
              metadata: { scheduled_tier: tierLower, user_id: String(uid) }
            });
            
            logger.info('Created subscription schedule for downgrade', {
              subscriptionId: sub.id,
              toTier: tierLower,
              periodEnd: periodEndDate.toISOString(),
              newAmount,
              userId: uid,
            });
          }
        }

        logger.business(BusinessEvent.SUBSCRIPTION_DOWNGRADED, {
          userId: uid,
          fromTier: currentUser.membership_tier,
          toTier: tierLower,
          effectiveDate: periodEndDate?.toISOString() || null,
        });
      } catch (stripeErr: any) {
        logger.error('Stripe downgrade operation failed', {
          userId: uid,
          error: stripeErr?.message || String(stripeErr),
          stack: stripeErr?.stack,
        });
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

    logger.info('Downgrade scheduled successfully', {
      userId: uid,
      scheduledTier: tierLower,
      tierChangeAt: periodEndDate?.toISOString() || null,
    });

    const response: DowngradeResponse = { 
      success: true, 
      message,
      scheduledTier: tierLower,
      tierChangeAt: periodEndDate ? periodEndDate.toISOString() : null
    };

    return Response.json(response);
  } catch (err: any) {
    logger.error('Downgrade endpoint error', {
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
