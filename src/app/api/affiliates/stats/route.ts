import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureReferralCode } from "@/lib/affiliate-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Ensure referral code exists for user
    const referralCode = await ensureReferralCode(user.id);

    // 2. Fetch profile info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("affiliate_earnings, referral_code, referred_by")
      .eq("id", user.id)
      .single();

    // 3. Count referred users & fetch recent referrals
    const { data: referredProfiles, count: referredCount } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at", { count: "exact" })
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Fetch recent affiliate commission transactions
    const { data: commissionTxs } = await supabaseAdmin
      .from("transactions")
      .select("id, amount, created_at, description, status, reference")
      .eq("user_id", user.id)
      .eq("type", "Affiliate Commission")
      .order("created_at", { ascending: false })
      .limit(10);

    // 5. Fetch commission rate
    let percentage = 5.0;
    try {
      const { data: settingRow } = await supabaseAdmin
        .from("settings")
        .select("affiliate_percentage")
        .eq("id", 1)
        .maybeSingle();

      if (settingRow?.affiliate_percentage !== undefined && settingRow?.affiliate_percentage !== null) {
        percentage = Number(settingRow.affiliate_percentage);
      } else {
        const { data: apiSettingRow } = await supabaseAdmin
          .from("api_settings")
          .select("affiliate_percentage")
          .limit(1)
          .maybeSingle();
        if (apiSettingRow?.affiliate_percentage !== undefined && apiSettingRow?.affiliate_percentage !== null) {
          percentage = Number(apiSettingRow.affiliate_percentage);
        }
      }
    } catch {
      percentage = 5.0;
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smsdigital.fun").replace(/\/$/, "");
    const referralLink = `${siteUrl}/register?ref=${referralCode}`;

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
      percentage,
      isReferred: Boolean(profile?.referred_by),
      totalEarningsNgn: Number(profile?.affiliate_earnings || 0),
      activeReferralsCount: referredCount || 0,
      recentReferrals: (referredProfiles || []).map((p) => ({
        id: p.id,
        name: p.full_name || "New Customer",
        createdAt: p.created_at,
      })),
      recentCommissions: (commissionTxs || []).map((t) => ({
        id: t.id,
        amountNgn: t.amount,
        createdAt: t.created_at,
        description: t.description,
      })),
    });
  } catch (error: any) {
    console.error("Affiliate Stats Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
