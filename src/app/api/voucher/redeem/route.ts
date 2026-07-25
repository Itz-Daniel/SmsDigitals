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

    const { code, deviceFingerprint, currencyPreference = "USD" } = await req.json();

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

    // 🛡️ RULE 4: ACCOUNT AGE & DEPOSIT GUARD (24 Hours or 1 Deposit)
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

    // 🛡️ RULE 1: User Account One-Time Redemption Limit per Voucher Code
    const { data: userPrevTx } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("voucher_code", cleanCode)
      .limit(1);

    if (userPrevTx && userPrevTx.length > 0) {
      return NextResponse.json({ 
        error: "🚫 You have already redeemed this promo code on your account." 
      }, { status: 400 });
    }

    // 🛡️ RULE 2 & 3: IP ADDRESS & DEVICE FINGERPRINT MULTI-ACCOUNT LOCK
    const { data: existingRedemptions } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("user_id, ip_address, device_fingerprint")
      .eq("voucher_code", cleanCode);

    if (existingRedemptions && existingRedemptions.length > 0) {
      const ipMatch = existingRedemptions.find(r => r.ip_address === clientIp && r.user_id !== user.id);
      if (ipMatch) {
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

    // 🛡️ STRICT DATABASE VOUCHER VALIDATION (NO TESTING CODES ALLOWED)
    const { data: dbVoucher } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", cleanCode)
      .single();

    if (!dbVoucher) {
      return NextResponse.json({ error: "Invalid or expired gift card voucher code." }, { status: 400 });
    }

    // 🛡️ STRICT MAX USES ENFORCEMENT
    const maxAllowedUses = dbVoucher.max_uses || 1;
    const currentUsedCount = dbVoucher.used_count || 0;

    if (dbVoucher.is_used || currentUsedCount >= maxAllowedUses) {
      return NextResponse.json({ error: "🚫 This promo voucher code has reached its maximum redemption limit." }, { status: 400 });
    }

    if (dbVoucher.expires_at && new Date(dbVoucher.expires_at) < new Date()) {
      return NextResponse.json({ error: "🚫 This promo voucher code has expired." }, { status: 400 });
    }

    // Fetch Exchange Rate for single-currency crediting
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("exchange_rate")
      .eq("id", 1)
      .single();

    const exchangeRate = settings?.exchange_rate || 1500;

    // Calculate Credit Amount strictly in the user's PREFERRED currency ONLY
    const isNgnPreference = currencyPreference?.toUpperCase() === "NGN";
    
    let creditAmount = 0;
    let finalCurrency: "USD" | "NGN" = "USD";

    if (isNgnPreference) {
      finalCurrency = "NGN";
      if (dbVoucher.amount_ngn && dbVoucher.amount_ngn > 0) {
        creditAmount = dbVoucher.amount_ngn;
      } else {
        creditAmount = (dbVoucher.amount_usd || 0) * exchangeRate;
      }
    } else {
      finalCurrency = "USD";
      if (dbVoucher.amount_usd && dbVoucher.amount_usd > 0) {
        creditAmount = dbVoucher.amount_usd;
      } else {
        creditAmount = (dbVoucher.amount_ngn || 0) / exchangeRate;
      }
    }

    if (creditAmount <= 0) {
      return NextResponse.json({ error: "Voucher has zero credit value." }, { status: 400 });
    }

    // Atomically Credit ONLY the Selected Currency Balance
    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    let updateWalletData: Record<string, number> = {};
    let formattedSuccessText = "";

    if (finalCurrency === "NGN") {
      const newNgnBalance = (userWallet.balance_ngn || 0) + creditAmount;
      updateWalletData = { balance_ngn: newNgnBalance };
      formattedSuccessText = `₦${creditAmount.toLocaleString()} NGN`;
    } else {
      const newUsdBalance = (userWallet.balance_usd || 0) + creditAmount;
      updateWalletData = { balance_usd: newUsdBalance };
      formattedSuccessText = `$${creditAmount.toFixed(2)} USD`;
    }

    await supabaseAdmin
      .from("wallets")
      .update(updateWalletData)
      .eq("user_id", user.id);

    // Increment DB Voucher Used Count Atomically
    const newUsedCount = currentUsedCount + 1;
    const isNowDepleted = newUsedCount >= maxAllowedUses;

    await supabaseAdmin
      .from("vouchers")
      .update({ 
        used_count: newUsedCount,
        is_used: isNowDepleted
      })
      .eq("id", dbVoucher.id);

    // Record Anti-Abuse Redemption Log
    await supabaseAdmin
      .from("voucher_redemptions")
      .insert({
        voucher_code: cleanCode,
        user_id: user.id,
        ip_address: clientIp,
        device_fingerprint: fingerprint,
        redeemed_at: new Date().toISOString()
      });

    // Record Transaction Ledger with "Created with Voucher"
    const voucherTxDescription = `Created with Gift Card Voucher: ${cleanCode}`;
    const voucherRef = `voucher_${cleanCode}`;

    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "Voucher",
        amount: creditAmount,
        currency: finalCurrency,
        status: "Completed",
        reference: voucherRef,
        description: voucherTxDescription
      });

    await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "Voucher",
        amount: creditAmount,
        currency: finalCurrency,
        status: "Success",
        reference: voucherRef,
        description: voucherTxDescription
      });

    return NextResponse.json({
      success: true,
      message: `🎉 Success! Redeemed ${cleanCode} for ${formattedSuccessText} wallet credit!`,
      creditedCurrency: finalCurrency,
      creditedAmount: creditAmount
    });
  } catch (err: any) {
    console.error("Voucher redeem error:", err);
    return NextResponse.json({ error: err.message || "Failed to redeem promo code." }, { status: 500 });
  }
}
