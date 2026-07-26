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

    // 1. Fetch Rental Record by matching EITHER Supabase UUID 'id' OR provider 'order_id'
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .or(`id.eq.${rental_id},order_id.eq.${rental_id}`)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (fetchError || !rental) {
      console.error(`Rental not found for ID ${rental_id}:`, fetchError);
      return NextResponse.json({ error: "Rental order not found in database." }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ error: `Cannot cancel an order that is currently in '${rental.status}' status.` }, { status: 400 });
    }

    // 2. Validate time elapsed (Allow manual cancellation after 120 seconds or instant in Sandbox mode)
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;
    const isSandboxOrder = rental.order_id?.startsWith('sandbox_') || rental.provider === 'sandbox';

    if (elapsedSeconds < 120 && !isSandboxOrder) {
      const waitSeconds = Math.ceil(120 - elapsedSeconds);
      return NextResponse.json({ 
        error: `🚫 Provider Policy: Please wait ${waitSeconds} more seconds before cancelling this order.` 
      }, { status: 403 });
    }

    // 3. Attempt Provider Denial / Cancellation API (Skip for Sandbox)
    if (!isSandboxOrder) {
      console.log(`[${rental.provider}] Cancelling order ${rental.order_id} (Country: ${rental.country}, Service: ${rental.service})...`);
      
      try {
        if (rental.provider === "5sim") {
          await FiveSimApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "grizzly") {
          await GrizzlyApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "smspva") {
          await SmspvaApi.cancelOrder(
            rental.order_id, 
            rental.country || "us", 
            rental.service || "wa"
          );
        } else if (rental.provider === "smsman") {
          await SmsManApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "textverified") {
          await TextVerifiedApi.cancelOrder(rental.order_id);
        }
      } catch (apiError) {
        console.error(`Provider Cancellation Warning [${rental.provider}]:`, apiError);
        // We still proceed to refund local wallet so user's money is never trapped
      }
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
      reference: `refund_${rental.order_id || rental.id}`,
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
