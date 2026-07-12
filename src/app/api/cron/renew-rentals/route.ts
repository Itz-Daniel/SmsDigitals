import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SmspvaApi } from "@/lib/providers/sms-providers";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Basic auth check for cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Find active rentals that have auto_renew = true and expire in the next 24 hours
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data: rentalsToRenew, error } = await supabaseAdmin
      .from('long_term_rentals')
      .select('*')
      .eq('status', 'Active')
      .eq('auto_renew', true)
      .lt('expires_at', next24Hours);

    if (error) {
      console.error("Cron Error fetching rentals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];

    for (const rental of rentalsToRenew || []) {
      try {
        if (rental.provider !== 'smspva') {
           throw new Error("Provider does not support prolonging.");
        }

        // 1. Hit the Provider API to prolong
        const prolongSuccess = await SmspvaApi.prolongNumber(rental.provider_order_id);
        
        if (!prolongSuccess) {
           throw new Error("SMSPVA failed to prolong the number.");
        }

        // 2. Provider prolonged successfully! Now deduct user's wallet via RPC
        const newExpiresAt = new Date(new Date(rental.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: renewData, error: renewError } = await supabaseAdmin.rpc('renew_long_term_rental', {
          p_rental_id: rental.id,
          p_cost: rental.price_paid, // Assuming cost remains the same
          p_new_expires_at: newExpiresAt
        });

        if (renewError || !renewData?.success) {
          // In a perfect world, we'd cancel the prolong here since user had no money,
          // but if we can't reverse it, we just eat the cost or mark it.
          // For now, fail out.
          results.push({ id: rental.id, success: false, error: renewError?.message || renewData?.error });
        } else {
          results.push({ id: rental.id, success: true });
        }
      } catch (e: any) {
        results.push({ id: rental.id, success: false, error: e.message });
      }
    }

    // Also mark rentals as Expired if they passed expires_at and didn't auto renew
    await supabaseAdmin
      .from('long_term_rentals')
      .update({ status: 'Expired', auto_renew: false })
      .eq('status', 'Active')
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({ success: true, processed: results.length, results });

  } catch (error: any) {
    console.error("Cron Auto-Renew Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
