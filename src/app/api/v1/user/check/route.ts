import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id query parameter." }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('order_id, phone_number, service, status, sms_code, cost')
      .eq('order_id', orderId)
      .single();

    if (!rental) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order_id: rental.order_id,
      phone_number: rental.phone_number,
      service: rental.service,
      status: rental.status,
      sms_code: rental.sms_code,
      cost: rental.cost
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
