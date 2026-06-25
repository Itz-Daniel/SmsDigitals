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

    // 2. Credit the wallet using the safe SQL function
    const supabaseAdmin = createAdminClient();
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: amountNgn,
      p_reference: reference
    });

    if (creditError) {
      console.error("Credit Wallet Error:", creditError);
      return NextResponse.json({ error: "Database error while crediting wallet" }, { status: 500 });
    }

    if (creditResult && !creditResult.success) {
      return NextResponse.json({ error: creditResult.error || "Transaction already processed" }, { status: 400 });
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
      new_balance: creditResult.new_balance
    });

  } catch (error: unknown) {
    console.error("Fund Verify API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
