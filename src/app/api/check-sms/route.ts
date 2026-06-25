import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { order_id } = await req.json();

    if (!process.env.SMSPOOL_API_KEY) {
      return NextResponse.json({ error: "SMSPool API Key not configured" }, { status: 500 });
    }

    // 1. Verify this order belongs to the user and is still waiting
    const { data: rental } = await supabase
      .from("rentals")
      .select("status, sms_code")
      .eq("order_id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ status: rental.status, sms_code: rental.sms_code });
    }

    // 2. Poll SMSPool API
    const params = new URLSearchParams();
    params.append('key', process.env.SMSPOOL_API_KEY);
    params.append('orderid', order_id);

    const checkRes = await fetch("https://api.smspool.net/sms/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const checkData = await checkRes.json();

    // 3. Process SMSPool Status
    const status = parseInt(checkData.status);

    if (status === 3) {
      // SUCCESS: SMS Received
      const code = checkData.sms;
      
      const supabaseAdmin = createAdminClient();
      
      await supabaseAdmin
        .from("rentals")
        .update({ status: 'Received', sms_code: code })
        .eq("order_id", order_id);

      return NextResponse.json({ status: "Received", sms_code: code });

    } else if (status === 6) {
      // CANCELLED / TIMEOUT: Refund the user
      const supabaseAdmin = createAdminClient();
      const { data: refundData, error: refundError } = await supabaseAdmin.rpc('refund_rental', {
        p_order_id: order_id
      });

      if (refundError || !refundData?.success) {
        console.error("Refund failed during cancel hook:", refundError || refundData);
      }

      return NextResponse.json({ status: "Cancelled", error: "Number expired or cancelled. You have been refunded." });

    } else if (status === 1) {
      // PENDING: Still waiting
      return NextResponse.json({ status: "Waiting" });
    } else {
      // Unknown status or failure
      return NextResponse.json({ error: checkData.message || "Unknown error" }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("Check SMS API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
