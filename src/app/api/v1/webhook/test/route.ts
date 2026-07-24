import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { forwardSmsToUserWebhook } from "@/lib/webhook-forwarder";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhookUrl } = await req.json();

    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return NextResponse.json({ error: "Please enter a valid HTTP/HTTPS Webhook URL." }, { status: 400 });
    }

    const testPayload = {
      event: "sms.received" as const,
      order_id: "ord_test_99410",
      phone_number: "+1 (332) 894-2019",
      service: "wa",
      sms_code: "849-201",
      received_at: new Date().toISOString()
    };

    const success = await forwardSmsToUserWebhook(webhookUrl, testPayload);

    if (success) {
      return NextResponse.json({ success: true, message: "Test Webhook delivered successfully to your server (HTTP 200 OK)!" });
    } else {
      return NextResponse.json({ error: "Failed to deliver test webhook. Please check your server endpoint status." }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Webhook delivery failed." }, { status: 500 });
  }
}
