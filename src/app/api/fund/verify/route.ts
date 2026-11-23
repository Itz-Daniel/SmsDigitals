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

    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack Secret Key is missing" }, { status: 500 });
    }

    // 1. Verify the transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json({ error: "Transaction verification failed or is not successful" }, { status: 400 });
    }

    // 2. Strict Ownership Verification (Prevent cross-account transaction theft)
    const metadataUserId = verifyData.data.metadata?.user_id || 
      verifyData.data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'user_id')?.value;
    const customerEmail = verifyData.data.customer?.email?.toLowerCase()?.trim();
    const userEmail = user.email?.toLowerCase()?.trim();

    const isOwner = (metadataUserId && metadataUserId === user.id) || (customerEmail && userEmail && customerEmail === userEmail);
    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized: This transaction reference does not belong to your account." }, { status: 403 });
    }

    // Amount from Paystack is in kobo, convert to NGN
    const amountNgn = verifyData.data.amount / 100;
    if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
      return NextResponse.json({ error: "Invalid transaction amount" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    let finalBalance = 0;

    // Fetch exchange rate to convert deposit to USD for account tiers
    const { data: appSettings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate')
      .eq('id', 1)
      .single();
    const exchangeRate = appSettings?.exchange_rate || 1500;
    const depositUsd = Math.round((amountNgn / exchangeRate) * 100) / 100;

    // 3. Credit wallet using atomic RPC or safe idempotent fallback
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
        .select("id, balance_ngn, lifetime_deposits_usd")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        finalBalance = (wallet.balance_ngn || 0) + amountNgn;
        const newLifetime = (Number(wallet.lifetime_deposits_usd) || 0) + depositUsd;
        await supabaseAdmin
          .from("wallets")
          .update({ 
            balance_ngn: finalBalance,
            lifetime_deposits_usd: newLifetime,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
      } else {
        finalBalance = amountNgn;
        await supabaseAdmin
          .from("wallets")
          .insert({ 
            user_id: user.id, 
            balance_ngn: amountNgn, 
            balance_usd: 0,
            lifetime_deposits_usd: depositUsd 
          });
      }

      // Record in transactions history table
      await supabaseAdmin.from("transactions").insert({
        user_id: user.id,
        amount: amountNgn,
        currency: "NGN",
        type: "Funding",
        status: "Success",
        reference: reference,
        description: `Paystack Deposit (${amountNgn.toLocaleString()} NGN)`
      });

      // Also record in wallet_transactions for consistency
      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: amountNgn,
        currency: "NGN",
        type: "deposit",
        status: "Completed",
        reference: reference,
        description: `Paystack Deposit (${amountNgn.toLocaleString()} NGN)`
      });
    } else {
      finalBalance = creditResult;
    }

    // 4. Trigger affiliate commission payout
    try {
      const { creditAffiliateCommission } = await import("@/lib/affiliate-engine");
      await creditAffiliateCommission({
        userId: user.id,
        depositAmountNgn: amountNgn,
        reference: reference,
        gateway: "Paystack",
      });
    } catch (affiliateErr) {
      console.error("Affiliate commission error on verify:", affiliateErr);
    }

    return NextResponse.json({
      success: true,
      message: "Wallet funded successfully!",
      balance: finalBalance,
    });
  } catch (error: any) {
    console.error("Fund Verification Error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify transaction" }, { status: 500 });
  }
}
