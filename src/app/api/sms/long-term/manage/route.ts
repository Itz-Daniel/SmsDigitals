import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rental_id, action, autoRenewValue } = await req.json();

    if (!rental_id || !action) {
      return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
    }

    if (action === 'toggle_auto_renew') {
      const { error } = await supabase
        .from('long_term_rentals')
        .update({ auto_renew: autoRenewValue })
        .eq('id', rental_id)
        .eq('user_id', user.id); // Enforce RLS

      if (error) throw error;
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Manage Rental API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
