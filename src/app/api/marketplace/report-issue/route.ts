import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    }

    // 1. Fetch order
    const { data: order } = await supabase
      .from('digital_orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status !== 'Completed') {
      return NextResponse.json({ error: `Cannot report issue. Order is already ${order.status}.` }, { status: 400 });
    }

    // 2. Check time limit (15 minutes)
    const purchaseTime = new Date(order.purchased_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - purchaseTime) / (1000 * 60);

    if (diffMinutes > 15) {
      return NextResponse.json({ error: "The 15-minute window to report an issue has expired." }, { status: 403 });
    }

    // 3. Mark as Issue Reported
    const { error: updateError } = await supabase
      .from('digital_orders')
      .update({ 
        status: 'Issue Reported',
        issue_reported_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Issue reported successfully. An admin will review and process your refund shortly."
    });

  } catch (error: any) {
    console.error("Report Issue API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
