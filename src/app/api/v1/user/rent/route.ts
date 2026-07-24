import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, TextVerifiedApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header. Format: Bearer sd_live_..." }, { status: 401 });
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey.startsWith("sd_live_")) {
      return NextResponse.json({ error: "Invalid API Key format." }, { status: 401 });
    }

    const { country = "usa", service = "wa", currency = "USD" } = await req.json();

    const supabaseAdmin = createAdminClient();

    // Fetch user wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('user_id, balance_usd')
      .limit(1)
      .single();

    const userId = wallet?.user_id;

    if (!userId) {
      return NextResponse.json({ error: "User wallet not found." }, { status: 404 });
    }

    // 🛡️ BANNED / FLAGGED ACCOUNT LOCK
    const accountBlock = await enforceActiveAccount(userId);
    if (accountBlock) return accountBlock;

    const mockOrderId = `ord_${Math.floor(100000 + Math.random() * 900000)}`;
    const mockPhone = `+1 (332) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

    const wholesaleCost = 0.50;
    const finalCost = calculateFinalRetailPrice(wholesaleCost, 0, service);

    if ((wallet.balance_usd || 0) < finalCost) {
      return NextResponse.json({
        error: `Insufficient balance. Required: $${finalCost.toFixed(2)}, Available: $${(wallet.balance_usd || 0).toFixed(2)}.`
      }, { status: 402 });
    }

    // Deduct balance
    await supabaseAdmin
      .from('wallets')
      .update({ balance_usd: wallet.balance_usd - finalCost })
      .eq('user_id', userId);

    // Save rental
    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: userId,
        order_id: mockOrderId,
        phone_number: mockPhone,
        service: service,
        provider: 'fivesim-node',
        region: country,
        status: 'Waiting',
        cost: finalCost,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    // Save transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'Purchase',
      amount: finalCost,
      currency: currency,
      status: 'Success',
      reference: mockOrderId,
      description: `Reseller API: Rent ${service} (${country}) line`
    });

    return NextResponse.json({
      success: true,
      order_id: mockOrderId,
      phone_number: mockPhone,
      service: service,
      country: country,
      cost: finalCost,
      currency: currency,
      expires_at: expiresAt
    });

  } catch (err: any) {
    console.error("v1 rent endpoint error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
