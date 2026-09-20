export interface ProviderResponse {
  orderId: string;
  phone: string;
  phoneNumber?: string;
  cost: number;
  costUsd?: number;
  success?: boolean;
}

export interface CheckCodeResponse {
  status: 'Waiting' | 'Received' | 'Expired';
  code: string | null;
  audioUrl?: string | null;
  isVoiceCall?: boolean;
}

export class ProviderLowBalanceError extends Error {
  constructor(providerName: string) {
    super(`Provider ${providerName} is out of balance.`);
    this.name = 'ProviderLowBalanceError';
  }
}

// Map common generic names/IDs to specific provider codes
export type ProviderCode = '5sim' | 'grizzly';

export function mapServiceToProvider(serviceName: string, provider: ProviderCode): string {
  const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, ''); // "WhatsApp" -> "whatsapp"
  
  if (provider === '5sim') {
    return normalized;
  }
  
  if (provider === 'grizzly') {
    // Grizzly uses shortcodes for major apps
    const grizzlyMap: Record<string, string> = {
      'whatsapp': 'wa',
      'telegram': 'tg',
      'instagram': 'ig',
      'facebook': 'fb',
      'google': 'go',
      'tinder': 'oi',
      'tiktok': 'lf',
      'twitter': 'tw',
      'x': 'tw',
      'discord': 'ds',
      'apple': 'wx',
      'netflix': 'nf',
      'openai': 'dr',
      'chatgpt': 'dr',
      'uber': 'ub',
      'amazon': 'am',
      'steam': 'mt',
      'linkedin': 'ms',
      'microsoft': 'mm',
      'yahoo': 'mb'
    };
    return grizzlyMap[normalized] || normalized;
  }

  return normalized;
}

// Map frontend country identifiers (like 'canada', 'usa', '1', etc) to provider codes
export function mapCountryToProvider(countryStr: string, provider: ProviderCode): string {
  const normalized = countryStr.toLowerCase().trim();
  
  if (provider === '5sim') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return 'usa';
    if (normalized === 'canada' || normalized === 'ca') return 'canada';
    if (normalized === 'uk' || normalized === 'gb' || normalized === 'united kingdom') return 'england';
    return normalized;
  }

  if (provider === 'grizzly') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return '12'; // Grizzly USA is 12
    if (normalized === 'canada' || normalized === 'ca') return '16'; // Grizzly Canada is 16
    if (normalized === 'uk' || normalized === 'gb' || normalized === 'united kingdom') return '18';
    if (normalized === 'nigeria' || normalized === 'ng') return '19';
    if (normalized === 'germany' || normalized === 'de') return '43';
    return '12'; // Default fallback to USA
  }

  return normalized;
}

// ==========================================
// 5SIM PROVIDER (PRIMARY)
// ==========================================
class FiveSimImpl {
  readonly name = '5sim';

  async getPrice(country: string, serviceName: string): Promise<{ cost: number | null }> {
    try {
      const mappedService = mapServiceToProvider(serviceName, '5sim');
      const mappedCountry = mapCountryToProvider(country, '5sim');
      
      const res = await fetch(`https://5sim.net/v1/guest/prices?country=${mappedCountry}&product=${mappedService}`);
      if (!res.ok) return { cost: null };
      
      const data = await res.json();
      if (data[mappedCountry] && data[mappedCountry][mappedService]) {
        const operators = data[mappedCountry][mappedService];
        let lowestCost: number | null = null;
        
        for (const [_opName, opData] of Object.entries(operators)) {
          const typedOpData = opData as { cost: number; count: number };
          if (typedOpData.count > 0) {
            if (lowestCost === null || typedOpData.cost < lowestCost) {
              lowestCost = typedOpData.cost;
            }
          }
        }
        return { cost: lowestCost };
      }
      return { cost: null };
    } catch (_e) {
      return { cost: null };
    }
  }

  async buyNumber(country: string, serviceId: string, serviceName: string = ""): Promise<ProviderResponse> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY missing");

    const targetService = serviceName || serviceId;
    const mappedService = mapServiceToProvider(targetService, '5sim');
    const mappedCountry = mapCountryToProvider(country, '5sim');

    const res = await fetch(`https://5sim.net/v1/user/buy/activation/${mappedCountry}/any/${mappedService}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      if (errorText.toLowerCase().includes("not enough user balance")) {
        throw new ProviderLowBalanceError('5sim');
      }
      throw new Error(`5Sim Error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const data = await res.json();
    
    if (data.id && data.phone) {
      const price = data.price || 0.25;
      return { 
        orderId: data.id.toString(), 
        phone: data.phone, 
        phoneNumber: data.phone,
        cost: price,
        costUsd: price,
        success: true
      };
    }
    throw new Error("5Sim: No number returned");
  }

  async rentNumber(country: string, serviceId: string, serviceName: string = ""): Promise<ProviderResponse> {
    return this.buyNumber(country, serviceId, serviceName);
  }

