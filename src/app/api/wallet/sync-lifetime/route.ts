import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateUserDiscount } from "@/lib/pricing-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(_req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch current exchange rate
    const { data: appSettings } = await supabaseAdmin
      .from("settings")
      .select("exchange_rate")
      .eq("id", 1)
      .single();
    const exchangeRate = appSettings?.exchange_rate || 1500;

    // 2. Fetch all successful deposit / funding / voucher transactions for user
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, currency, type, status")
      .eq("user_id", user.id)
      .eq("status", "Success")
      .in("type", ["Deposit", "Funding", "Voucher"]);

    let calculatedTotalUsd = 0;
    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        const amt = Number(tx.amount) || 0;
        if (amt <= 0) continue;

        if (tx.currency === "USD") {
          calculatedTotalUsd += amt;
        } else {
          // Convert NGN to USD
          calculatedTotalUsd += amt / exchangeRate;
        }
      }
    }
    calculatedTotalUsd = Math.round(calculatedTotalUsd * 100) / 100;

    // 3. Fetch user wallet
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, lifetime_deposits_usd, balance_ngn, balance_usd")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      return NextResponse.json({ 
        success: true, 
        lifetime_deposits_usd: 0,
        tier: "STANDARD",
        discountPercent: 0
      });
    }

    const currentLifetime = Number(wallet.lifetime_deposits_usd) || 0;
    let finalLifetime = currentLifetime;

    // Self-heal: If historical deposits are higher than recorded lifetime_deposits_usd, sync it!
    if (calculatedTotalUsd > currentLifetime) {
      finalLifetime = calculatedTotalUsd;
      await supabaseAdmin
        .from("wallets")
        .update({ 
          lifetime_deposits_usd: finalLifetime,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);
    }

    const discountRate = calculateUserDiscount(finalLifetime);
    const tierName = finalLifetime >= 500 ? "GOLD" : finalLifetime >= 150 ? "SILVER" : finalLifetime >= 50 ? "BRONZE" : "STANDARD";

    return NextResponse.json({
      success: true,
      lifetime_deposits_usd: finalLifetime,
      calculatedFromHistory: calculatedTotalUsd,
      tier: tierName,
      discountPercent: Math.round(discountRate * 100),
      synced: calculatedTotalUsd > currentLifetime
    });

  } catch (error: any) {
    console.error("Sync Lifetime Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync lifetime deposits" }, { status: 500 });
  }
}
