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

    const voucherData = {
      code: cleanCode,
      amount_usd: parseFloat(amountUsd || "0"),
      amount_ngn: parseFloat(amountNgn || "0"),
      max_uses: parseInt(maxUses || "100"),
      used_count: 0,
      is_used: false,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };

    // Check if voucher with code already exists
    const { data: existing } = await supabaseAdmin
      .from("vouchers")
      .select("id")
      .eq("code", cleanCode)
      .maybeSingle();

    let dbErr;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("vouchers")
        .update(voucherData)
        .eq("id", existing.id);
      dbErr = error;
    } else {
      const { error } = await supabaseAdmin
        .from("vouchers")
        .insert(voucherData);
      dbErr = error;
    }

    if (dbErr) {
      console.error("Supabase voucher table error:", dbErr);
      return NextResponse.json({ 
        error: "Database Error: Could not save voucher to Supabase 'vouchers' table. Please run the SQL in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS vouchers (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, code TEXT NOT NULL UNIQUE, amount_usd NUMERIC DEFAULT 0, amount_ngn NUMERIC DEFAULT 0, max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0, is_used BOOLEAN DEFAULT FALSE, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());" 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `🎟️ Voucher ${cleanCode} created & saved to database! Valid for ${validDays || 7} days with a ${maxUses || 100} user limit.`
    });
  } catch (err: any) {
    console.error("Voucher create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create voucher." }, { status: 500 });
  }
}
