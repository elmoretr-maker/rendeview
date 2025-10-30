import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request, context) {
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
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return Response.json(
        { error: "Payment Intent ID required" },
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

    if (extension.initiator_id !== userId) {
      return Response.json(
        { error: "Only the initiator can confirm payment" },
        { status: 403 }
      );
    }

    if (extension.status !== "awaiting_payment") {
      return Response.json(
        { error: "Extension is not awaiting payment" },
        { status: 409 }
      );
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      console.error("Failed to retrieve PaymentIntent:", e);
      return Response.json(
        { error: "Invalid Payment Intent" },
        { status: 400 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      await sql`
        UPDATE video_session_extensions
        SET status = 'payment_failed', updated_at = NOW()
        WHERE id = ${extId}
      `;

      return Response.json(
        { error: "Payment has not succeeded yet" },
        { status: 402 }
      );
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE video_sessions
        SET extended_seconds_total = extended_seconds_total + ${extension.extension_seconds}
        WHERE id = ${sessionId}
      `;

      await tx`
        UPDATE video_session_extensions
        SET status = 'completed', updated_at = NOW()
        WHERE id = ${extId}
      `;
    });

    const [updatedSession] = await sql`
      SELECT 
        base_duration_seconds,
        extended_seconds_total,
        started_at
      FROM video_sessions
      WHERE id = ${sessionId}
    `;

    return Response.json({
      success: true,
      extension: {
        id: extId,
        status: "completed",
        extensionSeconds: extension.extension_seconds,
      },
      session: {
        totalDurationSeconds:
          (updatedSession.base_duration_seconds || 0) +
          (updatedSession.extended_seconds_total || 0),
        extendedSecondsTotal: updatedSession.extended_seconds_total,
      },
    });
  } catch (err) {
    console.error("/api/video/sessions/[id]/extensions/[extId]/confirm POST error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
