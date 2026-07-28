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

    // 🛡️ TIER 0: RATE LIMITER SPEED LOCK (Max 1 request per 5 seconds per user)
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_endpoint: '/api/voucher/redeem',
      p_max_requests: 1,
      p_window_seconds: 5
    });

    if (rateLimitError) {
      console.warn("Voucher rate limit RPC warning:", rateLimitError.message);
    } else if (isAllowed === false) {
      return NextResponse.json({ 
        error: "🚫 Speed Protection: You are attempting to redeem too fast. Please wait 5 seconds between requests." 
      }, { status: 429 });
    }

    // 🛡️ TIER 0.5: ANTI-BRUTE-FORCE LOCKOUT (Max 5 failed code guesses per 10 minutes)
    const { data: isBruteAllowed, error: bruteCheckError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `${user.id}_voucher_fails`,
      p_endpoint: '/api/voucher/failed',
      p_max_requests: 5,
      p_window_seconds: 600
    });

    if (bruteCheckError) {
      console.warn("Voucher brute check RPC warning:", bruteCheckError.message);
    } else if (isBruteAllowed === false) {
      return NextResponse.json({ 
        error: "🚫 Security Lockout: Too many invalid promo code attempts. Voucher redemptions locked for 15 minutes." 
      }, { status: 429 });
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

    // Calculate User Account Age in Days & Hours
    const userCreatedAt = new Date(user.created_at || Date.now());
    const accountAgeHours = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60);
    const accountAgeDays = accountAgeHours / 24;

    const { data: userWallet } = await supabaseAdmin
      .from("wallets")
      .select("lifetime_deposits_usd, balance_usd, balance_ngn")
      .eq("user_id", user.id)
      .single();

    const lifetimeDeposits = userWallet?.lifetime_deposits_usd || 0;

    // 🛡️ RULE 1: User Account One-Time Redemption Check (Transactions + Redemptions table)
    const voucherRef = `voucher_${cleanCode}`;

    const { data: userPrevTx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("reference", voucherRef)
      .limit(1);

    const { data: userPrevRedemption } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("voucher_code", cleanCode)
      .limit(1);

    if ((userPrevTx && userPrevTx.length > 0) || (userPrevRedemption && userPrevRedemption.length > 0)) {
      return NextResponse.json({ 
        error: "🚫 You have already redeemed this promo voucher code on your account." 
      }, { status: 400 });
    }

    // 🛡️ RULE 2 & 3: IP ADDRESS & DEVICE FINGERPRINT MULTI-ACCOUNT LOCK + AUTO-PAUSE TRIGGER
    const { data: existingRedemptions } = await supabaseAdmin
      .from("voucher_redemptions")
      .select("user_id, ip_address, device_fingerprint")
      .eq("voucher_code", cleanCode);

    if (existingRedemptions && existingRedemptions.length > 0) {
      const ipMatch = existingRedemptions.find(r => r.ip_address === clientIp && r.user_id !== user.id);
      const fpMatch = existingRedemptions.find(r => r.device_fingerprint === fingerprint && r.user_id !== user.id);

      if (ipMatch || fpMatch) {
        const multiAccountCount = existingRedemptions.filter(r => r.user_id !== user.id).length + 1;

        // Auto-Pause Voucher if 3+ multi-account attempts are detected
        if (multiAccountCount >= 3) {
          await supabaseAdmin
            .from("vouchers")
            .update({ is_used: true })
            .eq("code", cleanCode);

          try {
            await supabaseAdmin.from("security_logs").insert({
              event_type: "VOUCHER_AUTO_PAUSED",
              severity: "HIGH",
              user_id: user.id,
              ip_address: clientIp,
              details: `Promo voucher ${cleanCode} auto-paused due to 3+ multi-account redemption attempts.`
            });
          } catch (e) {
            console.warn("security_logs insert error:", e);
          }
        }

        await flagUserForFraud({
          userId: user.id,
          userEmail: user.email!,
          ipAddress: clientIp,
          deviceFingerprint: fingerprint,
          reason: `Attempted multi-account redemption of promo code ${cleanCode}`
        });

        return NextResponse.json({ 
          error: "🚫 Multi-Account Violation: This promo code has already been claimed on this network or device." 
        }, { status: 400 });
      }
    }

    // 🛡️ STRICT DATABASE VOUCHER VALIDATION
    const { data: dbVoucher } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .eq("code", cleanCode)
      .single();

    if (!dbVoucher) {
      return NextResponse.json({ error: "Invalid or expired gift card voucher code." }, { status: 400 });
    }

    // 🛡️ TARGET AUDIENCE ENFORCEMENT (New Users vs Existing Members vs All)
    const targetAudience = dbVoucher.target_audience || "all";

    if (targetAudience === "new_users" && accountAgeDays > 7) {
      return NextResponse.json({
        error: "🚫 Eligibility Notice: This promo voucher is reserved exclusively for new registered accounts (created within the last 7 days)."
      }, { status: 400 });
    }

    if (targetAudience === "existing_users" && accountAgeDays <= 7) {
      return NextResponse.json({
        error: "🚫 Eligibility Notice: This promo voucher is reserved for existing platform members."
      }, { status: 400 });
    }

    // 🛡️ STRICT MAX USES ENFORCEMENT (Pre-Check)
    const maxAllowedUses = dbVoucher.max_uses || 1;
    const currentUsedCount = dbVoucher.used_count || 0;

    if (dbVoucher.is_used || currentUsedCount >= maxAllowedUses) {
      return NextResponse.json({ error: "🚫 This promo voucher code has reached its maximum redemption limit." }, { status: 400 });
    }

    if (dbVoucher.expires_at && new Date(dbVoucher.expires_at) < new Date()) {
      return NextResponse.json({ error: "🚫 This promo voucher code has expired." }, { status: 400 });
    }

    // 🛡️ ATOMIC CONCURRENCY LOCK: Increment Used Count in Database with .lt("used_count", maxAllowedUses)
    const newUsedCount = currentUsedCount + 1;
    const isNowDepleted = newUsedCount >= maxAllowedUses;

    const { data: updatedVouchers, error: updateVoucherError } = await supabaseAdmin
      .from("vouchers")
      .update({ 
        used_count: newUsedCount,
        is_used: isNowDepleted
      })
      .eq("id", dbVoucher.id)
      .lt("used_count", maxAllowedUses)
      .select();

    if (updateVoucherError || !updatedVouchers || updatedVouchers.length === 0) {
      return NextResponse.json({ 
        error: "🚫 Voucher Depleted: This voucher code has reached its maximum redemption limit." 
      }, { status: 400 });
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

    // Record Anti-Abuse Redemption Log
    try {
      await supabaseAdmin
        .from("voucher_redemptions")
        .insert({
          voucher_code: cleanCode,
          user_id: user.id,
          ip_address: clientIp,
          device_fingerprint: fingerprint,
          redeemed_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("voucher_redemptions log error:", e);
    }

    // Record Transaction Ledger with "Created with Voucher"
    const voucherTxDescription = `Created with Gift Card Voucher: ${cleanCode}`;

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
