import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import Stripe from "stripe";
import { checkFeatureFlag, FeatureFlag } from "@/utils/featureFlags";
import { logger, BusinessEvent } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface UserRecord {
  scheduled_tier: string | null;
  tier_change_at: string | null;
  stripe_id: string | null;
}

interface CancelDowngradeResponse {
  success: boolean;
  message: string;
  error?: string;
}

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
      logger.warn('Unauthorized cancel downgrade attempt');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const uid = session.user.id;

    const [currentUser] = await sql<UserRecord[]>`
      SELECT scheduled_tier, tier_change_at, stripe_id 
      FROM auth_users 
      WHERE id = ${uid}
    `;

    if (!currentUser) {
      logger.error('User not found for cancel downgrade', { userId: uid });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (!currentUser.scheduled_tier) {
      logger.warn('No scheduled downgrade to cancel', { userId: uid });
      return Response.json({ 
        error: "No scheduled downgrade to cancel" 
      }, { status: 400 });
    }

    logger.info('Cancel downgrade initiated', {
      userId: uid,
      scheduledTier: currentUser.scheduled_tier,
      tierChangeAt: currentUser.tier_change_at,
    });

    if (currentUser.stripe_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: currentUser.stripe_id,
          status: 'active',
          limit: 100,
        });

        let cancelledCount = 0;
        let clearedMetadataCount = 0;
        let releasedScheduleCount = 0;

        for (const sub of subscriptions.data) {
          if (sub.cancel_at_period_end) {
            await stripe.subscriptions.update(sub.id, {
              cancel_at_period_end: false,
              metadata: { scheduled_tier: '' }
            });
            logger.info('Removed subscription cancellation', {
              subscriptionId: sub.id,
              userId: uid,
            });
            cancelledCount++;
          } else if (sub.metadata?.scheduled_tier) {
            await stripe.subscriptions.update(sub.id, {
              metadata: { scheduled_tier: '' }
            });
            logger.info('Cleared scheduled tier metadata', {
              subscriptionId: sub.id,
              userId: uid,
            });
            clearedMetadataCount++;
          }

          const schedules = await stripe.subscriptionSchedules.list({
            customer: currentUser.stripe_id!,
            limit: 10,
          });

          for (const schedule of schedules.data) {
            if (schedule.status === 'active' && schedule.metadata?.scheduled_tier) {
              await stripe.subscriptionSchedules.release(schedule.id);
              logger.info('Released subscription schedule', {
                scheduleId: schedule.id,
                userId: uid,
              });
              releasedScheduleCount++;
            }
          }
        }

        logger.business(BusinessEvent.SUBSCRIPTION_CANCELLED, {
          userId: uid,
          reason: 'downgrade_cancelled',
          details: {
            cancelledSubscriptions: cancelledCount,
            clearedMetadata: clearedMetadataCount,
            releasedSchedules: releasedScheduleCount,
          },
        });
      } catch (stripeErr: any) {
        logger.error('Stripe cancel downgrade operation failed', {
          userId: uid,
          error: stripeErr?.message || String(stripeErr),
        });
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

    logger.business(BusinessEvent.SUBSCRIPTION_UPDATED, {
      userId: uid,
      action: 'cancel_scheduled_downgrade',
      previousScheduledTier: currentUser.scheduled_tier,
    });

    logger.info('Successfully cancelled scheduled downgrade', { userId: uid });

    const response: CancelDowngradeResponse = { 
      success: true, 
      message: "Scheduled downgrade has been cancelled. You will continue on your current plan."
    };

    return Response.json(response);
  } catch (err: any) {
    logger.error('Cancel downgrade endpoint error', {
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
