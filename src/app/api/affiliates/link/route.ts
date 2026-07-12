import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Find the referrer by their code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Don't allow self-referral
    if (referrer.id === user.id) {
        return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Ensure the user hasn't already been referred
    const { data: currentUser } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .single();

    if (currentUser?.referred_by) {
        return NextResponse.json({ error: "Already referred" }, { status: 400 });
    }

    // Link the accounts
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    if (updateError) {
        throw updateError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Link Affiliate Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
