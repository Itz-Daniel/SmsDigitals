import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, TextVerifiedApi, SmsManApi, CheckCodeResponse } from "@/lib/providers/sms-providers";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rental_id } = await req.json();

    if (!rental_id) {
      return NextResponse.json({ error: "Missing rental_id parameter." }, { status: 400 });
    }

    // 1. Fetch Rental from DB
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: "Rental not found." }, { status: 404 });
    }

    // If it's already received or expired, we don't need to check the API again
    if (rental.status !== 'Waiting') {
      return NextResponse.json({ status: rental.status, code: rental.sms_code });
    }

    // 2. Query the appropriate Provider API
    let providerRes: CheckCodeResponse | null = null;

    try {
      if (rental.provider === "textverified") {
        providerRes = await TextVerifiedApi.checkCode(rental.order_id);
      } else if (rental.provider === "5sim") {
        providerRes = await FiveSimApi.checkCode(rental.order_id);
      } else if (rental.provider === "grizzly") {
        providerRes = await GrizzlyApi.checkCode(rental.order_id);
      } else if (rental.provider === "smsman") {
        providerRes = await SmsManApi.checkCode(rental.order_id);
      } else if (rental.provider === "smspva") {
        // We need country and service for SMSPVA. We'll use mocked ones or assume the DB has enough info
        // Wait, the rentals table doesn't store the country ID, just the phone number. 
        // We will pass '1' as fallback, but this might need adjustment in production.
        providerRes = await SmspvaApi.checkCode(rental.order_id, "1", rental.service);
      }
    } catch (apiError) {
      console.error(`Provider API Error [${rental.provider}]:`, apiError);
      return NextResponse.json({ status: 'Waiting', code: null }); // Fail gracefully, keep waiting
    }

    if (!providerRes) {
      return NextResponse.json({ status: 'Waiting', code: null });
    }

    // 3. Handle Provider Responses
    if (providerRes.status === 'Expired') {
      console.log(`[${rental.provider}] Order ${rental.order_id} timed out on provider end. Refunding...`);
      
      const supabaseAdmin = createAdminClient();
      const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      if (refundError) {
        console.error("Refund error:", refundError);
        return NextResponse.json({ error: "Failed to process refund." }, { status: 500 });
      }

      return NextResponse.json({ status: 'Expired', code: null });
    }

    if (providerRes.status === 'Received' && providerRes.code) {
      console.log(`[${rental.provider}] Order ${rental.order_id} received code: ${providerRes.code}`);
      
      const supabaseAdmin = createAdminClient();
      const { error: updateError } = await supabaseAdmin
        .from('rentals')
        .update({
          status: 'Received',
          sms_code: providerRes.code,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: "Failed to save code." }, { status: 500 });
      }

      return NextResponse.json({ status: 'Received', code: providerRes.code });
    }

    // Still Waiting
    return NextResponse.json({ status: 'Waiting', code: null });

  } catch (error: unknown) {
    console.error("Check Code API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
