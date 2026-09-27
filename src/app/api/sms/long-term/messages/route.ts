import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, RentalSmsMessage } from "@/lib/providers/sms-providers";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🛡️ BANNED / FLAGGED ACCOUNT LOCK
    const accountBlock = await enforceActiveAccount(user.id);
    if (accountBlock) return accountBlock;

    const { rental_id } = await req.json();

    if (!rental_id) {
      return NextResponse.json({ error: "Missing rental_id parameter." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch Rental from DB (enforce ownership)
    const { data: rental, error: fetchError } = await supabaseAdmin
      .from('long_term_rentals')
      .select('*')
      .eq('id', rental_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: "Rental not found." }, { status: 404 });
    }

    // Existing cached messages
    const existingMessages: RentalSmsMessage[] = Array.isArray(rental.incoming_sms) ? rental.incoming_sms : [];

    // 2. Poll Provider for live messages
    let providerMessages: RentalSmsMessage[] = [];
    let providerStatus = rental.status;

    try {
      if (rental.provider === '5sim') {
        const res = await FiveSimApi.getRentalMessages(rental.provider_order_id);
        providerMessages = res.messages;
        if (res.status === 'FINISHED' || res.status === 'RECEIVED') {
          providerStatus = 'Active';
        } else if (res.status === 'CANCELED' || res.status === 'TIMEOUT') {
          // If expired on provider end and passed expires_at
          if (new Date(rental.expires_at).getTime() < Date.now()) {
            providerStatus = 'Expired';
          }
        }
      } else if (rental.provider === 'grizzly') {
        const res = await GrizzlyApi.getRentalMessages(rental.provider_order_id);
        providerMessages = res.messages;
      }
    } catch (providerError: any) {
      console.warn(`Provider poll warning for rental ${rental.id}:`, providerError.message || providerError);
      // Even if provider fetch fails temporarily, return whatever messages we already cached
      return NextResponse.json({
        success: true,
        messages: existingMessages,
        status: rental.status,
        expires_at: rental.expires_at,
        warning: "Could not reach provider network. Showing cached messages."
      });
    }

    // 3. Merge & Deduplicate Messages
    const messageMap = new Map<string, RentalSmsMessage>();

    // Add existing
    for (const msg of existingMessages) {
      const key = `${msg.id || ''}_${msg.code || ''}_${msg.date || ''}_${msg.text || ''}`;
      messageMap.set(key, msg);
    }

    // Add new from provider
    for (const msg of providerMessages) {
      const key = `${msg.id || ''}_${msg.code || ''}_${msg.date || ''}_${msg.text || ''}`;
      messageMap.set(key, msg);
    }

    const mergedMessages = Array.from(messageMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 4. Update Database if new messages or status changed
    const needsUpdate = mergedMessages.length !== existingMessages.length || (providerStatus !== rental.status && providerStatus === 'Expired');

    if (needsUpdate) {
      await supabaseAdmin
        .from('long_term_rentals')
        .update({
          incoming_sms: mergedMessages,
          status: providerStatus !== rental.status ? providerStatus : rental.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);
    }

    return NextResponse.json({
      success: true,
      messages: mergedMessages,
      status: providerStatus,
      expires_at: rental.expires_at
    });

  } catch (error: any) {
    console.error("Fetch Rental Messages API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
