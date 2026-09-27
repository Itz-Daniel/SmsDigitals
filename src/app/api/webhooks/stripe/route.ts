import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// We must disable the default body parser to get the raw body for Stripe signature verification
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

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
      const supabase = createAdminClient();
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

      // 4. Update the Unified Master Wallet (NGN)
      const { data: appSettings } = await supabase
        .from('settings')
        .select('exchange_rate')
        .eq('id', 1)
        .single();
      const exchangeRate = appSettings?.exchange_rate || 1500;
      const amountInNgn = Math.round(amountInDollars * exchangeRate);

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance_ngn, balance_usd, lifetime_deposits_usd")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) throw new Error("Wallet not found");

      const newNgnBalance = (Number(wallet.balance_ngn) || 0) + amountInNgn;
      const newLifetimeDeposits = (Number(wallet.lifetime_deposits_usd) || 0) + amountInDollars;

      const { error: updateError } = await supabase
        .from("wallets")
        .update({ 
          balance_ngn: newNgnBalance, 
          balance_usd: 0,
          lifetime_deposits_usd: newLifetimeDeposits,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // 5. Log the Transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: "Funding",
          amount: amountInNgn,
          currency: "NGN",
          status: "Success",
          reference: paymentIntentId,
          description: `Stripe Wallet Funding ($${amountInDollars.toFixed(2)} USD / ₦${amountInNgn.toLocaleString()})`,
        });

      if (txError) throw txError;

      console.log(`Successfully funded $${amountInDollars} USD (₦${amountInNgn}) for user ${userId}`);

    } catch (dbError: unknown) {
      console.error("Database Update Error:", dbError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
