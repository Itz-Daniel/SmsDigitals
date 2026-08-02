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

    // 1. Fetch Rental Record safely without throwing UUID syntax errors
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rental_id);

    let rental: any = null;

    if (isUuid) {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('id', rental_id)
        .eq('user_id', user.id)
        .maybeSingle();
      rental = data;
    }

    if (!rental) {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('order_id', rental_id)
        .eq('user_id', user.id)
        .maybeSingle();
      rental = data;
    }

    if (!rental) {
      console.error(`Rental not found for ID ${rental_id}`);
      return NextResponse.json({ error: "Rental order not found in database." }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ error: `Cannot cancel an order that is currently in '${rental.status}' status.` }, { status: 400 });
    }

    // 2. Validate time elapsed (Instant cancellation for Sandbox/Mock/Test orders or after 120s for live carrier orders)
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;
    
    const isSandboxOrder = rental.order_id?.startsWith('sandbox_') || 
                           rental.order_id?.startsWith('mock_') || 
                           rental.order_id?.startsWith('test_') || 
                           rental.provider === 'sandbox' || 
                           rental.provider === 'mock';

    if (elapsedSeconds < 120 && !isSandboxOrder) {
      const waitSeconds = Math.ceil(120 - elapsedSeconds);
      return NextResponse.json({ 
        error: `🚫 Provider Policy: Please wait ${waitSeconds} more seconds before cancelling this order.` 
      }, { status: 403 });
    }

    // 3. Attempt Provider Denial / Cancellation API (Skip for Sandbox/Mock orders)
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
      }
    }

    // 4. GUARANTEED LOCAL WALLET REFUND & STATUS UPDATE
    const supabaseAdmin = createAdminClient();
    const finalStatus = elapsedSeconds >= 1200 ? 'Expired' : 'Cancelled';

    // Attempt RPC Refund first
    const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
      p_rental_id: rental.id,
      p_status: finalStatus
    });

    // Bulletproof Fallback Guard: If RPC fails or missing, perform direct atomic JS wallet credit
    if (refundError) {
      console.warn("RPC refund_number fallback executed:", refundError.message);

      // Mark order as Cancelled/Expired
      await supabaseAdmin
        .from('rentals')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('id', rental.id);

      // Credit User Wallet
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance_usd, balance_ngn')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        if (rental.currency === 'NGN') {
          await supabaseAdmin
            .from('wallets')
            .update({ balance_ngn: (wallet.balance_ngn || 0) + rental.cost })
            .eq('user_id', user.id);
        } else {
          await supabaseAdmin
            .from('wallets')
            .update({ balance_usd: (wallet.balance_usd || 0) + rental.cost })
            .eq('user_id', user.id);
        }
      }
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
