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
      .from('settings')
      .select('profit_margin, affiliate_percentage, brand_pricing')
      .eq('id', 1)
      .single();

    if (error) {
      // Fallback if brand_pricing column does not exist on Supabase table yet
      const { data: fallback } = await supabase
        .from('settings')
        .select('profit_margin, affiliate_percentage')
        .eq('id', 1)
        .single();

      return NextResponse.json({ 
        profit_margin: fallback?.profit_margin || 0.4,
        affiliate_percentage: fallback?.affiliate_percentage || 5.0,
        brand_pricing: null
      });
    }

    return NextResponse.json({ 
      profit_margin: settings?.profit_margin || 0.4,
      affiliate_percentage: settings?.affiliate_percentage || 5.0,
      brand_pricing: settings?.brand_pricing || null
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

    const { profit_margin, affiliate_percentage, brand_pricing } = validationResult.data;

    const updateData: any = {};
    if (profit_margin !== undefined) updateData.profit_margin = profit_margin;
    if (affiliate_percentage !== undefined) updateData.affiliate_percentage = affiliate_percentage;
    if (brand_pricing !== undefined) updateData.brand_pricing = brand_pricing;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('settings')
      .update(updateData)
      .eq('id', 1);

    if (error) {
      console.error("Supabase settings update error:", error);
      // Check if error is missing column 'brand_pricing'
      if (error.message?.includes('brand_pricing') || error.code === 'PGRST204' || error.message?.includes('column')) {
        return NextResponse.json({ 
          error: "Supabase table 'settings' is missing the 'brand_pricing' column. Please run SQL in Supabase SQL Editor: ALTER TABLE settings ADD COLUMN IF NOT EXISTS brand_pricing JSONB DEFAULT '{}'::jsonb;" 
        }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, ...updateData });
  } catch (error: any) {
    console.error("Settings POST API Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
