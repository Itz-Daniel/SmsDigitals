import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, TextVerifiedApi, SmsManApi, ProviderResponse } from "@/lib/providers/sms-providers";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId, serviceName = "", country, region, currency = 'USD' } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    let purchasedNumber: (ProviderResponse & { provider: string }) | null = null;

    // --- SEQUENTIAL WATERFALL ROUTING ---
    // Priority: TextVerified -> 5Sim -> Grizzly -> SMS-Man -> SMSPVA
    const providers = [
      { name: 'textverified', api: TextVerifiedApi },
      { name: '5sim', api: FiveSimApi },
      { name: 'grizzly', api: GrizzlyApi },
      { name: 'smsman', api: SmsManApi },
      { name: 'smspva', api: SmspvaApi },
    ];

    for (const provider of providers) {
      console.log(`Attempting ${provider.name}...`);
      try {
        const res = await provider.api.buyNumber(country, serviceId, serviceName);
        purchasedNumber = { ...res, provider: provider.name };
        console.log(`Success with ${provider.name}!`);
        break; // Stop waterfall if successful
      } catch (e: unknown) {
        console.error(`${provider.name} failed:`, e.message || e);
        console.log(`Falling back to next provider...`);
      }
    }

    if (!purchasedNumber) {
      return NextResponse.json({ error: "Number out of stock across all providers or invalid service ID. Check provider mappings." }, { status: 404 });
    }

    // --- CALCULATE FINAL PRICE ---
    // Fetch dynamic profit margin and exchange rate
    const supabaseAdmin = createAdminClient();
    const { data: settings } = await supabaseAdmin.from('settings').select('profit_margin, exchange_rate').eq('id', 1).single();
    const profitMargin = settings?.profit_margin || 0.40;
    const exchangeRate = settings?.exchange_rate || 1500;
    
    const rawPriceUsd = purchasedNumber.cost + (purchasedNumber.cost * profitMargin);
    let finalCost = rawPriceUsd;
    
    if (currency === 'NGN') {
      finalCost = rawPriceUsd * exchangeRate;
    }

    // Round to 2 decimal places
    finalCost = Math.round(finalCost * 100) / 100;

    // --- DEDUCT BALANCE & CREATE RENTAL ---
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // Expires in 15 minutes

    const { data: rentData, error: rentError } = await supabaseAdmin.rpc('rent_number', {
      p_user_id: user.id,
      p_cost: finalCost,
      p_currency: currency,
      p_order_id: purchasedNumber.orderId,
      p_phone: purchasedNumber.phone,
      p_service: serviceId, // Storing service ID. Ideally map it to a name
      p_provider: purchasedNumber.provider,
      p_region: region,
      p_expires_at: expiresAt
    });

    if (rentError) {
      console.error("Database rent error:", rentError);
      // Trigger "Cancel Order" on the provider so you get refunded.
      if (purchasedNumber.provider === "textverified") await TextVerifiedApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "5sim") await FiveSimApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "grizzly") await GrizzlyApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "smsman") await SmsManApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "smspva") await SmspvaApi.cancelOrder(purchasedNumber.orderId, country, serviceId);

      return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
    }

    // Success!
    return NextResponse.json({
      success: true,
      provider_used: purchasedNumber.provider, 
      order: {
        order_id: purchasedNumber.orderId,
        phone_number: purchasedNumber.phone,
        service: serviceId,
        country: country,
        cost: finalCost,
        currency: currency,
        expires_at: expiresAt
      }
    });

  } catch (error: unknown) {
    console.error("Rent API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
