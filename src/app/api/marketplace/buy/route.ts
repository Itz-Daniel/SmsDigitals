import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buyUltimateLogsService, getUltimateLogsServices } from "@/lib/providers/ultimatelogs";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";
import { marketplaceBuySchema, getFieldErrors } from "@/lib/validation";
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

    const supabaseAdmin = createAdminClient();

    // Fetch exchange rate to properly convert NGN to USD
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;

    // Convert wholesale price to USD
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

    const totalAvailableNgn = (Number(wallet.balance_ngn) || 0) + ((Number(wallet.balance_usd) || 0) * exchangeRate);

    if (totalAvailableNgn < finalPriceNgn) {
      const availableUsd = (totalAvailableNgn / exchangeRate).toFixed(2);
      return NextResponse.json({ 
        error: `Insufficient balance. Required: $${finalPriceUsd.toFixed(2)} (₦${finalPriceNgn.toLocaleString()}), Available: $${availableUsd}. Please fund your account.` 
      }, { status: 400 });
    }

    // 3. Purchase Item from Wholesale Provider
    const result = await buyUltimateLogsService(Number(product.id));

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || "Failed to purchase digital asset from supplier." }, { status: 500 });
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

    // 4. Deduct User Wallet Balance accurately without wiping USD
    let newBalanceNgn = Number(wallet.balance_ngn) || 0;
    let newBalanceUsd = Number(wallet.balance_usd) || 0;

    if (newBalanceNgn >= finalPriceNgn) {
      newBalanceNgn -= finalPriceNgn;
    } else {
      const deficitNgn = finalPriceNgn - newBalanceNgn;
      const deficitUsd = deficitNgn / exchangeRate;
      newBalanceNgn = 0;
      newBalanceUsd = Math.max(0, newBalanceUsd - deficitUsd);
    }

    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        balance_ngn: newBalanceNgn,
        balance_usd: newBalanceUsd,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error("Wallet deduction error:", deductError);
      return NextResponse.json({ error: "Failed to process payment." }, { status: 500 });
    }

    // 5. Store Purchased Item in User Inventory (Insert into digital_orders for purchases history view)
    let purchaseRecord = null;

    const { data: orderItem, error: orderError } = await supabaseAdmin
      .from('digital_orders')
      .insert({
        user_id: user.id,
        provider_api_id: product.id.toString(),
        product_name: product.name,
        price_paid_usd: finalPriceUsd,
        currency_used: 'USD',
        account_logs: accountLogsText,
        status: 'Completed',
        purchased_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (orderError) {
      console.warn("digital_orders insert warning, attempting fallback table:", orderError.message);
      // Fallback insert if table variant is user_marketplace_purchases
      const { data: fallbackItem } = await supabaseAdmin
        .from('user_marketplace_purchases')
        .insert({
          user_id: user.id,
          item_id: product.id.toString(),
          item_name: product.name,
          category: product.category_name || 'Accounts',
          account_data: accountLogsText,
          price_paid: finalPriceUsd,
          currency: 'USD',
          status: 'Completed',
          created_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();
      purchaseRecord = fallbackItem;
    } else {
      purchaseRecord = orderItem;
    }

    // 6. Record Transaction Ledger
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalPriceUsd,
      currency: 'USD',
      status: 'Success',
      reference: `mkt_${product.id}_${Date.now()}`,
      description: `Purchased ${product.name} (Digital Marketplace)`
    });

    return NextResponse.json({
      success: true,
      message: "Purchase successful! Your account credentials are ready.",
      item: {
        id: purchaseRecord?.id || `mkt_${Date.now()}`,
        item_name: product.name,
        product_name: product.name,
        account_data: accountLogsText,
        account_logs: accountLogsText,
        price_paid: finalPriceUsd,
        price_paid_usd: finalPriceUsd
      }
    });

  } catch (error: any) {
    console.error("Marketplace buy route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
