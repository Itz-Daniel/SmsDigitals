import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, ProviderResponse } from "@/lib/providers/sms-providers";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { rentalId } = await req.json();

    if (!rentalId) {
      return NextResponse.json({ error: "Rental ID is required." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch Rental Record
    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .or(`id.eq.${rentalId},order_id.eq.${rentalId}`)
      .eq('user_id', user.id)
      .single();

    if (!rental) {
      return NextResponse.json({ error: "Rental order not found." }, { status: 404 });
    }

    if (rental.status !== 'Waiting') {
      return NextResponse.json({ error: `Rental is already ${rental.status.toLowerCase()}.` }, { status: 400 });
    }

    // 2. Check elapsed time (Must be >= 60 seconds for AI Line Fixer)
    const createdAt = new Date(rental.created_at).getTime();
    const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);

    if (elapsedSeconds < 60) {
      return NextResponse.json({ 
        error: `Please allow ${60 - elapsedSeconds} more seconds for carrier SMS transmission before triggering AI Auto-Switch.` 
      }, { status: 400 });
    }

    // 3. Attempt Provider Cancellation for old line
    const oldProvider = rental.provider || '5sim';
    try {
      if (oldProvider.toLowerCase().includes('5sim')) {
        await FiveSimApi.cancelOrder(rental.order_id);
      } else if (oldProvider.toLowerCase().includes('grizzly')) {
        await GrizzlyApi.cancelOrder(rental.order_id);
      }
    } catch (e) {
      console.warn("AI Line Fixer: Old provider cancel warning:", e);
    }

    // 4. Provision Fresh Line from Backup Carrier
    const country = rental.country || rental.region || 'us';
    const service = rental.service || 'whatsapp';

    const backupProviders = [
      new GrizzlyApi(),
      new FiveSimApi()
    ];

    let freshResponse: ProviderResponse | null = null;
    let newProviderName = "";

    for (const provider of backupProviders) {
      if (provider.name === oldProvider) continue; // Skip failed provider

      try {
        const res = await provider.rentNumber(country, service);
        if (res && res.success && res.phoneNumber) {
          freshResponse = res;
          newProviderName = provider.name;
          break;
        }
      } catch {
        console.warn(`AI Line Fixer: Provider ${provider.name} failed for ${country}/${service}`);
      }
    }

    if (!freshResponse) {
      return NextResponse.json({ 
        error: "All carrier networks are currently congested. Please try again in 1 minute." 
      }, { status: 503 });
    }

    // 5. Update Rental Record in Database with Fresh Line
    const newExpiresAt = new Date(Date.now() + 15 * 60000).toISOString();

    const { data: updatedRental } = await supabaseAdmin
      .from('rentals')
      .update({
        order_id: freshResponse.orderId,
        phone_number: freshResponse.phoneNumber,
        provider: newProviderName,
        status: 'Waiting',
        expires_at: newExpiresAt,
        created_at: new Date().toISOString() // Reset timer for fresh line
      })
      .eq('id', rental.id)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      rental: {
        id: updatedRental?.id || rental.id,
        phone_number: freshResponse.phoneNumber,
        order_id: freshResponse.orderId,
        status: 'Waiting',
        service: rental.service,
        region: rental.region,
        currency: rental.currency,
        cost: rental.cost,
        created_at: newExpiresAt
      },
      message: `⚡ AI Auto-Switch Success! Replaced stalled line with fresh line (${freshResponse.phoneNumber}).`
    });

  } catch (error: unknown) {
    console.error("AI Fix Line API Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to execute AI line auto-switch." }, { status: 500 });
  }
}
