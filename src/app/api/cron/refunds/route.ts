import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi, SmsManApi, TextVerifiedApi } from "@/lib/providers/sms-providers";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Validate CRON_SECRET
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Fetch all Waiting rentals older than 20 minutes
    // 20 minutes = 1200000 ms
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: expiredRentals, error: fetchError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('status', 'Waiting')
      .lt('created_at', twentyMinsAgo);

    if (fetchError) {
      console.error("Cron fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredRentals || expiredRentals.length === 0) {
      return NextResponse.json({ message: "No expired rentals found", refunded_count: 0 });
    }

    let refundedCount = 0;

    // 3. Loop and Cancel/Refund
    for (const rental of expiredRentals) {
      console.log(`[Cron] Cancelling expired rental ${rental.id} (${rental.provider})...`);
      
      try {
        if (rental.provider === "5sim") {
          await FiveSimApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "grizzly") {
          await GrizzlyApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "smspva") {
          // Using "1" as fallback country code as it's not stored on the rental row currently
          await SmspvaApi.cancelOrder(rental.order_id, "1", rental.service);
        } else if (rental.provider === "smsman") {
          await SmsManApi.cancelOrder(rental.order_id);
        } else if (rental.provider === "textverified") {
          await TextVerifiedApi.cancelOrder(rental.order_id);
        }
      } catch (apiError) {
        console.error(`[Cron] Provider Cancellation Error [${rental.provider}]:`, apiError);
        // Continue to local refund even if provider fails to cancel, to ensure user gets their money back
      }

      // Refund locally
      const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
        p_rental_id: rental.id,
        p_status: 'Expired'
      });

      if (refundError) {
        console.error(`[Cron] Local refund failed for rental ${rental.id}:`, refundError);
      } else {
        refundedCount++;
      }
    }

    return NextResponse.json({ message: "Cron complete", refunded_count: refundedCount });

  } catch (error: any) {
    console.error("Cron API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
