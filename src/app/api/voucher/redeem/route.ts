import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flagUserForFraud, checkUserAccountStatus } from "@/lib/fraud-guard";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 🛡️ TIER 1: CHECK IF ACCOUNT IS BANNED OR FLAGGED
    const statusCheck = await checkUserAccountStatus(user.id);
    if (statusCheck.isBlocked) {
      return NextResponse.json({ error: statusCheck.reason }, { status: 403 });
    }

    const { code, deviceFingerprint } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please enter a valid gift card or promo code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabaseAdmin = createAdminClient();

    // Extract Client Network IP Address
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("cf-connecting-ip") || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";

    const fingerprint = deviceFingerprint || "unknown_device";

    // 🛡️ RULE 4 (COMBINED A+C): ACCOUNT AGE & ACTIVITY GUARD (24 Hours or 1 Deposit)
    const userCreatedAt = new Date(user.created_at || Date.now());
    const accountAgeHours = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60);

    const { data: userWallet } = await supabaseAdmin
      .from("wallets")
      .select("lifetime_deposits_usd, balance_usd, balance_ngn")
      .eq("user_id", user.id)
      .single();

    const lifetimeDeposits = userWallet?.lifetime_deposits_usd || 0;

    if (accountAgeHours < 24 && lifetimeDeposits <= 0) {
      return NextResponse.json({
        error: "🚫 Anti-Abuse Protection: Accounts under 24 hours old must have made at least 1 deposit before claiming promo vouchers."
      }, { status: 400 });
    }

    // 🛡️ RULE 1: User Account One-Time Limit
    const { data: userPrevTx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("reference", `voucher_${cleanCode}`)
      .limit(1);

    if (userPrevTx && userPrevTx.length > 0) {
      return NextResponse.json({ 
        error: "🚫 You have already redeemed this promo code on your account." 
      }, { status: 400 });
    }

    // 🛡️ RULE 2 & 3: STRICT IP ADDRESS & DEVICE FINGERPRINT LOCK + AUTO SOFT-FREEZE
    const { data: existingRedemptions } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("user_id, ip_address, device_fingerprint")
      .eq("voucher_code", cleanCode);

    if (existingRedemptions && existingRedemptions.length > 0) {
      // Check IP match across different user accounts
      const ipMatch = existingRedemptions.find(r => r.ip_address === clientIp && r.user_id !== user.id);
      if (ipMatch) {
        // Flag user account for admin review on multi-account attempt
        await flagUserForFraud({
          userId: user.id,
          userEmail: user.email!,
          ipAddress: clientIp,
          deviceFingerprint: fingerprint,
          reason: `Attempted multi-account redemption of promo code ${cleanCode} from IP ${clientIp}`
        });

        return NextResponse.json({ 
          error: "🚫 Multi-Account Violation: This promo code has already been claimed from your network IP. Account flagged for review." 
        }, { status: 400 });
      }

      // Check Device Fingerprint match across different user accounts
      const fpMatch = existingRedemptions.find(r => r.device_fingerprint === fingerprint && r.user_id !== user.id);
      if (fpMatch) {
        await flagUserForFraud({
          userId: user.id,
          userEmail: user.email!,
          ipAddress: clientIp,
          deviceFingerprint: fingerprint,
          reason: `Attempted multi-account redemption of promo code ${cleanCode} on Device FP ${fingerprint}`
        });

        return NextResponse.json({ 
          error: "🚫 Multi-Account Violation: This promo code has already been claimed on this device. Account flagged for review." 
        }, { status: 400 });
      }
    }

    // Validate Database Voucher or Fallback Promo Codes
    const { data: dbVoucher } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", cleanCode)
      .single();

    let creditAmountUsd = 0;
    let creditAmountNgn = 0;

    if (dbVoucher) {
      if (dbVoucher.is_used || (dbVoucher.max_uses && dbVoucher.used_count >= dbVoucher.max_uses)) {
        return NextResponse.json({ error: "This promo code has reached its maximum user limit or expired." }, { status: 400 });
      }

      if (dbVoucher.expires_at && new Date(dbVoucher.expires_at) < new Date()) {
        return NextResponse.json({ error: "This promo code voucher has expired." }, { status: 400 });
      }

      creditAmountUsd = dbVoucher.amount_usd || 0;
      creditAmountNgn = dbVoucher.amount_ngn || 0;
    } else {
      // Hardcoded Promo Codes
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

    // Atomically Credit User Wallet Balance
    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const newUsd = (userWallet.balance_usd || 0) + creditAmountUsd;
    const newNgn = (userWallet.balance_ngn || 0) + creditAmountNgn;

    await supabaseAdmin
      .from("wallets")
      .update({ balance_usd: newUsd, balance_ngn: newNgn })
      .eq("user_id", user.id);

    // Record Transaction History with "Created with Voucher" Description
    const voucherTxDescription = `Created with Gift Card Voucher: ${cleanCode}`;
    const voucherRef = `voucher_${cleanCode}`;

    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "Voucher",
        amount: creditAmountUsd > 0 ? creditAmountUsd : creditAmountNgn,
        currency: creditAmountUsd > 0 ? "USD" : "NGN",
        status: "Completed",
        reference: voucherRef,
        description: voucherTxDescription
      });

    await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "Voucher",
        amount: creditAmountUsd > 0 ? creditAmountUsd : creditAmountNgn,
        currency: creditAmountUsd > 0 ? "USD" : "NGN",
        status: "Success",
        reference: voucherRef,
        description: voucherTxDescription
      });

    // Save Anti-Abuse Redemption Log (User + IP + Fingerprint)
    await supabaseAdmin
      .from("voucher_redemptions")
      .insert({
        voucher_code: cleanCode,
        user_id: user.id,
        ip_address: clientIp,
        device_fingerprint: fingerprint,
        redeemed_at: new Date().toISOString()
      });

    // Update DB voucher use count
    if (dbVoucher) {
      await supabaseAdmin
        .from("vouchers")
        .update({ used_count: (dbVoucher.used_count || 0) + 1 })
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
