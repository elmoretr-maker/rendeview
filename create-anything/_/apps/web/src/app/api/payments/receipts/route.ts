import { auth } from "@/auth";
import Stripe from "stripe";
import sql from "@/app/api/utils/sql";
import { logger } from "@/utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface UserRecord {
  email: string;
  stripe_id: string | null;
}

interface ChargeData {
  id: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  created: number;
  receipt_url: string | null;
  status: string;
}

interface SubscriptionData {
  id: string;
  status: string;
  created: number;
  cancel_at_period_end: boolean;
  current_period_end: number;
}

interface ReceiptsResponse {
  charges: ChargeData[];
  subscriptions: SubscriptionData[];
  customerEmailFallback?: boolean;
  error?: string;
}

export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn('Unauthorized receipts request');
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = session.user.id;
    const [user] = await sql<UserRecord[]>`SELECT email, stripe_id FROM auth_users WHERE id = ${uid}`;
    
    if (!user) {
      logger.error('User not found for receipts', { userId: uid });
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripe_id) {
      logger.info('No Stripe customer ID for receipts', { userId: uid });
      const response: ReceiptsResponse = { 
        charges: [], 
        subscriptions: [], 
        customerEmailFallback: !!user.email 
      };
      return Response.json(response);
    }

    logger.info('Fetching receipts and subscriptions', {
      userId: uid,
      stripeCustomerId: user.stripe_id,
    });

    const charges = await stripe.charges.list({
      customer: user.stripe_id,
      limit: 10,
    });

    const subs = await stripe.subscriptions.list({ 
      customer: user.stripe_id, 
      status: "all", 
      limit: 5 
    });

    const chargesData: ChargeData[] = (charges?.data || []).map((c) => ({
      id: c.id,
      amount_cents: c.amount,
      currency: c.currency,
      description: c.description,
      created: c.created,
      receipt_url: c.receipt_url,
      status: c.status,
    }));

    const subscriptionsData: SubscriptionData[] = (subs?.data || []).map((s) => ({
      id: s.id,
      status: s.status,
      created: s.created,
      cancel_at_period_end: s.cancel_at_period_end,
      current_period_end: (s.current_period_end as number),
    }));

    logger.info('Receipts fetched successfully', {
      userId: uid,
      chargeCount: chargesData.length,
      subscriptionCount: subscriptionsData.length,
    });

    const result: ReceiptsResponse = {
      charges: chargesData,
      subscriptions: subscriptionsData,
    };

    return Response.json(result);
  } catch (err: any) {
    logger.error('Receipts endpoint error', {
      error: err?.message || String(err),
      stack: err?.stack,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
