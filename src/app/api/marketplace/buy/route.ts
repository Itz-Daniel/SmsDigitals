import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Fetch exchange rate to properly convert NGN to USD
    const { data: settings } = await supabase.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;

    // Convert wholesale price to USD
    const wholesalePriceUsd = product.currency === 'USD' 
      ? product.wholesale_price 
      : product.wholesale_price / exchangeRate;

    // 2. Fetch User Wallet & Calculate Retail Price with VIP Discounts
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_usd, lifetime_deposits_usd')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const discountPercentage = calculateUserDiscount(wallet.lifetime_deposits_usd || 0);
    const finalPriceUsd = calculateFinalRetailPrice(wholesalePriceUsd, discountPercentage, product.name);

    if (wallet.balance_usd < finalPriceUsd) {
      return NextResponse.json({ 
        error: `Insufficient balance. Required: $${finalPriceUsd.toFixed(2)}, Available: $${wallet.balance_usd.toFixed(2)}` 
      }, { status: 400 });
    }

    // 3. Purchase Item from Provider
    const result = await buyUltimateLogsService(product.id.toString());

    if (!result.success || !result.accountData) {
      return NextResponse.json({ error: result.error || "Failed to purchase digital asset from supplier." }, { status: 500 });
    }

    // 4. Deduct User Wallet Balance
    await supabase
      .from('wallets')
      .update({ balance_usd: wallet.balance_usd - finalPriceUsd })
      .eq('user_id', user.id);

    // 5. Store Purchased Item in User Inventory
    const { data: purchaseItem, error: dbError } = await supabase
      .from('user_marketplace_purchases')
      .insert({
        user_id: user.id,
        item_id: product.id.toString(),
        item_name: product.name,
        category: product.category,
        account_data: result.accountData,
        price_paid: finalPriceUsd,
        currency: 'USD',
        status: 'Completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB Insert Error:", dbError);
    }

    // Record Transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalPriceUsd,
      currency: 'USD',
      status: 'Success',
      reference: `mkt_${Date.now()}`,
      description: `Purchased ${product.name} (Marketplace)`
    });

    return NextResponse.json({
      success: true,
      message: "Purchase successful!",
      item: purchaseItem || {
        item_name: product.name,
        account_data: result.accountData,
        price_paid: finalPriceUsd
      }
    });

  } catch (error: any) {
    console.error("Marketplace buy route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
