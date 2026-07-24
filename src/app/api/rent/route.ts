import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, TextVerifiedApi, SmsManApi, SmspvaApi, ProviderResponse } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";
import { notifyTelegramAdmin } from "@/lib/telegram-admin";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🛡️ BANNED / FLAGGED ACCOUNT LOCK
    const accountBlock = await enforceActiveAccount(user.id);
    if (accountBlock) return accountBlock;

    const { serviceId, serviceName = "", country, region, currency = 'USD', isSandbox = false } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // --- SANDBOX DEMO MODE (ADMIN ONLY FOR FREE TESTING) ---
    if (isSandbox) {
      const isAdmin = user.user_metadata?.role === 'admin' || 
                      user.app_metadata?.role === 'admin' || 
                      user.email?.toLowerCase().includes('admin');

      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden: Sandbox Mode is restricted to Admin accounts." }, { status: 403 });
      }

      const mockOrderId = `sandbox-${Date.now()}`;
      const mockPhone = `+1 (332) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

      const { data: mockRental, error: mockError } = await supabaseAdmin
        .from('rentals')
        .insert({
          user_id: user.id,
          order_id: mockOrderId,
          phone_number: mockPhone,
          service: serviceId,
          provider: 'sandbox-node',
          region: region || 'usa',
          status: 'Waiting',
          cost: 0,
          currency: currency,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (mockError) {
        console.error("Sandbox rental creation error:", mockError);
        return NextResponse.json({ error: "Failed to create sandbox test number." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        rental: mockRental,
        order_id: mockOrderId,
        phone_number: mockPhone,
        service: serviceId,
        cost: 0,
        currency: currency,
        expires_at: expiresAt,
        isSandbox: true,
        message: "⚡ Sandbox Number Procured (0ms Admin Free Testing)"
      });
    }

    // 1. Fetch User Wallet and VIP Tier Discount
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance_usd, balance_ngn, lifetime_deposits_usd')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    const discountPercentage = calculateUserDiscount(wallet.lifetime_deposits_usd || 0);

    // 2. Multi-Provider Fallback Cascade Sequence
    const providers = [
      new FiveSimApi(),
      new GrizzlyApi(),
      new TextVerifiedApi(),
      new SmsManApi(),
      new SmspvaApi()
    ];

    let successResponse: ProviderResponse | null = null;
    let usedProviderName = "";

    for (const provider of providers) {
      try {
        const res = await provider.rentNumber(country, serviceId);
        if (res && res.success && res.phoneNumber) {
          successResponse = res;
          usedProviderName = provider.name;
          break;
        }
      } catch (e) {
        console.warn(`Provider ${provider.name} failed for ${country}/${serviceId}, cascading...`);
      }
    }

    if (!successResponse) {
      await notifyTelegramAdmin(`🚨 Out of Stock: No virtual number available for ${country}/${serviceId}`);
      return NextResponse.json({ 
        error: "Temporary Stock Out: All providers are currently out of stock for this line. Please try another country or retry in a few moments." 
      }, { status: 503 });
    }

    // 3. Pricing Calculation
    const wholesaleCostUsd = successResponse.costUsd || 0.50;
    const finalPriceUsd = calculateFinalRetailPrice(wholesaleCostUsd, discountPercentage, serviceName || serviceId);

    // 4. Balance Deduction Check
    if (currency === 'NGN') {
      const { data: apiSettings } = await supabaseAdmin.from('api_settings').select('exchange_rate').single();
      const rate = apiSettings?.exchange_rate || 1500;
      const finalPriceNgn = finalPriceUsd * rate;

      if ((wallet.balance_ngn || 0) < finalPriceNgn) {
        return NextResponse.json({ 
          error: `Insufficient NGN Balance. Required: ₦${finalPriceNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}, Available: ₦${wallet.balance_ngn.toLocaleString(undefined, { maximumFractionDigits: 2 })}.` 
        }, { status: 402 });
      }

      // Deduct NGN Balance
      await supabaseAdmin
        .from('wallets')
        .update({ balance_ngn: wallet.balance_ngn - finalPriceNgn })
        .eq('user_id', user.id);
    } else {
      if ((wallet.balance_usd || 0) < finalPriceUsd) {
        return NextResponse.json({ 
          error: `Insufficient USD Balance. Required: $${finalPriceUsd.toFixed(2)}, Available: $${(wallet.balance_usd || 0).toFixed(2)}.` 
        }, { status: 402 });
      }

      // Deduct USD Balance
      await supabaseAdmin
        .from('wallets')
        .update({ balance_usd: wallet.balance_usd - finalPriceUsd })
        .eq('user_id', user.id);
    }

    // 5. Record Rental Order in Supabase
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    const { data: newRental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: user.id,
        order_id: successResponse.orderId,
        phone_number: successResponse.phoneNumber,
        service: serviceId,
        provider: usedProviderName,
        region: region || country,
        status: 'Waiting',
        cost: finalPriceUsd,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (rentalError) {
      console.error("Failed to insert rental into DB:", rentalError);
    }

    // 6. Record Transaction Ledger
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalPriceUsd,
      currency: currency,
      status: 'Success',
      reference: successResponse.orderId,
      description: `Purchased ${serviceName || serviceId} (${country.toUpperCase()}) line`
    });

    return NextResponse.json({
      success: true,
      rental: newRental,
      order_id: successResponse.orderId,
      phone_number: successResponse.phoneNumber,
      service: serviceId,
      cost: finalPriceUsd,
      currency: currency,
      expires_at: expiresAt,
      message: "Virtual Number Procured Successfully!"
    });

  } catch (err: any) {
    console.error("Number procurement API error:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
