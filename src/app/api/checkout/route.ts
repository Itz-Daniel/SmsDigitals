import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, currency, type } = await req.json();

    if (type === "stripe" && currency === "USD") {
      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Wallet Funding — $${amount} USD`,
              },
              unit_amount: amount * 100, // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/fund`,
        metadata: {
          user_id: user.id, // Very important for the webhook
        },
      });

      return NextResponse.json({ url: session.url });

    } else if (type === "paystack" && currency === "NGN") {
      // Create Paystack Checkout Session
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount * 100, // Paystack expects kobo
          currency: "NGN",
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?payment=success`,
          metadata: {
            user_id: user.id, // Very important for the webhook
          },
        }),
      });

      const data = await response.json();
      if (data.status) {
        return NextResponse.json({ url: data.data.authorization_url });
      } else {
        throw new Error(data.message);
      }
    } else {
      return NextResponse.json({ error: "Invalid payment type or currency" }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
