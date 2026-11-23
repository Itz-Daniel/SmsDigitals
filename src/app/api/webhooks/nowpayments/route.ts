import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDepositAlert } from "@/lib/telegram-admin";
import crypto from "crypto";

function sortObject(obj: Record<string, any>): Record<string, any> {
  if (typeof obj !== "object" || obj === null) return obj;
  return Object.keys(obj)
    .sort()
    .reduce((res: Record<string, any>, key: string) => {
      res[key] = typeof obj[key] === "object" && obj[key] !== null ? sortObject(obj[key]) : obj[key];
      return res;
    }, {});
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 1. Mandatory IPN Secret & Signature Verification (Fail-Closed)
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    const hmacHeader = req.headers.get("x-nowpayments-sig");

    if (!ipnSecret || !hmacHeader) {
      return NextResponse.json({ error: "Missing signature or webhook secret configuration" }, { status: 401 });
    }

    const sortedString = JSON.stringify(sortObject(payload));
    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(sortedString);
    const signature = hmac.digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const headerBuf = Buffer.from(hmacHeader, "hex");

    if (sigBuf.length !== headerBuf.length || !crypto.timingSafeEqual(sigBuf, headerBuf)) {
      // Fallback check against raw body in case keys weren't sorted by provider
      const rawHmac = crypto.createHmac("sha512", ipnSecret);
      rawHmac.update(bodyText);
      const rawSig = rawHmac.digest("hex");
      const rawSigBuf = Buffer.from(rawSig, "hex");
      if (rawSigBuf.length !== headerBuf.length || !crypto.timingSafeEqual(rawSigBuf, headerBuf)) {
        return NextResponse.json({ error: "Invalid IPN signature" }, { status: 400 });
      }
    }

    const { payment_status, order_id, actually_paid, outcome_amount, pay_currency } = payload;

    // 2. Only accept confirmed or finished payments
    const validStatuses = ["finished", "confirmed", "partially_paid"];
    if (!validStatuses.includes(payment_status)) {
      return NextResponse.json({ success: true, message: `Status '${payment_status}' acknowledged; not crediting.` });
    }

    // 3. Strictly use actually paid / received amount (NEVER fallback to order price)
    const creditAmountUsd = parseFloat(actually_paid || outcome_amount || "0");
    if (!Number.isFinite(creditAmountUsd) || creditAmountUsd <= 0) {
      return NextResponse.json({ success: true, message: "No valid positive payment amount detected." });
    }

    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json({ error: "Missing valid order_id" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 4. Idempotency Check: Prevent duplicate credit
    const { data: existingTx } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("reference", order_id)
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      return NextResponse.json({ success: true, message: "Order already processed." });
    }

    // 5. Extract and strictly validate User ID as UUID (format: crypto_timestamp_userId)
    const orderParts = order_id.split("_");
    const userIdentifier = orderParts.slice(2).join("_");

    if (!userIdentifier || !UUID_REGEX.test(userIdentifier)) {
      return NextResponse.json({ error: "Invalid user identifier in order_id" }, { status: 400 });
    }

    const { data: matchedUser } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", userIdentifier)
      .maybeSingle();

    if (!matchedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 6. Fetch exchange rate for NGN wallet balance
    const { data: appSettings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate')
      .eq('id', 1)
      .single();
    const exchangeRate = appSettings?.exchange_rate || 1500;
    const creditAmountNgn = Math.round(creditAmountUsd * exchangeRate);

    // 7. Wallet Credit
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance_ngn, balance_usd, lifetime_deposits_usd")
      .eq("user_id", matchedUser.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const newNgnBalance = (Number(wallet.balance_ngn) || 0) + creditAmountNgn;
    const newLifetimeDeposits = (Number(wallet.lifetime_deposits_usd) || 0) + creditAmountUsd;

    await supabaseAdmin
      .from("wallets")
      .update({
        balance_ngn: newNgnBalance,
        balance_usd: wallet.balance_usd || 0,
        lifetime_deposits_usd: newLifetimeDeposits
      })
      .eq("user_id", matchedUser.id);

    const isPartial = payment_status === "partially_paid";
    const statusLabel = isPartial ? "Partially Paid Deposit" : "Completed Deposit";

    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: matchedUser.id,
        type: "deposit",
        amount: creditAmountNgn,
        currency: "NGN",
        status: "Completed",
        reference: order_id,
        description: `Crypto ${statusLabel} ($${creditAmountUsd.toFixed(2)} USDT / ₦${creditAmountNgn.toLocaleString()})`
      });

    await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: matchedUser.id,
        type: "Deposit",
        amount: creditAmountNgn,
        currency: "NGN",
        status: "Success",
        reference: order_id,
        description: `Crypto ${statusLabel} ($${creditAmountUsd.toFixed(2)} USDT / ₦${creditAmountNgn.toLocaleString()})`
      });

    // 8. Affiliate Commission
    try {
      const { creditAffiliateCommission } = await import("@/lib/affiliate-engine");
      await creditAffiliateCommission({
        userId: matchedUser.id,
        depositAmountNgn: creditAmountNgn,
        reference: order_id,
        gateway: "Crypto",
      });
    } catch (affiliateErr) {
      console.error("Crypto Affiliate Payout Error:", affiliateErr);
    }

    // 9. Notifications
    await notifyDepositAlert({
      userEmail: matchedUser.full_name || matchedUser.id,
      amount: `$${creditAmountUsd.toFixed(2)} USD${isPartial ? ' (Partial)' : ''}`,
      method: `Crypto (${pay_currency?.toUpperCase() || 'USDT'})`,
      reference: order_id
    });

    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(matchedUser.id);
      const customerEmail = authUser?.user?.email;
      if (customerEmail) {
        const { sendDepositConfirmationEmail } = await import("@/lib/resend");
        sendDepositConfirmationEmail({
          userEmail: customerEmail,
          amount: creditAmountUsd,
          currency: "USD",
          reference: order_id,
          gateway: `Crypto (${pay_currency?.toUpperCase() || 'USDT'})`,
        }).catch((e) => console.error("Failed to dispatch crypto deposit confirmation email:", e));
      }
    } catch (emailErr) {
      console.error("Crypto deposit email error:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Crypto webhook error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
