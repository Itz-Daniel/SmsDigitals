export interface SmsWebhookPayload {
  event: "sms.received";
  order_id: string;
  phone_number: string;
  service: string;
  sms_code: string;
  received_at: string;
}

export async function forwardSmsToUserWebhook(webhookUrl: string, payload: SmsWebhookPayload): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SmsDigitals-WebhookForwarder/1.0"
      },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (err) {
    console.error(`Failed to forward SMS webhook to ${webhookUrl}:`, err);
    return false;
  }
}
