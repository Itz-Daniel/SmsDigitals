import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { isUserAdmin } from "@/lib/admin-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isUserAdmin(user)) {
      return NextResponse.json({ error: "Forbidden. Admins only." }, { status: 403 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    }

    // Call the refund RPC we created in the migration
    const { data: result, error } = await supabase.rpc('refund_digital_order', {
      p_order_id: orderId
    });

    if (error || !result?.success) {
      console.error("Refund RPC error:", error || result?.error);
      return NextResponse.json({ error: result?.error || "Database error processing refund." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Order refunded successfully. Funds have been returned to the user's wallet."
    });

  } catch (error: any) {
    console.error("Admin Refund API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
