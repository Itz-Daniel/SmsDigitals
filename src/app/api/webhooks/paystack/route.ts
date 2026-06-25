import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Ensure raw body processing
export const dynamic = "force-dynamic";

// Service Role Key for bypassing RLS securely in background webhooks
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
    }

    // 1. Verify the cryptographic signature (HMAC SHA512)
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Paystack Webhook Signature Verification Failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 2. Parse the verified payload
    const event = JSON.parse(rawBody);

    // 3. Process successful payments
    if (event.event === "charge.success") {
      const { reference, amount, metadata } = event.data;
      const amountInNgn = amount / 100; // Paystack sends amounts in kobo
      const userId = metadata?.user_id;

      if (!userId) {
        console.error("Missing user_id in Paystack metadata");
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      // 4. Atomic Wallet Credit & Transaction Logging
      const { data: creditResult, error: creditError } = await supabase.rpc('credit_wallet', {
        p_user_id: userId,
        p_amount: amountInNgn,
        p_reference: reference
      });

      if (creditError) {
        console.error("Credit Wallet RPC Error:", creditError);
        throw new Error("Failed to process transaction atomically");
      }

      if (creditResult && !creditResult.success) {
        console.log("Transaction already processed (caught by RPC):", reference);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      console.log(`Successfully funded ${amountInNgn} NGN for user ${userId} via Webhook`);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("Paystack Webhook Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
