export interface CreateCryptoPaymentParams {
  price_amount: number;
  price_currency: string;
  pay_currency: string; // e.g. 'usdttrc20', 'usdtbep20', 'btc', 'eth', 'sol'
  order_id: string;
  order_description: string;
  ipn_callback_url?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CryptoPaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  created_at: string;
}

export class NOWPaymentsApi {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NOWPAYMENTS_API_KEY || "";
    this.baseUrl = "https://api.nowpayments.io/v1";
  }

  async createPayment(params: CreateCryptoPaymentParams): Promise<CryptoPaymentResponse> {
    if (!this.apiKey) {
      // Fallback sandbox payment response if NOWPAYMENTS_API_KEY is not set yet
      const mockAddressMap: Record<string, string> = {
        usdttrc20: "TX9zV1QzR4jW6n8m5p2K7L3N0b1c2D3e4F",
        usdtbep20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        btc: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        eth: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
        sol: "7xKXtg2CW87d97TXJSDpbD5jBk4n5e6F7g8h9i0j"
      };

      return {
        payment_id: `pay_${Date.now()}`,
        payment_status: "waiting",
        pay_address: mockAddressMap[params.pay_currency.toLowerCase()] || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        price_amount: params.price_amount,
        price_currency: params.price_currency,
        pay_amount: params.price_amount,
        pay_currency: params.pay_currency,
        order_id: params.order_id,
        created_at: new Date().toISOString()
      };
    }

    const res = await fetch(`${this.baseUrl}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`NOWPayments API error: ${errorText}`);
    }

    return await res.json();
  }

  async getPaymentStatus(paymentId: string): Promise<{ payment_status: string }> {
    if (!this.apiKey) {
      return { payment_status: "waiting" };
    }

    const res = await fetch(`${this.baseUrl}/payment/${paymentId}`, {
      headers: { "x-api-key": this.apiKey }
    });

    if (!res.ok) throw new Error("Failed to check crypto payment status");
    return await res.json();
  }
}
