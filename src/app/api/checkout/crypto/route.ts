import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOWPaymentsApi } from "@/lib/nowpayments";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amountUsd, coin } = await req.json();

    if (!amountUsd || amountUsd < 1) {
      return NextResponse.json({ error: "Minimum deposit amount is $1.00." }, { status: 400 });
    }

    const orderId = `crypto_${Date.now()}_${user.id.substring(0, 6)}`;
    const nowpayments = new NOWPaymentsApi();

    const payment = await nowpayments.createPayment({
      price_amount: amountUsd,
      price_currency: "usd",
      pay_currency: coin || "usdttrc20",
      order_id: orderId,
      order_description: `Wallet Funding for ${user.email}`,
      ipn_callback_url: "https://smsdigitals.vercel.app/api/webhooks/nowpayments"
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency.toUpperCase(),
      priceAmountUsd: payment.price_amount,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payment.pay_address)}`
    });
  } catch (err: any) {
    console.error("Crypto checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate crypto payment." }, { status: 500 });
  }
}
