import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, TextVerifiedApi, SmsManApi, SmspvaApi, ProviderResponse } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";
import { notifyTelegramAdmin } from "@/lib/telegram-admin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId, serviceName = "", country, region, currency = 'USD', isSandbox = false } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // --- SANDBOX DEMO MODE (100% FREE TESTING) ---
    if (isSandbox) {
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

      // Schedule simulated SMS code arrival after 5 seconds
      setTimeout(async () => {
        const mockCode = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
        await supabaseAdmin
          .from('rentals')
          .update({ status: 'Received', sms_code: mockCode })
          .eq('id', mockRental.id);
      }, 5000);

      return NextResponse.json({
        success: true,
        sandbox: true,
        provider_used: "sandbox-node",
        order: {
          order_id: mockOrderId,
          phone_number: mockPhone,
          service: serviceId,
          country: country,
          cost: 0,
          currency: currency,
          expires_at: expiresAt
        }
      });
    }

    // --- RATE LIMITING (FOR REAL PURCHASES) ---
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_endpoint: '/api/rent',
      p_max_requests: 3,
      p_window_seconds: 20
    });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
    } else if (isAllowed === false) {
      return NextResponse.json({ error: "You are doing that too fast. Please wait 20 seconds." }, { status: 429 });
    }

    let purchasedNumber: (ProviderResponse & { provider: string }) | null = null;

    // --- SEQUENTIAL WATERFALL ROUTING ---
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
        break;
      } catch (e: any) {
        if (e.name === 'ProviderLowBalanceError') {
          console.error(`🚨 ALERT: Provider ${provider.name} is OUT OF CREDIT!`);
          await notifyTelegramAdmin(`🚨 ALERT: Provider [${provider.name.toUpperCase()}] is out of credit/balance! Please refill immediately to avoid service disruption.`);
        } else {
          console.error(`${provider.name} failed:`, e.message || e);
        }
        console.log(`Falling back to next provider...`);
      }
    }

    if (!purchasedNumber) {
      return NextResponse.json({ error: "Number out of stock across all providers or invalid service ID. Check provider mappings." }, { status: 404 });
    }

    // --- CALCULATE FINAL PRICE ---
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate, brand_pricing').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;
    const brandPricing = settings?.brand_pricing || null;
    
    // Get User's VIP Discount
    const { data: wallet } = await supabaseAdmin.from('wallets').select('lifetime_deposits_usd').eq('user_id', user.id).single();
    const userDiscount = wallet?.lifetime_deposits_usd ? calculateUserDiscount(wallet.lifetime_deposits_usd) : 0;
    
    const finalCost = calculateFinalRetailPrice(purchasedNumber.cost, exchangeRate, currency, userDiscount, serviceName, brandPricing);

    // --- DEDUCT BALANCE & CREATE RENTAL ---
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

    const { data: rentData, error: rentError } = await supabaseAdmin.rpc('rent_number', {
      p_user_id: user.id,
      p_cost: finalCost,
      p_currency: currency,
      p_order_id: purchasedNumber.orderId,
      p_phone: purchasedNumber.phone,
      p_service: serviceId,
      p_provider: purchasedNumber.provider,
      p_region: region,
      p_expires_at: expiresAt
    });

    if (rentError) {
      console.error("Database rent error:", rentError);
      if (purchasedNumber.provider === "textverified") await TextVerifiedApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "5sim") await FiveSimApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "grizzly") await GrizzlyApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "smsman") await SmsManApi.cancelOrder(purchasedNumber.orderId);
      if (purchasedNumber.provider === "smspva") await SmspvaApi.cancelOrder(purchasedNumber.orderId, country, serviceId);

      return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
    }

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
