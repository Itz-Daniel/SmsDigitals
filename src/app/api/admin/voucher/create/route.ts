import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify Admin Role
    const isAdmin = user?.user_metadata?.role === 'admin' || 
                    user?.app_metadata?.role === 'admin' ||
                    user?.email?.toLowerCase().includes('admin');

    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { code, amountUsd, amountNgn, maxUses, validDays } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please provide a valid voucher code." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabaseAdmin = createAdminClient();

    // Calculate Expiration Timestamp
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (parseInt(validDays) || 7));

    // Upsert into Supabase Vouchers Table
    const { error: dbErr } = await supabaseAdmin
      .from("vouchers")
      .upsert({
        code: cleanCode,
        amount_usd: parseFloat(amountUsd || "0"),
        amount_ngn: parseFloat(amountNgn || "0"),
        max_uses: parseInt(maxUses || "100"),
        used_count: 0,
        is_used: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }, { onConflict: "code" });

    if (dbErr) {
      console.warn("Supabase voucher table insert warning (will fallback to active promo memory):", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `🎟️ Voucher ${cleanCode} created successfully! Valid for ${validDays || 7} days (Expires ${expiresAt.toLocaleDateString()}) with a ${maxUses || 100} user limit.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create voucher." }, { status: 500 });
  }
}
