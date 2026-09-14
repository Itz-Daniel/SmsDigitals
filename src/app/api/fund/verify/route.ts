import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack Secret Key is missing" }, { status: 500 });
    }

    // 1. Verify the transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json({ error: "Transaction verification failed or is not successful" }, { status: 400 });
    }

    // Amount from Paystack is in kobo, convert to NGN
    const amountNgn = verifyData.data.amount / 100;

    // 2. Credit the wallet using the safe SQL function with direct fallback
    const supabaseAdmin = createAdminClient();
    let finalBalance = 0;

    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: amountNgn,
      p_reference: reference
    });

    if (creditError) {
      console.warn("RPC credit_wallet fallback executing:", creditError.message);

      // Idempotency: check if transaction reference already processed
      const { data: existingTx } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .maybeSingle();

      if (existingTx) {
        return NextResponse.json({ success: true, message: "Transaction already processed." });
      }

      // Fetch or initialize user's wallet
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id, balance_ngn")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        finalBalance = (wallet.balance_ngn || 0) + amountNgn;
        await supabaseAdmin
          .from("wallets")
          .update({ balance_ngn: finalBalance })
          .eq("user_id", user.id);
      } else {
        finalBalance = amountNgn;
        await supabaseAdmin
          .from("wallets")
          .insert({ user_id: user.id, balance_ngn: amountNgn, balance_usd: 0 });
      }

      // Record transaction history
      await supabaseAdmin.from("transactions").insert({
        user_id: user.id,
        type: "Deposit",
        amount: amountNgn,
        currency: "NGN",
        status: "Success",
        reference: reference,
        description: `Paystack Deposit (₦${amountNgn.toLocaleString()})`
      });

      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: amountNgn,
        currency: "NGN",
        status: "Completed",
        reference: reference,
        description: `Paystack Deposit (₦${amountNgn.toLocaleString()})`
      });
    } else if (creditResult && !creditResult.success) {
      return NextResponse.json({ error: creditResult.error || "Transaction already processed" }, { status: 400 });
    } else if (creditResult) {
      finalBalance = creditResult.new_balance;
    }

    // Trigger WhatsApp Admin Alert in the background (fire and forget)
    fetch(new URL('/api/admin-alert', req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: `💰 *Deposit Alert*\n\nUser: ${user.email}\nAmount: ₦${amountNgn.toLocaleString()}\nRef: ${reference}` 
      })
    }).catch(err => console.error("Failed to trigger admin alert:", err));

    return NextResponse.json({
      success: true,
      message: "Wallet credited successfully",
      new_balance: finalBalance
    });

  } catch (error: unknown) {
    console.error("Fund Verify API Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
