import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header. Format: Bearer sd_live_..." }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: items } = await supabaseAdmin
      .from('marketplace_items')
      .select('id, name, category, price_usd, price_ngn, in_stock, description')
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      total_items: items?.length || 0,
      catalog: items || [
        { id: "mkt_fb_01", name: "Facebook Verified PVA (Aged 2022)", category: "Social", price_usd: 4.50, price_ngn: 6750, in_stock: 42, description: "Includes 2FA + Cookie Session Data" },
        { id: "mkt_tg_02", name: "Telegram Session Account (US +1)", category: "Messaging", price_usd: 2.20, price_ngn: 3300, in_stock: 108, description: "tdata + session file download" },
        { id: "mkt_ig_03", name: "Instagram PVA (500+ Followers)", category: "Social", price_usd: 8.00, price_ngn: 12000, in_stock: 15, description: "Clean IP registered account" }
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
