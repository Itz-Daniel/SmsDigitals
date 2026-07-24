export class NowPaymentsApi {
  private static baseUrl = "https://api.nowpayments.io/v1";

  private static getApiKey(): string {
    return process.env.NOWPAYMENTS_API_KEY || "";
  }

  static async createInvoice(amountUsd: number, orderId: string, email: string) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      // Demo / Mock Fallback if key is not yet set in environment
      return {
        success: true,
        invoice_url: `https://nowpayments.io/payment/?iid=demo-${orderId}`,
        payment_id: `demo-${Date.now()}`,
        demo: true
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smsdigitals.vercel.app";

    try {
      const response = await fetch(`${this.baseUrl}/invoice`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: amountUsd,
          price_currency: "usd",
          order_id: orderId,
          order_description: `Wallet Funding for ${email}`,
          ipn_callback_url: `${siteUrl}/api/webhooks/nowpayments`,
          success_url: `${siteUrl}/dashboard?payment=success`,
          cancel_url: `${siteUrl}/dashboard/fund`,
        }),
      });

      const data = await response.json();

      if (data.invoice_url) {
        return {
          success: true,
          invoice_url: data.invoice_url,
          payment_id: data.id,
        };
      }

      throw new Error(data.message || "Failed to create NOWPayments invoice");
    } catch (err: any) {
      console.error("NOWPayments API Error:", err);
      throw err;
    }
  }
}
