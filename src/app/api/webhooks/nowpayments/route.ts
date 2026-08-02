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

    const { payment_status, order_id, price_amount, outcome_amount, actually_paid, pay_currency } = payload;

    // Process finished, confirmed, sending, OR partially_paid crypto deposits
    const validStatuses = ["finished", "confirmed", "partially_paid", "sending"];

    if (validStatuses.includes(payment_status)) {
      const supabaseAdmin = createAdminClient();

      // Proportional Partial Credit: Use actual amount received
      const creditAmountUsd = parseFloat(actually_paid || outcome_amount || price_amount || "0");

      if (order_id && creditAmountUsd > 0) {
        // Idempotency Check: Verify if this order_id has ALREADY been credited
        const { data: existingTx } = await supabaseAdmin
          .from("wallet_transactions")
          .select("id")
          .eq("reference", order_id)
          .limit(1);

        if (existingTx && existingTx.length > 0) {
          // Already credited — prevent double-crediting
          return NextResponse.json({ success: true, message: "Order already processed." });
        }

        // Extract user_id from order_id (format: crypto_timestamp_userIdShort)
        const userIdShort = order_id.split("_")[2];

        if (userIdShort) {
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

              const isPartial = payment_status === "partially_paid";
              const statusLabel = isPartial ? "Partially Paid Deposit" : "Completed Deposit";

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
                  description: `Crypto ${statusLabel} (${pay_currency?.toUpperCase() || 'USDT'})`
                });

              await supabaseAdmin
                .from("transactions")
                .insert({
                  user_id: matchedUser.id,
                  type: "Deposit",
                  amount: creditAmountUsd,
                  currency: "USD",
                  status: "Success",
                  reference: order_id,
                  description: `Crypto ${statusLabel} (${pay_currency?.toUpperCase() || 'USDT'})`
                });

              // Notify Admin via Telegram
              await notifyDepositAlert({
                userEmail: matchedUser.full_name || matchedUser.id,
                amount: `$${creditAmountUsd.toFixed(2)} USD${isPartial ? ' (Partial)' : ''}`,
                method: `Crypto (${pay_currency?.toUpperCase() || 'USDT'})`,
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
