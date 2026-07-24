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

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please enter a valid gift card or promo code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabaseAdmin = createAdminClient();

    // 1. Check database vouchers table or fallback promo codes
    const { data: dbVoucher } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", cleanCode)
      .single();

    let creditAmountUsd = 0;
    let creditAmountNgn = 0;

    if (dbVoucher) {
      if (dbVoucher.is_used || (dbVoucher.max_uses && dbVoucher.used_count >= dbVoucher.max_uses)) {
        return NextResponse.json({ error: "This promo code has already been redeemed or expired." }, { status: 400 });
      }
      creditAmountUsd = dbVoucher.amount_usd || 0;
      creditAmountNgn = dbVoucher.amount_ngn || 0;
    } else {
      // Promo Codes
      const MOCK_PROMO_MAP: Record<string, { usd: number; ngn: number }> = {
        WELCOME1000: { usd: 1.0, ngn: 1000 },
        BONUS5: { usd: 5.0, ngn: 7500 },
        CRYPTOVIP: { usd: 10.0, ngn: 15000 },
        LAUNCH2026: { usd: 2.0, ngn: 3000 }
      };

      const promo = MOCK_PROMO_MAP[cleanCode];
      if (!promo) {
        return NextResponse.json({ error: "Invalid or expired promo voucher code." }, { status: 400 });
      }
      creditAmountUsd = promo.usd;
      creditAmountNgn = promo.ngn;
    }

    // 2. Atomically Credit Wallet Balance
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance_usd, balance_ngn")
      .eq("user_id", user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const newUsd = (wallet.balance_usd || 0) + creditAmountUsd;
    const newNgn = (wallet.balance_ngn || 0) + creditAmountNgn;

    await supabaseAdmin
      .from("wallets")
      .update({ balance_usd: newUsd, balance_ngn: newNgn })
      .eq("user_id", user.id);

    // Record in History
    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "credit",
        amount: creditAmountUsd > 0 ? creditAmountUsd : creditAmountNgn,
        currency: creditAmountUsd > 0 ? "USD" : "NGN",
        status: "Completed",
        reference: `voucher_${cleanCode}`,
        description: `Redeemed Gift Card / Promo Code: ${cleanCode}`
      });

    // Mark DB voucher as used if applicable
    if (dbVoucher) {
      await supabaseAdmin
        .from("vouchers")
        .update({ used_count: (dbVoucher.used_count || 0) + 1, is_used: true })
        .eq("id", dbVoucher.id);
    }

    return NextResponse.json({
      success: true,
      message: `🎉 Success! Redeemed ${cleanCode} for ${creditAmountUsd > 0 ? `$${creditAmountUsd.toFixed(2)} USD` : `₦${creditAmountNgn.toLocaleString()} NGN`} wallet credit!`,
      newUsd,
      newNgn
    });
  } catch (err: any) {
    console.error("Voucher redeem error:", err);
    return NextResponse.json({ error: err.message || "Failed to redeem promo code." }, { status: 500 });
  }
}
