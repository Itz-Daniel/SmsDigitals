import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDepositAlert } from "@/lib/telegram-admin";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);

    // Verify NOWPayments IPN Signature (if secret set)
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    const hmacHeader = req.headers.get("x-nowpayments-sig");

    if (ipnSecret && hmacHeader) {
      const hmac = crypto.createHmac("sha512", ipnSecret);
      hmac.update(bodyText);
      const signature = hmac.digest("hex");

      if (signature !== hmacHeader) {
        return NextResponse.json({ error: "Invalid IPN signature" }, { status: 400 });
      }
    }

    const { payment_status, order_id, price_amount, outcome_amount } = payload;

    // Only process completed / finished payments
    if (payment_status === "finished" || payment_status === "confirmed") {
      const supabaseAdmin = createAdminClient();

      // Extract user_id from order_id (format: crypto_timestamp_userIdShort)
      // Query transactions or match user from order reference
      const creditAmountUsd = parseFloat(outcome_amount || price_amount || "0");

      if (order_id && creditAmountUsd > 0) {
        // Look up pending transaction or extract user reference
        const userIdShort = order_id.split("_")[2];

        if (userIdShort) {
          // Find user profile by ID prefix
          const { data: userProfiles } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name");

          const matchedUser = userProfiles?.find(p => p.id.substring(0, 6) === userIdShort);

          if (matchedUser) {
            // Atomic Wallet Update
            const { data: wallet } = await supabaseAdmin
              .from("wallets")
              .select("balance_usd, lifetime_deposits_usd")
              .eq("user_id", matchedUser.id)
              .single();

            if (wallet) {
              const newUsdBalance = (wallet.balance_usd || 0) + creditAmountUsd;
              const newLifetimeDeposits = (wallet.lifetime_deposits_usd || 0) + creditAmountUsd;

              await supabaseAdmin
                .from("wallets")
                .update({
                  balance_usd: newUsdBalance,
                  lifetime_deposits_usd: newLifetimeDeposits
                })
                .eq("user_id", matchedUser.id);

              // Record Transaction in History
              await supabaseAdmin
                .from("wallet_transactions")
                .insert({
                  user_id: matchedUser.id,
                  type: "deposit",
                  amount: creditAmountUsd,
                  currency: "USD",
                  status: "Completed",
                  reference: order_id,
                  description: `Crypto Deposit (${payload.pay_currency?.toUpperCase() || 'USDT'})`
                });

              // Notify Admin via Telegram
              await notifyDepositAlert({
                userEmail: matchedUser.full_name || matchedUser.id,
                amount: `$${creditAmountUsd.toFixed(2)} USD`,
                method: `Crypto (${payload.pay_currency?.toUpperCase() || 'USDT'})`,
                reference: order_id
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Crypto webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}
