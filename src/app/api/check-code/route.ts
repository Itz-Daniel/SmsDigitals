import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, TextVerifiedApi, SmsManApi, CheckCodeResponse } from "@/lib/providers/sms-providers";
import { processExpiredOrdersRefund } from "@/lib/refund-engine";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rental_id, simulate_code } = await req.json();

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

    // 🧪 SIMULATE TEST SMS CODE (For Sandbox / Local Testing)
    if (simulate_code || rental.order_id?.startsWith('mock_') || rental.order_id?.startsWith('test_')) {
      const codeToSet = simulate_code || Math.floor(100000 + Math.random() * 900000).toString();
      const supabaseAdmin = createAdminClient();

      await supabaseAdmin
        .from('rentals')
        .update({ 
          status: 'Received', 
          sms_code: codeToSet,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);

      return NextResponse.json({ status: 'Received', code: codeToSet, message: '🧪 Test SMS Code Simulated!' });
    }

    // If it's already received or expired, return current status
    if (rental.status !== 'Waiting') {
      return NextResponse.json({ status: rental.status, code: rental.sms_code });
    }

    // 2. Check 20-minute expiration self-healing
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    if (elapsedSeconds >= 1200) {
      // Order has passed 20 minutes without an OTP code -> Auto-refund!
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      // Record Refund Transaction Ledger
      await supabaseAdmin.from('transactions').insert({
        user_id: user.id,
        type: 'Refund',
        amount: rental.cost,
        currency: rental.currency || 'USD',
        status: 'Success',
        reference: `refund_auto_${rental.order_id}`,
        description: `Auto-refunded expired ${rental.service || 'SMS'} number order (${rental.phone_number})`
      });

      return NextResponse.json({ 
        status: 'Expired', 
        code: null,
        message: '⏳ Order expired after 20 minutes with no SMS code. Cost refunded to your balance.' 
      });
    }

    // Trigger real-time background sweep for any other expired orders
    processExpiredOrdersRefund().catch(() => {});

    // 3. Query the appropriate Provider API
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
        providerRes = await SmspvaApi.checkCode(rental.order_id, rental.country || "us", rental.service);
      }
    } catch (apiError) {
      console.error(`Provider API Error [${rental.provider}]:`, apiError);
      return NextResponse.json({ status: 'Waiting', code: null });
    }

    const supabaseAdmin = createAdminClient();

    if (providerRes && providerRes.status === 'Received' && providerRes.code) {
      // Mark as Received in DB
      await supabaseAdmin
        .from('rentals')
        .update({ 
          status: 'Received', 
          sms_code: providerRes.code,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);

      return NextResponse.json({ status: 'Received', code: providerRes.code });
    }

    if (providerRes && providerRes.status === 'Expired') {
      // Mark as Expired and Refund
      await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      return NextResponse.json({ status: 'Expired', code: null });
    }

    return NextResponse.json({ status: 'Waiting', code: null });

  } catch (error: any) {
    console.error("Check Code API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
