import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSettingsSchema, getFieldErrors } from "@/lib/validation";
import { isUserAdmin } from "@/lib/admin-guard";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isUserAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resilient fetch from settings (handles cases where rental columns are missing)
    let settings: any = null;
    const { data: sData, error: sErr } = await supabase
      .from('settings')
      .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
      .eq('id', 1)
      .maybeSingle();

    if (sErr && (sErr.message?.includes('column') || sErr.code === 'PGRST204')) {
      const { data: sFallback } = await supabase
        .from('settings')
        .select('profit_margin, affiliate_percentage, brand_pricing')
        .eq('id', 1)
        .maybeSingle();
      settings = sFallback;
    } else {
      settings = sData;
    }

    let apiSettings: any = null;
    const { data: aData, error: aErr } = await supabase
      .from('api_settings')
      .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
      .limit(1)
      .maybeSingle();

    if (aErr && (aErr.message?.includes('column') || aErr.code === 'PGRST204')) {
      const { data: aFallback } = await supabase
        .from('api_settings')
        .select('profit_margin, affiliate_percentage, brand_pricing')
        .limit(1)
        .maybeSingle();
      apiSettings = aFallback;
    } else {
      apiSettings = aData;
    }

    return NextResponse.json({ 
      profit_margin: settings?.profit_margin ?? apiSettings?.profit_margin ?? 0.4,
      affiliate_percentage: settings?.affiliate_percentage ?? apiSettings?.affiliate_percentage ?? 5.0,
      brand_pricing: settings?.brand_pricing ?? apiSettings?.brand_pricing ?? null,
      rental_min_floor_usd: settings?.rental_min_floor_usd ?? settings?.brand_pricing?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? apiSettings?.brand_pricing?.rental_min_floor_usd ?? 0.80,
      rental_daily_rate_usd: settings?.rental_daily_rate_usd ?? settings?.brand_pricing?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? apiSettings?.brand_pricing?.rental_daily_rate_usd ?? 0.50,
      rental_margin_percent: settings?.rental_margin_percent ?? settings?.brand_pricing?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? apiSettings?.brand_pricing?.rental_margin_percent ?? 30
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

    if (!user || !isUserAdmin(user)) {
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

    const supabaseAdmin = createAdminClient();

    // Fetch current brand_pricing to preserve existing values
    let currentBrandPricing: any = {};
    const { data: currentSettings } = await supabaseAdmin
      .from('settings')
      .select('brand_pricing')
      .eq('id', 1)
      .maybeSingle();

    if (currentSettings?.brand_pricing && typeof currentSettings.brand_pricing === 'object') {
      currentBrandPricing = currentSettings.brand_pricing;
    }

    // Merge incoming brand_pricing with rental controls
    const mergedBrandPricing = {
      ...currentBrandPricing,
      ...(brand_pricing || {}),
      ...(rental_min_floor_usd !== undefined ? { rental_min_floor_usd } : {}),
      ...(rental_daily_rate_usd !== undefined ? { rental_daily_rate_usd } : {}),
      ...(rental_margin_percent !== undefined ? { rental_margin_percent } : {})
    };

    const updateData: any = { id: 1, brand_pricing: mergedBrandPricing };
    if (profit_margin !== undefined) updateData.profit_margin = profit_margin;
    if (affiliate_percentage !== undefined) updateData.affiliate_percentage = affiliate_percentage;
    if (rental_min_floor_usd !== undefined) updateData.rental_min_floor_usd = rental_min_floor_usd;
    if (rental_daily_rate_usd !== undefined) updateData.rental_daily_rate_usd = rental_daily_rate_usd;
    if (rental_margin_percent !== undefined) updateData.rental_margin_percent = rental_margin_percent;
    
    // First attempt: upsert with all columns
    let { error: settingsErr } = await supabaseAdmin
      .from('settings')
      .upsert(updateData, { onConflict: 'id' });

    // Fallback attempt: if columns do not exist in the database, persist rental controls inside brand_pricing JSONB
    if (settingsErr && (settingsErr.message?.includes('column') || settingsErr.code === 'PGRST204')) {
      const fallbackData: any = {
        id: 1,
        brand_pricing: mergedBrandPricing
      };
      if (profit_margin !== undefined) fallbackData.profit_margin = profit_margin;
      if (affiliate_percentage !== undefined) fallbackData.affiliate_percentage = affiliate_percentage;

      const { error: fallbackErr } = await supabaseAdmin
        .from('settings')
        .upsert(fallbackData, { onConflict: 'id' });

      settingsErr = fallbackErr;
    }

    // Also sync to api_settings if table exists
    try {
      await supabaseAdmin
        .from('api_settings')
        .upsert({ ...updateData, id: '00000000-0000-0000-0000-000000000001' }, { onConflict: 'id' });
    } catch {
      // ignore fallback if table does not exist
    }

    if (settingsErr) {
      console.error("Supabase settings update error:", settingsErr);
      throw settingsErr;
    }

    return NextResponse.json({ 
      success: true, 
      message: "Settings saved and persisted successfully!", 
      brand_pricing: mergedBrandPricing,
      rental_min_floor_usd: rental_min_floor_usd ?? mergedBrandPricing.rental_min_floor_usd,
      rental_daily_rate_usd: rental_daily_rate_usd ?? mergedBrandPricing.rental_daily_rate_usd,
      rental_margin_percent: rental_margin_percent ?? mergedBrandPricing.rental_margin_percent
    });
  } catch (error: any) {
    console.error("Settings POST API Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
