import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buyUltimateLogsService, getUltimateLogsServices } from "@/lib/providers/ultimatelogs";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";
import { marketplaceBuySchema, getFieldErrors } from "@/lib/validation";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = marketplaceBuySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = getFieldErrors(validationResult.error);
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { provider_api_id } = validationResult.data;

    // 1. Fetch current price and stock directly from the wholesale provider
    const goods = await getUltimateLogsServices();
    const product = goods.find(g => g.id.toString() === provider_api_id.toString());

    if (!product || product.in_stock <= 0) {
      return NextResponse.json({ error: "Product is out of stock or unavailable." }, { status: 404 });
    }

    // Fetch exchange rate to properly convert NGN to USD
    const { data: settings } = await supabase.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;

    // Convert wholesale price to USD
    let wholesalePriceUsd = product.price;
    if (product.currency === 'NGN') {
      wholesalePriceUsd = product.price / exchangeRate;
    }

    // Get User's VIP Discount
    const { data: wallet } = await supabase.from('wallets').select('lifetime_deposits_usd').eq('user_id', user.id).single();
    const userDiscount = wallet?.lifetime_deposits_usd ? calculateUserDiscount(wallet.lifetime_deposits_usd) : 0;

    // Recalculate price securely on the server with user's discount
    const retailPrice = calculateFinalRetailPrice(wholesalePriceUsd, 1, 'USD', userDiscount);

    // 2. We use our unified RPC to deduct balance and log order atomically.
    const { data: orderResult, error: orderError } = await supabase.rpc('buy_digital_good', {
      p_user_id: user.id,
      p_provider_api_id: product.id.toString(),
      p_product_name: product.name || 'Digital Account',
      p_cost: retailPrice,
      p_currency: 'USD',
      p_account_logs: 'Processing Order...' // Placeholder
    });

    if (orderError || !orderResult?.success) {
      console.error("Database order error:", orderError || orderResult?.error);
      return NextResponse.json({ error: orderResult?.error || "Insufficient balance." }, { status: 400 });
    }

    const orderId = orderResult.order_id;

    // 3. Purchase from wholesale API live
    const purchaseResult = await buyUltimateLogsService(product.id, 1);

    if (!purchaseResult.success) {
      // PURCHASE FAILED! We must refund the user immediately via our refund RPC
      console.error(`Ultimate Logs API failed for order ${orderId}:`, purchaseResult.error);
      
      await supabase.rpc('refund_digital_order', {
        p_order_id: orderId
      });

      return NextResponse.json({ error: "Wholesale provider failed to deliver. You have been refunded automatically." }, { status: 502 });
    }

    // 4. Purchase succeeded! Save the provider's order ID and immediately delivered items.
    let logs = `Ultimate Logs Order ID: ${purchaseResult.data.order_id}\n\nAccounts Delivered:\n`;
    
    if (purchaseResult.data.items && Array.isArray(purchaseResult.data.items)) {
      purchaseResult.data.items.forEach((item: any, index: number) => {
        logs += `${index + 1}. ${item.details || 'No details provided'}\n`;
        if (item.url) logs += `   URL: ${item.url}\n`;
      });
    } else {
      logs += 'Status: Processing.\nCheck your email or contact support if not delivered instantly.';
    }

    await supabase
      .from('digital_orders')
      .update({ account_logs: logs, status: 'completed' })
      .eq('id', orderId);

    // Success!
    return NextResponse.json({
      success: true,
      order_id: orderId
    });

  } catch (error: any) {
    console.error("Marketplace Buy API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
