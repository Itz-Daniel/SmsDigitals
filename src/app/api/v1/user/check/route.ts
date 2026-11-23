import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing or invalid order_id query parameter." }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid bearer token." }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Authenticate token: Check if it's an API Key or Supabase Auth JWT
    let authenticatedUserId: string | null = null;

    // Check user_api_keys first
    const { data: apiKeyRecord } = await supabaseAdmin
      .from("user_api_keys")
      .select("user_id, is_active")
      .eq("api_key", token)
      .eq("is_active", true)
      .maybeSingle();

    if (apiKeyRecord?.user_id) {
      authenticatedUserId = apiKeyRecord.user_id;
    } else {
      // Check as Supabase JWT
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.id) {
        authenticatedUserId = user.id;
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Invalid or expired authorization token." }, { status: 401 });
    }

    // 2. Fetch rental scoped strictly to authenticated user (Prevent BOLA/IDOR)
    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('order_id, phone_number, service, status, sms_code, cost, user_id')
      .eq('order_id', orderId)
      .eq('user_id', authenticatedUserId)
      .maybeSingle();

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
    console.error("Order check API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
