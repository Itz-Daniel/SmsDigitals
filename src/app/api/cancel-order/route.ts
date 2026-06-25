import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, SmspvaApi } from "@/lib/providers/sms-providers";

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

    // 1. Fetch Rental
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: "Rental not found." }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ error: "Cannot cancel an order that is not waiting." }, { status: 400 });
    }

    // 2. Validate time elapsed
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    if (elapsedSeconds < 150) {
      return NextResponse.json({ error: "Cannot cancel order before 2 minutes and 30 seconds." }, { status: 403 });
    }

    // 3. Hit Provider API to Cancel
    console.log(`[${rental.provider}] Telling provider to cancel order ${rental.order_id}...`);
    
    let cancelledOnProvider = false;
    try {
      if (rental.provider === "5sim") {
        cancelledOnProvider = await FiveSimApi.cancelOrder(rental.order_id);
      } else if (rental.provider === "grizzly") {
        cancelledOnProvider = await GrizzlyApi.cancelOrder(rental.order_id);
      } else if (rental.provider === "smspva") {
        // Fallback country to "1" since it wasn't saved in DB, may need adjustment
        cancelledOnProvider = await SmspvaApi.cancelOrder(rental.order_id, "1", rental.service);
      }
    } catch (apiError) {
      console.error(`Provider Cancellation Error [${rental.provider}]:`, apiError);
      // We will still proceed to refund the user locally even if the provider throws an error, 
      // since the timer has expired.
    }

    // 4. Refund Wallet & Mark Cancelled
    const supabaseAdmin = createAdminClient();
    const { error: refundError } = await supabaseAdmin.rpc('refund_number', {
      p_rental_id: rental.id,
      p_status: 'Cancelled'
    });

    if (refundError) {
      console.error("Refund error during cancellation:", refundError);
      return NextResponse.json({ error: "Failed to process refund." }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'Cancelled' });

  } catch (error: unknown) {
    console.error("Cancel Order API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
