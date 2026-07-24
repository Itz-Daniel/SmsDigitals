import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. API Key or Login required." }, { status: 401 });
    }

    const { thresholdUsd, alertEmail } = await req.json();

    if (typeof thresholdUsd !== "number" || thresholdUsd < 0) {
      return NextResponse.json({ error: "Please provide a valid threshold in USD (e.g. 5.00)." }, { status: 400 });
    }

    // Save developer low balance alert preferences to user metadata
    await supabase.auth.updateUser({
      data: {
        developer_low_balance_threshold_usd: thresholdUsd,
        developer_alert_email: alertEmail || user.email
      }
    });

    return NextResponse.json({
      success: true,
      message: `🚨 Low Balance Alert Guard set! You will be notified automatically when your reseller wallet drops below $${thresholdUsd.toFixed(2)} USD.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update low balance alert preference." }, { status: 500 });
  }
}
