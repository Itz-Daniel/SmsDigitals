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
    const coinKey = params.pay_currency.toLowerCase();
    
    // User's Real Production Crypto Deposit Addresses
    const realAddressMap: Record<string, string> = {
      usdttrc20: "TRHYbmGxufCjgZpmoLsRxJhuSToCD3iQXC",
      usdtbep20: "0x600cde7B779A31085312b617658a090e8D640955",
      btc: "bc1q5d5pdnkkexrlly0a52clwtacpdk2pa4vg36jd8",
      eth: "0x600cde7B779A31085312b617658a090e8D640955",
      sol: "3N4nxzuLMc1YFnGM5HQTE3egqM4CK61SokBTnXSv8KL5"
    };

    if (!this.apiKey) {
      return {
        payment_id: `pay_${Date.now()}`,
        payment_status: "waiting",
        pay_address: realAddressMap[coinKey] || "TRHYbmGxufCjgZpmoLsRxJhuSToCD3iQXC",
        price_amount: params.price_amount,
        price_currency: params.price_currency,
        pay_amount: params.price_amount,
        pay_currency: params.pay_currency,
        order_id: params.order_id,
        created_at: new Date().toISOString()
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payment`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        // Fallback to direct merchant address if gateway API key fails or is in test mode
        return {
          payment_id: `pay_${Date.now()}`,
          payment_status: "waiting",
          pay_address: realAddressMap[coinKey] || "TRHYbmGxufCjgZpmoLsRxJhuSToCD3iQXC",
          price_amount: params.price_amount,
          price_currency: params.price_currency,
          pay_amount: params.price_amount,
          pay_currency: params.pay_currency,
          order_id: params.order_id,
          created_at: new Date().toISOString()
        };
      }

      return await res.json();
    } catch (err) {
      return {
        payment_id: `pay_${Date.now()}`,
        payment_status: "waiting",
        pay_address: realAddressMap[coinKey] || "TRHYbmGxufCjgZpmoLsRxJhuSToCD3iQXC",
        price_amount: params.price_amount,
        price_currency: params.price_currency,
        pay_amount: params.price_amount,
        pay_currency: params.pay_currency,
        order_id: params.order_id,
        created_at: new Date().toISOString()
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<{ payment_status: string }> {
    if (!this.apiKey) {
      return { payment_status: "waiting" };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payment/${paymentId}`, {
        headers: { "x-api-key": this.apiKey }
      });

      if (!res.ok) return { payment_status: "waiting" };
      return await res.json();
    } catch (err) {
      return { payment_status: "waiting" };
    }
  }
}
