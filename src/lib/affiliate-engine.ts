import { createAdminClient } from "@/lib/supabase/admin";

export interface AffiliateCreditParams {
  userId: string;
  depositAmountNgn: number;
  reference: string;
  gateway: "Paystack" | "Stripe" | "Crypto" | string;
}

export interface AffiliateCreditResult {
  credited: boolean;
  referrerId?: string;
  commissionNgn?: number;
  message?: string;
}

/**
 * Automatically credits affiliate commission to the referrer when a referred user funds their wallet.
 * Works seamlessly across Paystack, Stripe, and Crypto gateways.
 */
export async function creditAffiliateCommission(
  params: AffiliateCreditParams
): Promise<AffiliateCreditResult> {
  const { userId, depositAmountNgn, reference, gateway } = params;

  if (!userId || depositAmountNgn <= 0) {
    return { credited: false, message: "Invalid parameters" };
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Check if user was referred by someone
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, referred_by")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !userProfile || !userProfile.referred_by) {
      return { credited: false, message: "No referrer linked to user" };
    }

    const referrerId = userProfile.referred_by;

    // 2. Prevent self-referral
    if (referrerId === userId) {
      return { credited: false, message: "Self-referral ignored" };
    }

    // 3. Prevent duplicate commission for the same deposit reference
    const affiliateReference = `${reference}_AFFILIATE`;
    const { data: existingCommission } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("reference", affiliateReference)
      .maybeSingle();

    if (existingCommission) {
      return { credited: false, message: "Commission already processed for this reference" };
    }

    // 4. Fetch the active commission rate (settings or api_settings, default 5%)
    let percentage = 5.0;
    try {
      const { data: settingRow } = await supabaseAdmin
        .from("settings")
        .select("affiliate_percentage")
        .eq("id", 1)
        .maybeSingle();

      if (settingRow?.affiliate_percentage) {
        percentage = Number(settingRow.affiliate_percentage);
      } else {
        const { data: apiSettingRow } = await supabaseAdmin
          .from("api_settings")
          .select("affiliate_percentage")
          .limit(1)
          .maybeSingle();
        if (apiSettingRow?.affiliate_percentage) {
          percentage = Number(apiSettingRow.affiliate_percentage);
        }
      }
    } catch {
      percentage = 5.0;
    }

    const commissionNgn = Math.round(depositAmountNgn * (percentage / 100));
    if (commissionNgn <= 0) {
      return { credited: false, message: "Calculated commission is 0" };
    }

    // 5. Credit the Referrer's Master Wallet (balance_ngn)
    const { data: referrerWallet } = await supabaseAdmin
      .from("wallets")
      .select("id, balance_ngn")
      .eq("user_id", referrerId)
      .maybeSingle();

    if (referrerWallet) {
      const newNgnBalance = (Number(referrerWallet.balance_ngn) || 0) + commissionNgn;
      await supabaseAdmin
        .from("wallets")
        .update({ 
          balance_ngn: newNgnBalance,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", referrerId);
    } else {
      await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: referrerId,
          balance_ngn: commissionNgn,
          balance_usd: 0
        });
    }

    // 6. Update Referrer's Lifetime Affiliate Earnings in profiles
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("affiliate_earnings")
      .eq("id", referrerId)
      .maybeSingle();

    const newEarnings = (Number(referrerProfile?.affiliate_earnings) || 0) + commissionNgn;
    await supabaseAdmin
      .from("profiles")
      .update({ affiliate_earnings: newEarnings })
      .eq("id", referrerId);

    // 7. Log Transaction in `transactions`
    const description = `Affiliate Commission (${percentage}% on ${gateway} Deposit)`;
    await supabaseAdmin.from("transactions").insert({
      user_id: referrerId,
      type: "Affiliate Commission",
      amount: commissionNgn,
      currency: "NGN",
      status: "Success",
      reference: affiliateReference,
      description
    });

    // 8. Log in `wallet_transactions`
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: referrerId,
      type: "affiliate_commission",
      amount: commissionNgn,
      currency: "NGN",
      status: "Completed",
      reference: affiliateReference,
      description
    });

    console.log(`[Affiliate] Successfully credited ₦${commissionNgn} (${percentage}%) to referrer ${referrerId} for deposit ${reference}`);
    return {
      credited: true,
      referrerId,
      commissionNgn,
      message: `Credited ₦${commissionNgn}`
    };
  } catch (error) {
    console.error("[Affiliate] Error crediting commission:", error);
    return { credited: false, message: (error as Error).message };
  }
}

/**
 * Ensures a user has a unique referral code. If null, generates an 8-character code and saves it.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.referral_code) {
    return profile.referral_code;
  }

  // Generate unique 8-character code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let newCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    newCode = "";
    for (let i = 0; i < 8; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const { data: exists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", newCode)
      .maybeSingle();

    if (!exists) break;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ referral_code: newCode })
    .eq("id", userId);

  return newCode;
}
