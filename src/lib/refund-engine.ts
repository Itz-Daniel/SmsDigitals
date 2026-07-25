import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, SmsManApi, TextVerifiedApi } from "@/lib/providers/sms-providers";

/**
 * 🔄 DUAL-LAYER AUTO-REFUND ENGINE
 * Scans for waiting SMS orders older than 20 minutes (1,200,000 ms),
 * cancels them on provider API, and refunds local user wallets.
 */
export async function processExpiredOrdersRefund(): Promise<number> {
  try {
    const supabaseAdmin = createAdminClient();
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: expiredRentals, error: fetchError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('status', 'Waiting')
      .lt('created_at', twentyMinsAgo);

    if (fetchError || !expiredRentals || expiredRentals.length === 0) {
      return 0;
    }

    let refundedCount = 0;

    for (const rental of expiredRentals) {
      console.log(`[Auto-Refund Engine] Processing expired order ${rental.id} (${rental.provider})...`);

      try {
        if (rental.provider === "5sim") {
          await FiveSimApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "grizzly") {
          await GrizzlyApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "smspva") {
          await SmspvaApi.cancelOrder(rental.order_id, rental.country || "us", rental.service || "wa");
        } else if (rental.provider === "smsman") {
          await SmsManApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "textverified") {
          await TextVerifiedApi.cancelOrder(rental.order_id);
        }
      } catch (apiError) {
        console.error(`[Auto-Refund Engine] Provider Cancellation Warning [${rental.provider}]:`, apiError);
      }

      // Local Wallet Refund via Supabase RPC
      const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      if (refundError) {
        console.error(`[Auto-Refund Engine] Wallet refund error for order ${rental.id}:`, refundError);
      } else {
        refundedCount++;
        // Log transaction history
        await supabaseAdmin.from('transactions').insert({
          user_id: rental.user_id,
          type: 'Refund',
          amount: rental.cost,
          currency: rental.currency || 'USD',
          status: 'Success',
          reference: `refund_auto_${rental.order_id}`,
          description: `Auto-refunded expired ${rental.service || 'SMS'} number order (${rental.phone_number})`
        });
      }
    }

    return refundedCount;
  } catch (err) {
    console.error("Auto-Refund Engine error:", err);
    return 0;
  }
}
