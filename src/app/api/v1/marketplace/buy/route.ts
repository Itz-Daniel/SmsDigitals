import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
    }

    const { item_id, quantity = 1, currency = "USD" } = await req.json();

    if (!item_id) {
      return NextResponse.json({ error: "Missing item_id parameter." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch user wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('user_id, balance_usd')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      order_id: `mkt_ord_${Math.floor(100000 + Math.random() * 900000)}`,
      item_id: item_id,
      quantity: quantity,
      total_cost: 4.50 * quantity,
      currency: currency,
      credentials: [
        "login: password123 | 2fa_key: JBSWY3DPEHPK3PXP | cookies: [{name: 'sessionid', value: 'xyz...'}]"
      ],
      download_url: "https://smsdigitals.vercel.app/api/marketplace/download?order=mkt_ord_102",
      delivered_at: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
