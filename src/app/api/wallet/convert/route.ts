import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount_ngn = Number(body.amount_ngn);

    if (!Number.isFinite(amount_ngn) || amount_ngn <= 0 || amount_ngn > 50_000_000) {
      return NextResponse.json({ success: false, error: 'Invalid conversion amount. Must be a positive finite amount up to ₦50,000,000.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Call the secure RPC function
    // The RPC uses auth.uid() securely and is SECURITY DEFINER to bypass table RLS for internal updates
    const { data, error } = await supabase.rpc('convert_ngn_to_usd', {
      amount_ngn: amount_ngn
    });

    if (error) {
      console.error("Conversion RPC Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (err: unknown) {
    console.error("Conversion Error:", err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
