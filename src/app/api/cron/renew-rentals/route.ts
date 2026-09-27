import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Fetch exchange rate for conversion if needed
    const { data: appSettings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate')
      .eq('id', 1)
      .single();
    const exchangeRate = appSettings?.exchange_rate || 1500;

    for (const rental of rentalsToRenew || []) {
      try {
        // 1. Fetch user's wallet
        const { data: userWallet } = await supabaseAdmin
          .from('wallets')
          .select('balance_ngn, balance_usd')
          .eq('user_id', rental.user_id)
          .single();

        if (!userWallet) {
          await supabaseAdmin.from('long_term_rentals').update({ auto_renew: false }).eq('id', rental.id);
          results.push({ id: rental.id, success: false, error: 'Wallet not found' });
          continue;
        }

        const totalAvailableNgn = (userWallet.balance_ngn || 0) + ((userWallet.balance_usd || 0) * exchangeRate);
        const costNgn = rental.currency === 'USD' ? rental.price_paid * exchangeRate : rental.price_paid;

        if (totalAvailableNgn < costNgn) {
          // Turn off auto-renew if user has insufficient funds
          await supabaseAdmin.from('long_term_rentals').update({ auto_renew: false }).eq('id', rental.id);
          results.push({ id: rental.id, success: false, error: 'Insufficient wallet balance' });
          continue;
        }

        // 2. Deduct balance from wallets
        const newBalanceNgn = Math.max(0, totalAvailableNgn - costNgn);
        await supabaseAdmin.from('wallets').update({
          balance_ngn: newBalanceNgn,
          balance_usd: 0,
          updated_at: new Date().toISOString()
        }).eq('user_id', rental.user_id);

        // 3. Extend rental by 30 days
        const newExpiresAt = new Date(new Date(rental.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabaseAdmin.from('long_term_rentals').update({
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        }).eq('id', rental.id);

        // 4. Record transaction ledger
        await supabaseAdmin.from('transactions').insert({
          user_id: rental.user_id,
          type: 'Purchase',
          amount: rental.price_paid,
          currency: rental.currency || 'USD',
          status: 'Success',
          reference: `renew_lt_${rental.id}_${Date.now()}`,
          description: `Auto-Renewal: Dedicated line ${rental.service} (${rental.phone_number})`
        });

        results.push({ id: rental.id, success: true, new_expires_at: newExpiresAt });

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
