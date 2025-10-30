import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function PUT(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = context.params.id;
    const extId = context.params.extId;

    if (!sessionId || !extId) {
      return Response.json(
        { error: "Session ID and Extension ID required" },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { action } = body;

    if (!["accept", "decline"].includes(action)) {
      return Response.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const [extension] = await sql`
      SELECT *
      FROM video_session_extensions
      WHERE id = ${extId} AND video_session_id = ${sessionId}
    `;

    if (!extension) {
      return Response.json({ error: "Extension not found" }, { status: 404 });
    }

    if (extension.responder_id !== userId) {
      return Response.json(
        { error: "Only the responder can accept/decline" },
        { status: 403 }
      );
    }

    if (extension.status !== "pending_acceptance") {
      return Response.json(
        { error: "Extension is no longer pending" },
        { status: 409 }
      );
    }

    if (extension.expires_at && new Date(extension.expires_at) < new Date()) {
      await sql`
        UPDATE video_session_extensions
        SET status = 'expired'
        WHERE id = ${extId}
      `;
      return Response.json({ error: "Extension request expired" }, { status: 410 });
    }

    if (action === "decline") {
      await sql`
        UPDATE video_session_extensions
        SET status = 'declined', updated_at = NOW()
        WHERE id = ${extId}
      `;

      return Response.json({
        extension: {
          id: extId,
          status: "declined",
        },
      });
    }

    const [user] = await sql`
      SELECT email, stripe_id
      FROM auth_users
      WHERE id = ${extension.initiator_id}
    `;

    if (!user) {
      return Response.json({ error: "Initiator not found" }, { status: 404 });
    }

    let customerId = user.stripe_id;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({ email: user.email });
        customerId = customer.id;
        await sql`
          UPDATE auth_users
          SET stripe_id = ${customerId}
          WHERE id = ${extension.initiator_id}
        `;
      } catch (e) {
        console.error("Failed to create Stripe customer:", e);
      }
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: extension.amount_cents,
        currency: "usd",
        customer: customerId || undefined,
        metadata: {
          extensionId: extId,
          videoSessionId: sessionId,
          initiatorId: extension.initiator_id,
        },
        description: `Video call extension - 10 minutes`,
      });

      await sql`
        UPDATE video_session_extensions
        SET 
          status = 'awaiting_payment',
          stripe_payment_intent_id = ${paymentIntent.id},
          updated_at = NOW()
        WHERE id = ${extId}
      `;

      return Response.json({
        extension: {
          id: extId,
          status: "awaiting_payment",
          paymentIntentClientSecret: paymentIntent.client_secret,
        },
      });
    } catch (e) {
      console.error("Stripe PaymentIntent creation failed:", e);

      await sql`
        UPDATE video_session_extensions
        SET status = 'payment_failed', updated_at = NOW()
        WHERE id = ${extId}
      `;

      return Response.json(
        { error: "Payment processing failed" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("/api/video/sessions/[id]/extensions/[extId] PUT error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
