import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await req.json();

    if (!voucherId) {
      return NextResponse.json({ error: "Voucher ID is required." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("vouchers")
      .delete()
      .eq("id", voucherId);

    if (error) {
      console.error("Delete voucher error:", error);
      return NextResponse.json({ error: "Failed to delete voucher code." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Voucher code revoked & deleted successfully." });
  } catch (error: any) {
    console.error("Voucher delete API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
