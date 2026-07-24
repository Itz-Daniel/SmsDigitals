import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, TextVerifiedApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header. Format: Bearer sd_live_..." }, { status: 401 });
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey.startsWith("sd_live_")) {
      return NextResponse.json({ error: "Invalid API Key format." }, { status: 401 });
    }

    const { country = "usa", service = "wa", currency = "USD" } = await req.json();

    const supabaseAdmin = createAdminClient();

    // Fetch user wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('user_id, balance_usd')
      .limit(1)
      .single();

    const userId = wallet?.user_id;

    if (!userId) {
      return NextResponse.json({ error: "User wallet not found." }, { status: 404 });
    }

    const mockOrderId = `ord_${Math.floor(100000 + Math.random() * 900000)}`;
    const mockPhone = `+1 (332) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

    // Create rental
    const { data: rental, error: rentError } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: userId,
        order_id: mockOrderId,
        phone_number: mockPhone,
        service: service,
        provider: 'api-v1-node',
        region: country,
        status: 'Waiting',
        cost: 1.50,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (rentError) {
      console.error("API Rent error:", rentError);
      return NextResponse.json({ error: "Failed to create number rental via API." }, { status: 500 });
    }

    // Schedule mock code delivery after 6 seconds for testing
    setTimeout(async () => {
      const mockCode = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
      await supabaseAdmin
        .from('rentals')
        .update({ status: 'Received', sms_code: mockCode })
        .eq('id', rental.id);
    }, 6000);

    return NextResponse.json({
      success: true,
      order_id: mockOrderId,
      phone_number: mockPhone,
      service: service,
      country: country,
      cost: 1.50,
      currency: currency,
      expires_at: expiresAt
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
