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

    if (error) throw error;

    return NextResponse.json({ 
        profit_margin: settings?.profit_margin || 0.4,
        affiliate_percentage: settings?.affiliate_percentage || 5.0,
        brand_pricing: settings?.brand_pricing || null
    });
  } catch (error: unknown) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
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
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { profit_margin, affiliate_percentage, brand_pricing } = validationResult.data;

    const updateData: any = {};

    if (profit_margin !== undefined) {
      updateData.profit_margin = profit_margin;
    }

    if (affiliate_percentage !== undefined) {
      updateData.affiliate_percentage = affiliate_percentage;
    }

    if (brand_pricing !== undefined) {
      updateData.brand_pricing = brand_pricing;
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('settings')
      .update(updateData)
      .eq('id', 1);

    if (error) throw error;

    return NextResponse.json({ success: true, ...updateData });
  } catch (error: unknown) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