  async checkCode(orderId: string): Promise<CheckCodeResponse> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY missing");

    const res = await fetch(`https://5sim.net/v1/user/check/${orderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) throw new Error(`5Sim Error: ${res.statusText}`);
    const data = await res.json();

    if (data.status === 'FINISHED' || data.status === 'RECEIVED') {
      const code = data.sms && data.sms.length > 0 ? data.sms[0].code : null;
      return { status: 'Received', code };
    }
    if (data.status === 'TIMEOUT' || data.status === 'CANCELED') {
      return { status: 'Expired', code: null };
    }
    return { status: 'Waiting', code: null };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) return false;

    const res = await fetch(`https://5sim.net/v1/user/cancel/${orderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    return res.ok;
  }

  async getBalance(): Promise<number> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) return 0;

    const res = await fetch(`https://5sim.net/v1/user/profile`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`5Sim getBalance error: ${res.status}`);
    const data = await res.json();
    return typeof data.balance === 'number' ? data.balance : 0;
  }
}

// ==========================================
// GRIZZLY SMS PROVIDER (SECONDARY / BACKUP)
// ==========================================
class GrizzlyImpl {
  readonly name = 'grizzly';

  async getPrice(country: string, serviceName: string): Promise<{ cost: number | null }> {
    try {
      const apiKey = process.env.GRIZZLYSMS_API_KEY;
      if (!apiKey) return { cost: null };
      
      const mappedService = mapServiceToProvider(serviceName, 'grizzly');
      const mappedCountry = mapCountryToProvider(country, 'grizzly');

      const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=getPrices&service=${mappedService}&country=${mappedCountry}`;
      const res = await fetch(url);
      if (!res.ok) return { cost: null };
      
      const data = await res.json();
      
      if (data[mappedCountry] && data[mappedCountry][mappedService]) {
        const pricesObj = data[mappedCountry][mappedService];
        let lowestCost: number | null = null;
        
        for (const [priceStr, count] of Object.entries(pricesObj)) {
          if ((count as number) > 0) {
            const cost = parseFloat(priceStr);
            if (!isNaN(cost) && (lowestCost === null || cost < lowestCost)) {
              lowestCost = cost;
            }
          }
        }
        return { cost: lowestCost };
      }
      return { cost: null };
    } catch (_e) {
      return { cost: null };
    }
  }

  async buyNumber(country: string, serviceId: string, serviceName: string = ""): Promise<ProviderResponse> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) throw new Error("GRIZZLYSMS_API_KEY missing");

    const targetService = serviceName || serviceId;
    const mappedService = mapServiceToProvider(targetService, 'grizzly');
    const mappedCountry = mapCountryToProvider(country, 'grizzly');

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=getNumber&service=${mappedService}&country=${mappedCountry}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Grizzly HTTP Error: ${res.status}`);
    }
    const text = await res.text();

    if (text.startsWith("ACCESS_NUMBER:")) {
      const parts = text.split(":");
      const orderId = parts[1];
      const phone = parts[2];
      return { 
        orderId, 
        phone, 
        phoneNumber: phone,
        cost: 0.25, 
        costUsd: 0.25,
        success: true 
      };
    }
    if (text === "NO_BALANCE") {
      throw new ProviderLowBalanceError('grizzly');
    }
    throw new Error(`Grizzly Error: ${text}`);
  }

  async rentNumber(country: string, serviceId: string, serviceName: string = ""): Promise<ProviderResponse> {
    return this.buyNumber(country, serviceId, serviceName);
  }

  async checkCode(orderId: string): Promise<CheckCodeResponse> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) throw new Error("GRIZZLYSMS_API_KEY missing");

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=getStatus&id=${orderId}`;
    const res = await fetch(url);
    const text = await res.text();

    if (text.startsWith("STATUS_OK:")) {
      return { status: 'Received', code: text.split(":")[1] };
    }
    if (text === "STATUS_CANCEL") {
      return { status: 'Expired', code: null };
    }
    return { status: 'Waiting', code: null };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) return false;

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=setStatus&status=8&id=${orderId}`;
    const res = await fetch(url);
    return res.ok;
  }

  async getBalance(): Promise<number> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) return 0;

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=getBalance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Grizzly getBalance error: ${res.status}`);
    const text = await res.text();
    if (text.startsWith("ACCESS_BALANCE:")) {
      const bal = parseFloat(text.split(":")[1]);
      return isNaN(bal) ? 0 : bal;
    }
    return 0;
  }
}

// Dual export: usable as singleton object (FiveSimApi.getPrice) AND as constructor (new FiveSimApi())
export const FiveSimApi: any = Object.assign(
  function () { return new FiveSimImpl(); },
  new FiveSimImpl()
);

export const GrizzlyApi: any = Object.assign(
  function () { return new GrizzlyImpl(); },
  new GrizzlyImpl()
);
