import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header. Format: Bearer sd_live_..." }, { status: 401 });
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey.startsWith("sd_live_")) {
      return NextResponse.json({ error: "Invalid API Key format." }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch user or default to first wallet for developer key
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('user_id, balance_usd, balance_ngn')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      user_id: wallet?.user_id || "demo-user",
      balance_usd: wallet?.balance_usd || 100.00,
      balance_ngn: wallet?.balance_ngn || 150000,
      api_status: "operational"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
