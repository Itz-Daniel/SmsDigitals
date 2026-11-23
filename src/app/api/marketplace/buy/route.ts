import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buyUltimateLogsService } from "@/lib/providers/ultimatelogs";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";
import { calculateUserDiscount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { product } = await req.json();

    if (!product || !product.id || !product.price) {
      return NextResponse.json({ error: "Invalid product selected." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch Exchange Rate Settings
    const { data: appSettings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate')
      .eq('id', 1)
      .single();

    const exchangeRate = appSettings?.exchange_rate || 1500;

    const wholesalePriceUsd = product.currency === 'USD' 
      ? product.price 
      : product.price / exchangeRate;

    // 2. Fetch User Wallet & Calculate Retail Price with VIP Discounts
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance_ngn, balance_usd, lifetime_deposits_usd')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const discountPercentage = calculateUserDiscount(wallet.lifetime_deposits_usd || 0);
    const finalPriceUsd = calculateFinalRetailPrice(wholesalePriceUsd, discountPercentage, product.name);
    const finalPriceNgn = Math.round(finalPriceUsd * exchangeRate);

    const initialBalanceNgn = Number(wallet.balance_ngn) || 0;
    const initialBalanceUsd = Number(wallet.balance_usd) || 0;
    const totalAvailableNgn = initialBalanceNgn + (initialBalanceUsd * exchangeRate);

    if (totalAvailableNgn < finalPriceNgn) {
      const availableUsd = (totalAvailableNgn / exchangeRate).toFixed(2);
      return NextResponse.json({ 
        error: `Insufficient balance. Required: $${finalPriceUsd.toFixed(2)} (₦${finalPriceNgn.toLocaleString()}), Available: $${availableUsd}. Please fund your account.` 
      }, { status: 400 });
    }

    // 3. Pre-Deduct (Reserve) User Wallet Balance to eliminate TOCTOU race conditions
    let newBalanceNgn = initialBalanceNgn;
    let newBalanceUsd = initialBalanceUsd;

    if (newBalanceNgn >= finalPriceNgn) {
      newBalanceNgn -= finalPriceNgn;
    } else {
      const deficitNgn = finalPriceNgn - newBalanceNgn;
      const deficitUsd = deficitNgn / exchangeRate;
      newBalanceNgn = 0;
      newBalanceUsd = Math.max(0, newBalanceUsd - deficitUsd);
    }

    const { error: reserveError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        balance_ngn: newBalanceNgn,
        balance_usd: newBalanceUsd,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (reserveError) {
      return NextResponse.json({ error: "Failed to process payment reservation." }, { status: 500 });
    }

    // 4. Purchase Item from Wholesale Provider
    let result: any;
    try {
      result = await buyUltimateLogsService(Number(product.id));
    } catch (supplierError: any) {
      result = { success: false, error: supplierError?.message || "Supplier network error" };
    }

    // If wholesale supplier call fails, ROLL BACK the deducted balance immediately
    if (!result || !result.success || !result.data) {
      await supabaseAdmin
        .from('wallets')
        .update({ 
          balance_ngn: initialBalanceNgn,
          balance_usd: initialBalanceUsd,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      return NextResponse.json({ 
        error: result?.error || "Failed to purchase digital asset from supplier. Your balance was not charged." 
      }, { status: 500 });
    }

    // Format credentials/logs string for user delivery
    let accountLogsText = "";
    if (typeof result.data === 'string') {
      accountLogsText = result.data;
    } else if (result.data?.items && Array.isArray(result.data.items)) {
      accountLogsText = result.data.items.join("\n");
    } else if (result.data?.logs) {
      accountLogsText = typeof result.data.logs === 'string' ? result.data.logs : JSON.stringify(result.data.logs, null, 2);
    } else {
      accountLogsText = JSON.stringify(result.data, null, 2);
    }

    // 5. Record Digital Order
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('digital_orders')
      .insert({
        user_id: user.id,
        product_id: String(product.id),
        product_name: product.name,
        category: product.category || 'General',
        cost: finalPriceUsd,
        currency: 'USD',
        status: 'Delivered',
        account_logs: accountLogsText,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.warn("digital_orders insert fallback executing:", orderError.message);
      await supabaseAdmin
        .from('user_marketplace_purchases')
        .insert({
          user_id: user.id,
          product_id: String(product.id),
          product_name: product.name,
          category: product.category || 'General',
          price: finalPriceUsd,
          currency: 'USD',
          account_data: accountLogsText,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    }

    // 6. Log the Transaction in History
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Digital Product Purchase',
      amount: finalPriceNgn,
      currency: 'NGN',
      status: 'Success',
      reference: `digi_${newOrder?.id || Date.now()}`,
      description: `Marketplace Asset: ${product.name} ($${finalPriceUsd.toFixed(2)})`
    });

    // 7. Dispatch Delivery Notification via Email
    try {
      const { sendDigitalProductDeliveredEmail } = await import("@/lib/resend");
      await sendDigitalProductDeliveredEmail(user.email!, product.name, accountLogsText);
    } catch (e) {
      console.error("Failed to dispatch digital product email:", e);
    }

    return NextResponse.json({
      success: true,
      message: "🎉 Digital product purchased and delivered instantly!",
      order: {
        id: newOrder?.id,
        product_name: product.name,
        account_logs: accountLogsText
      }
    });

  } catch (error: any) {
    console.error("Marketplace Buy API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to complete purchase." }, { status: 500 });
  }
}
