import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: vouchers, error } = await supabaseAdmin
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch vouchers error:", error);
      return NextResponse.json({ vouchers: [] });
    }

    return NextResponse.json({ success: true, vouchers: vouchers || [] });
  } catch (error: any) {
    console.error("Voucher list API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
