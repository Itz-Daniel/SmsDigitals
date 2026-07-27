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

      // Attempt RPC Refund first
      const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      // Bulletproof Direct JS Wallet Refund Fallback
      if (refundError) {
        console.warn("[Auto-Refund Engine] RPC fallback executed:", refundError.message);

        await supabaseAdmin
          .from('rentals')
          .update({ status: 'Expired', updated_at: new Date().toISOString() })
          .eq('id', rental.id);

        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance_usd, balance_ngn')
          .eq('user_id', rental.user_id)
          .single();

        if (wallet) {
          if (rental.currency === 'NGN') {
            await supabaseAdmin
              .from('wallets')
              .update({ balance_ngn: (wallet.balance_ngn || 0) + rental.cost })
              .eq('user_id', rental.user_id);
          } else {
            await supabaseAdmin
              .from('wallets')
              .update({ balance_usd: (wallet.balance_usd || 0) + rental.cost })
              .eq('user_id', rental.user_id);
          }
        }
      }

      refundedCount++;

      // Log transaction history
      await supabaseAdmin.from('transactions').insert({
        user_id: rental.user_id,
        type: 'Refund',
        amount: rental.cost,
        currency: rental.currency || 'USD',
        status: 'Success',
        reference: `refund_auto_${rental.order_id || rental.id}`,
        description: `Auto-refunded expired ${rental.service || 'SMS'} number order (${rental.phone_number})`
      });
    }

    return refundedCount;
  } catch (err) {
    console.error("Auto-Refund Engine error:", err);
    return 0;
  }
}
