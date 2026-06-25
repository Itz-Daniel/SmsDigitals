import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check if user already has a DVA in the database
    const { data: wallet } = await supabase
      .from("wallets")
      .select("account_number, bank_name, account_name")
      .eq("user_id", user.id)
      .single();

    if (wallet?.account_number) {
      return NextResponse.json({
        success: true,
        dva: {
          account_number: wallet.account_number,
          bank_name: wallet.bank_name,
          account_name: wallet.account_name
        }
      });
    }

    // 2. We need to create a Paystack Customer first
    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        first_name: "Blissdigitals",
        last_name: "User",
      }),
    });

    const customerData = await customerRes.json();

    if (!customerData.status) {
      // If customer already exists, Paystack sometimes returns false or we can just ignore it and use the email.
      // Actually, if customer exists, we can still use their email to generate the DVA.
    }

    const customerCode = customerData.data?.customer_code || user.email;

    // 3. Create the Dedicated Virtual Account
    const dvaRes = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: "wema-bank" // Paystack supports Wema, Titan, etc.
      }),
    });

    const dvaData = await dvaRes.json();

    if (!dvaData.status) {
      throw new Error(dvaData.message || "Failed to generate virtual account");
    }

    const account = dvaData.data;

    // 4. Save to Supabase using Admin Key (Bypass RLS for safe update)
    const { createClient: createAdminClient } = require('@supabase/supabase-js');
    const adminSupabase = createAdminClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminSupabase
      .from("wallets")
      .update({
        bank_name: account.bank.name,
        account_number: account.account_number,
        account_name: account.account_name
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      dva: {
        account_number: account.account_number,
        bank_name: account.bank.name,
        account_name: account.account_name
      }
    });

  } catch (error: unknown) {
    console.error("DVA Generation Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
