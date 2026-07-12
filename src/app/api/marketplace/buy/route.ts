import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buyAccsPurchase, getBuyAccsGoods } from "@/lib/providers/buyaccs";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider_api_id } = await req.json();

    if (!provider_api_id) {
      return NextResponse.json({ error: "Missing product ID." }, { status: 400 });
    }

    // 1. Fetch current price and stock directly from the wholesale provider (server-side secure)
    const goods = await getBuyAccsGoods();
    const product = goods.find(g => g.id.toString() === provider_api_id.toString());

    if (!product || product.count <= 0) {
      return NextResponse.json({ error: "Product is out of stock or unavailable." }, { status: 404 });
    }

    // Recalculate price securely on the server
    const retailPrice = calculateFinalRetailPrice(product.price, 1, 'USD');

    // 2. We use our unified RPC to deduct balance and log order atomically.
    // However, we only want to deduct IF the buy succeeds. 
    // To do this perfectly, we will fetch Buy-Accs first. But if Buy-Accs succeeds and our DB fails, 
    // we lose money and user gets nothing. 
    // Safer approach: Deduct first, Buy second, Refund if Buy fails.
    
    const { data: orderResult, error: orderError } = await supabase.rpc('buy_digital_good', {
      p_user_id: user.id,
      p_provider_api_id: product.id.toString(),
      p_product_name: product.title || 'Digital Account',
      p_cost: retailPrice,
      p_currency: 'USD',
      p_account_logs: 'PENDING_DELIVERY' // Placeholder until API returns
    });

    if (orderError || !orderResult?.success) {
      console.error("Database order error:", orderError || orderResult?.error);
      return NextResponse.json({ error: orderResult?.error || "Insufficient balance." }, { status: 400 });
    }

    const orderId = orderResult.order_id;

    // 3. Purchase from wholesale API live
    const purchaseResult = await buyAccsPurchase(product.id, 1);

    if (!purchaseResult.success) {
      // PURCHASE FAILED! We must refund the user immediately via our refund RPC
      console.error(`Buy-accs API failed for order ${orderId}:`, purchaseResult.error);
      
      await supabase.rpc('refund_digital_order', {
        p_order_id: orderId
      });

      return NextResponse.json({ error: "Wholesale provider failed to deliver. You have been refunded automatically." }, { status: 502 });
    }

    // 4. Purchase succeeded! Update the order with the real credentials
    // buy-accs returns credentials in various formats. We will stringify whatever data they return.
    const logs = typeof purchaseResult.data === 'string' 
      ? purchaseResult.data 
      : JSON.stringify(purchaseResult.data, null, 2);

    await supabase
      .from('digital_orders')
      .update({ account_logs: logs })
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
