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

    const { data: settings } = await supabase
      .from('settings')
      .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
      .eq('id', 1)
      .single();

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('profit_margin, affiliate_percentage, brand_pricing, rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent')
      .limit(1)
      .single();

    return NextResponse.json({ 
      profit_margin: settings?.profit_margin ?? apiSettings?.profit_margin ?? 0.4,
      affiliate_percentage: settings?.affiliate_percentage ?? apiSettings?.affiliate_percentage ?? 5.0,
      brand_pricing: settings?.brand_pricing ?? apiSettings?.brand_pricing ?? null,
      rental_min_floor_usd: settings?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? 0.80,
      rental_daily_rate_usd: settings?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? 0.50,
      rental_margin_percent: settings?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? 30
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

    const updateData: any = { id: 1 };
    if (profit_margin !== undefined) updateData.profit_margin = profit_margin;
    if (affiliate_percentage !== undefined) updateData.affiliate_percentage = affiliate_percentage;
    if (brand_pricing !== undefined) updateData.brand_pricing = brand_pricing;
    if (rental_min_floor_usd !== undefined) updateData.rental_min_floor_usd = rental_min_floor_usd;
    if (rental_daily_rate_usd !== undefined) updateData.rental_daily_rate_usd = rental_daily_rate_usd;
    if (rental_margin_percent !== undefined) updateData.rental_margin_percent = rental_margin_percent;

    const supabaseAdmin = createAdminClient();
    
    // Upsert into settings table with id = 1
    const { error: settingsErr } = await supabaseAdmin
      .from('settings')
      .upsert(updateData, { onConflict: 'id' });

    // Also upsert into api_settings table fallback
    await supabaseAdmin
      .from('api_settings')
      .upsert({ ...updateData, id: '00000000-0000-0000-0000-000000000001' }, { onConflict: 'id' })
      .catch(() => {});

    if (settingsErr) {
      console.error("Supabase settings update error:", settingsErr);
      if (settingsErr.message?.includes('column') || settingsErr.code === 'PGRST204') {
        return NextResponse.json({ 
          error: "Supabase table is missing required columns. Please run SQL in Supabase SQL Editor: ALTER TABLE settings ADD COLUMN IF NOT EXISTS rental_min_floor_usd NUMERIC DEFAULT 0.80, ADD COLUMN IF NOT EXISTS rental_daily_rate_usd NUMERIC DEFAULT 0.50, ADD COLUMN IF NOT EXISTS rental_margin_percent NUMERIC DEFAULT 30;" 
        }, { status: 400 });
      }
      throw settingsErr;
    }

    return NextResponse.json({ success: true, message: "Settings saved and persisted successfully!", ...updateData });
  } catch (error: any) {
    console.error("Settings POST API Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
