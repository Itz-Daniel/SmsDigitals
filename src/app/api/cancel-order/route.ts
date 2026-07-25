import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, SmsManApi, TextVerifiedApi } from "@/lib/providers/sms-providers";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { rental_id } = await req.json();

    if (!rental_id) {
      return NextResponse.json({ error: "Missing rental_id parameter." }, { status: 400 });
    }

    // 1. Fetch Rental Record
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: "Rental order not found." }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ error: `Cannot cancel an order that is currently in '${rental.status}' status.` }, { status: 400 });
    }

    // 2. Validate time elapsed
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    // Allow manual cancellation after 2 minutes (120s), or auto-cancellation after 20 minutes (1200s)
    if (elapsedSeconds < 120) {
      const waitSeconds = Math.ceil(120 - elapsedSeconds);
      return NextResponse.json({ 
        error: `🚫 Provider Policy: Please wait ${waitSeconds} more seconds before cancelling this order.` 
      }, { status: 403 });
    }

    // 3. Attempt Provider Denial / Cancellation API
    console.log(`[${rental.provider}] Cancelling order ${rental.order_id} (Country: ${rental.country}, Service: ${rental.service})...`);
    
    let cancelledOnProvider = false;
    try {
      if (rental.provider === "5sim") {
        cancelledOnProvider = await FiveSimApi.cancelOrder(rental.order_id);
      } else if (rental.provider === "grizzly") {
        cancelledOnProvider = await GrizzlyApi.cancelOrder(rental.order_id);
      } else if (rental.provider === "smspva") {
        cancelledOnProvider = await SmspvaApi.cancelOrder(
          rental.order_id, 
          rental.country || "us", 
          rental.service || "wa"
        );
      } else if (rental.provider === "smsman") {
        cancelledOnProvider = await SmsManApi.cancelOrder(rental.order_id);
      } else if (rental.provider === "textverified") {
        cancelledOnProvider = await TextVerifiedApi.cancelOrder(rental.order_id);
      }
    } catch (apiError) {
      console.error(`Provider Cancellation Warning [${rental.provider}]:`, apiError);
      // We still proceed to refund the user locally so their money is never trapped
    }

    // 4. GUARANTEED LOCAL WALLET REFUND & STATUS UPDATE
    const supabaseAdmin = createAdminClient();
    const finalStatus = elapsedSeconds >= 1200 ? 'Expired' : 'Cancelled';

    const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
      p_rental_id: rental.id,
      p_status: finalStatus
    });

    if (refundError) {
      console.error("Refund error during cancellation:", refundError);
      return NextResponse.json({ error: "Failed to process wallet refund. Please contact support." }, { status: 500 });
    }

    // Record Refund Transaction Ledger
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Refund',
      amount: rental.cost,
      currency: rental.currency || 'USD',
      status: 'Success',
      reference: `refund_${rental.order_id}`,
      description: `Refunded ${rental.service || 'SMS'} number order (${rental.phone_number})`
    });

    return NextResponse.json({ 
      success: true, 
      status: finalStatus,
      message: `🎉 Order cancelled successfully! ${rental.currency === 'USD' ? '$' : '₦'}${rental.cost} refunded to your wallet.`
    });

  } catch (error: any) {
    console.error("Cancel Order API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel order." }, { status: 500 });
  }
}
