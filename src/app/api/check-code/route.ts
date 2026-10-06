import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, CheckCodeResponse } from "@/lib/providers/sms-providers";
import { processExpiredOrdersRefund } from "@/lib/refund-engine";

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

    // If it's already received or expired, return current status
    if (rental.status !== 'Waiting') {
      return NextResponse.json({ status: rental.status, code: rental.sms_code });
    }

    // 2. Check 20-minute expiration self-healing
    const createdAt = new Date(rental.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - createdAt) / 1000;

    if (elapsedSeconds >= 1200) {
      // Order has passed 20 minutes without an OTP code -> Auto-refund directly to wallet!
      const supabaseAdmin = createAdminClient();

      // Fetch exchange rate for exact currency conversion
      const { data: appSettings } = await supabaseAdmin
        .from('settings')
        .select('exchange_rate')
        .eq('id', 1)
        .single();
      const exchangeRate = appSettings?.exchange_rate || 1500;

      const refundNgn = rental.currency === 'USD' 
        ? Math.round(Number(rental.cost) * exchangeRate)
        : Number(rental.cost);

      // Atomically transition status from 'Waiting' to 'Expired' (CAS guard prevents multi-tab double refunds)
      const { data: updatedRental } = await supabaseAdmin
        .from('rentals')
        .update({ status: 'Expired', updated_at: new Date().toISOString() })
        .eq('id', rental.id)
        .eq('status', 'Waiting')
        .select('id, cost, currency')
        .maybeSingle();

      if (!updatedRental) {
        // Another concurrent request or tab has already processed the refund!
        return NextResponse.json({ 
          status: 'Expired', 
          code: null,
          message: "Order expired and refund has already been processed." 
        });
      }

      // Credit User Wallet in appropriate currency
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance_ngn, balance_usd')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        if (rental.currency === 'USD') {
          const currentUsd = Number(wallet.balance_usd) || 0;
          await supabaseAdmin
            .from('wallets')
            .update({ 
              balance_usd: currentUsd + Number(rental.cost),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else {
          const currentNgn = Number(wallet.balance_ngn) || 0;
          await supabaseAdmin
            .from('wallets')
            .update({ 
              balance_ngn: currentNgn + refundNgn,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
      }

      // Record Refund Transaction Ledger
      await supabaseAdmin.from('transactions').insert({
        user_id: user.id,
        type: 'Refund',
        amount: rental.cost,
        currency: rental.currency || 'USD',
        status: 'Success',
        reference: `refund_auto_${rental.order_id || rental.id}`,
        description: `Auto-refunded expired ${rental.service || 'SMS'} number order (${rental.phone_number})`
      });

      return NextResponse.json({ 
        status: 'Expired', 
        code: null,
        message: `⏳ Order expired after 20 minutes with no SMS code. ${rental.currency === 'USD' ? `$${rental.cost}` : `₦${refundNgn.toLocaleString()}`} refunded to your balance.` 
      });
    }

    // Trigger real-time background sweep for any other expired orders
    processExpiredOrdersRefund().catch(() => {});

    // 3. Query the appropriate Provider API
    let providerRes: CheckCodeResponse | null = null;

    try {
      if (rental.provider === "5sim" || rental.provider?.toLowerCase().includes("5sim")) {
        providerRes = await FiveSimApi.checkCode(rental.order_id);
      } else if (rental.provider === "grizzly" || rental.provider?.toLowerCase().includes("grizzly")) {
        providerRes = await GrizzlyApi.checkCode(rental.order_id);
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
