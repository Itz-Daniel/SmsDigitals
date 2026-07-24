import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSettingsSchema, getFieldErrors } from "@/lib/validation";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('api_settings')
      .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
      .limit(1)
      .single();

    if (error) {
      // Fallback
      const { data: fallback } = await supabase
        .from('settings')
        .select('profit_margin, affiliate_percentage')
        .eq('id', 1)
        .single();

      return NextResponse.json({ 
        profit_margin: fallback?.profit_margin || 0.4,
        affiliate_percentage: fallback?.affiliate_percentage || 5.0,
        brand_pricing: null,
        rental_min_floor_usd: 2.50,
        rental_daily_rate_usd: 1.50,
        rental_margin_percent: 40
      });
    }

    return NextResponse.json({ 
      profit_margin: settings?.profit_margin || 0.4,
      affiliate_percentage: settings?.affiliate_percentage || 5.0,
      brand_pricing: settings?.brand_pricing || null,
      rental_min_floor_usd: settings?.rental_min_floor_usd || 2.50,
      rental_daily_rate_usd: settings?.rental_daily_rate_usd || 1.50,
      rental_margin_percent: settings?.rental_margin_percent || 40
    });
  } catch (error: any) {
    console.error("Settings GET API Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = adminSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = getFieldErrors(validationResult.error);
      const firstError = Object.values(errors)[0] || "Validation failed";
      return NextResponse.json({ error: `Validation Error: ${firstError}`, errors }, { status: 400 });
    }

    const { 
      profit_margin, 
      affiliate_percentage, 
      brand_pricing,
      rental_min_floor_usd,
      rental_daily_rate_usd,
      rental_margin_percent
    } = validationResult.data;

    const updateData: any = {};
    if (profit_margin !== undefined) updateData.profit_margin = profit_margin;
    if (affiliate_percentage !== undefined) updateData.affiliate_percentage = affiliate_percentage;
    if (brand_pricing !== undefined) updateData.brand_pricing = brand_pricing;
    if (rental_min_floor_usd !== undefined) updateData.rental_min_floor_usd = rental_min_floor_usd;
    if (rental_daily_rate_usd !== undefined) updateData.rental_daily_rate_usd = rental_daily_rate_usd;
    if (rental_margin_percent !== undefined) updateData.rental_margin_percent = rental_margin_percent;

    const supabaseAdmin = createAdminClient();
    
    // Update api_settings table
    const { error: apiErr } = await supabaseAdmin
      .from('api_settings')
      .update(updateData)
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Also update settings table fallback
    await supabaseAdmin
      .from('settings')
      .update(updateData)
      .eq('id', 1);

    if (apiErr) {
      console.warn("Supabase api_settings update warning:", apiErr);
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully!", ...updateData });
  } catch (error: any) {
    console.error("Settings POST API Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
