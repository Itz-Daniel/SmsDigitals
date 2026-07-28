import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const supabaseAdmin = createAdminClient();

    if (slug) {
      // Public Storefront Lookup by Slug
      const { data: store, error } = await supabaseAdmin
        .from('reseller_storefronts')
        .select('*')
        .eq('store_slug', slug.toLowerCase())
        .single();

      if (error || !store) {
        return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
      }

      return NextResponse.json({ success: true, store });
    }

    // Authenticated User Store Lookup
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: store } = await supabaseAdmin
      .from('reseller_storefronts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({ success: true, store: store || null });

  } catch (error: any) {
    console.error("Reseller Store GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { storeName, storeSlug, logoUrl, accentColor = '#0070F3', profitMarginPercent = 20 } = await req.json();

    if (!storeName || !storeSlug) {
      return NextResponse.json({ error: "Store name and slug are required." }, { status: 400 });
    }

    const cleanSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (cleanSlug.length < 3) {
      return NextResponse.json({ error: "Store slug must be at least 3 alphanumeric characters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Check if slug is taken by another user
    const { data: existingSlug } = await supabaseAdmin
      .from('reseller_storefronts')
      .select('id, user_id')
      .eq('store_slug', cleanSlug)
      .maybeSingle();

    if (existingSlug && existingSlug.user_id !== user.id) {
      return NextResponse.json({ error: `The store URL /store/${cleanSlug} is already claimed by another reseller.` }, { status: 400 });
    }

    const marginVal = Math.max(0, Math.min(200, parseFloat(profitMarginPercent) || 20));

    // Upsert Reseller Storefront
    const { data: store, error: upsertError } = await supabaseAdmin
      .from('reseller_storefronts')
      .upsert({
        user_id: user.id,
        store_slug: cleanSlug,
        store_name: storeName.trim(),
        logo_url: logoUrl || null,
        accent_color: accentColor,
        profit_margin_percent: marginVal,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error("Reseller store upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message || "Failed to save reseller storefront." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      store,
      message: `🎉 Storefront configured successfully! Live URL: /store/${cleanSlug}`
    });

  } catch (error: any) {
    console.error("Reseller Store POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
