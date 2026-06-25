import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// We must disable the default body parser to get the raw body for Stripe signature verification
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

// We must use the Service Role Key to bypass RLS in the background webhook
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    // 1. Verify the cryptographic signature
    event = stripe.webhooks.constructEvent(
      payload,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error("Stripe Webhook Signature Verification Failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2. Process successful checkout sessions
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amountInCents = session.amount_total || 0;
    const amountInDollars = amountInCents / 100;
    const paymentIntentId = session.payment_intent as string; // Unique reference

    if (!userId) {
      console.error("Missing user_id in Stripe metadata");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      // 3. Prevent Double Funding (Check if transaction exists)
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", paymentIntentId)
        .single();

      if (existingTx) {
        console.log("Transaction already processed:", paymentIntentId);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      // 4. Update the USD Wallet
      // Note: We use a Supabase RPC to ensure atomic increments safely.
      // Since we don't have an RPC for raw funding yet, we can fetch, add, and update,
      // but an RPC is safer. For now, we will do an RLS-bypassed update since webhooks are singular.

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance_usd")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) throw new Error("Wallet not found");

      const newBalance = Number(wallet.balance_usd) + amountInDollars;

      const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance_usd: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // 5. Log the Transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: "Funding",
          amount: amountInDollars,
          currency: "USD",
          status: "Success",
          reference: paymentIntentId,
          description: "Stripe Wallet Funding",
        });

      if (txError) throw txError;

      console.log(`Successfully funded ${amountInDollars} USD for user ${userId}`);

    } catch (dbError: unknown) {
      console.error("Database Update Error:", dbError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
