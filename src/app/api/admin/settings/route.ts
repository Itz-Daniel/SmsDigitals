import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select('profit_margin, affiliate_percentage')
      .eq('id', 1)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
        profit_margin: settings.profit_margin,
        affiliate_percentage: settings.affiliate_percentage
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

    const { profit_margin, affiliate_percentage } = await req.json();

    const updateData: any = {};

    if (profit_margin !== undefined) {
        if (typeof profit_margin !== 'number' || profit_margin < 0) {
            return NextResponse.json({ error: "Invalid profit margin" }, { status: 400 });
        }
        updateData.profit_margin = profit_margin;
    }

    if (affiliate_percentage !== undefined) {
        if (typeof affiliate_percentage !== 'number' || affiliate_percentage < 0) {
            return NextResponse.json({ error: "Invalid affiliate percentage" }, { status: 400 });
        }
        updateData.affiliate_percentage = affiliate_percentage;
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
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
