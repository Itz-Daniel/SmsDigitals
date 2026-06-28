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
      .select('profit_margin')
      .eq('id', 1)
      .single();

    if (error) throw error;

    return NextResponse.json({ profit_margin: settings.profit_margin });
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

    const { profit_margin } = await req.json();

    if (typeof profit_margin !== 'number' || profit_margin < 0) {
      return NextResponse.json({ error: "Invalid profit margin" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('settings')
      .update({ profit_margin })
      .eq('id', 1);

    if (error) throw error;

    return NextResponse.json({ success: true, profit_margin });
  } catch (error: unknown) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
