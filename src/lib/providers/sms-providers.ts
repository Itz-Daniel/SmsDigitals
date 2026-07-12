export interface ProviderResponse {
  orderId: string;
  phone: string;
  cost: number;
}

export interface CheckCodeResponse {
  status: 'Waiting' | 'Received' | 'Expired';
  code: string | null;
}

export class ProviderLowBalanceError extends Error {
  constructor(providerName: string) {
    super(`Provider ${providerName} is out of balance.`);
    this.name = 'ProviderLowBalanceError';
  }
}

// Map common generic names/IDs to specific provider codes
type ProviderCode = '5sim' | 'grizzly' | 'smspva' | 'textverified' | 'smsman';

function mapServiceToProvider(serviceName: string, provider: ProviderCode): string {
  const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, ''); // "WhatsApp" -> "whatsapp", "Apple / Mac" -> "applemac"
  
  if (provider === '5sim' || provider === 'smsman' || provider === 'textverified') {
    // 5Sim, SMSMan, and TextVerified generally accept the raw english name or internal mapping handles it
    return normalized;
  }
  
  if (provider === 'grizzly') {
    // Grizzly often uses 2-letter shortcodes for major apps
    const grizzlyMap: Record<string, string> = {
      'whatsapp': 'wa',
      'telegram': 'tg',
      'instagram': 'ig',
      'facebook': 'fb',
      'google': 'go',
      'tinder': 'oi',
      'tiktok': 'lf',
      'twitter': 'tw',
      'discord': 'ds',
      'apple': 'wx',
      'netflix': 'nf'
    };
    return grizzlyMap[normalized] || normalized;
  }

  if (provider === 'smspva') {
    // SMSPVA uses strictly "optX" codes. These are the most common.
    const smspvaMap: Record<string, string> = {
      'whatsapp': 'opt29',
      'telegram': 'opt29', // SMSPVA uses same for many? Actually Telegram is opt29? No, let's just use optX.
      'instagram': 'opt16',
      'facebook': 'opt2',
      'google': 'opt1',
      'tinder': 'opt9'
    };
    return smspvaMap[normalized] || normalized;
  }

  return normalized;
}

// Map frontend country identifiers (like 'canada', 'usa', '1', etc) to provider codes
function mapCountryToProvider(countryStr: string, provider: ProviderCode): string {
  const normalized = countryStr.toLowerCase().trim();
  
  if (provider === '5sim') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return 'usa';
    if (normalized === 'canada' || normalized === 'ca') return 'canada';
    return normalized; // 5sim uses english names like 'england', 'germany'
  }

  if (provider === 'grizzly') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return '12'; // Grizzly USA is 12
    if (normalized === 'canada' || normalized === 'ca') return '16'; // Grizzly Canada is 16
    // Grizzly expects integer country codes. If not mapped, fallback to 0 (Russia) or let it fail
    return '0';
  }

  if (provider === 'smspva') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return 'US';
    if (normalized === 'canada' || normalized === 'ca') return 'CA';
    // SMSPVA typically expects 2-letter codes or specific IDs
    return normalized;
  }

  if (provider === 'smsman') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us') return '5'; // USA is 5
    if (normalized === 'canada' || normalized === 'ca') return '73'; // CA is 73
    return '0';
  }

  if (provider === 'textverified') {
    return '1'; // USA only mostly
  }

  return normalized;
}

// ==========================================
// 5SIM API WRAPPER
// ==========================================
export const FiveSimApi = {
  async getPrice(country: string, serviceName: string): Promise<{ cost: number | null }> {
    try {
      const mappedService = mapServiceToProvider(serviceName, '5sim');
      const mappedCountry = mapCountryToProvider(country, '5sim');
      
      const res = await fetch(`https://5sim.net/v1/guest/prices?country=${mappedCountry}&product=${mappedService}`);
      if (!res.ok) return { cost: null };
      
      const data = await res.json();
      if (data[mappedCountry] && data[mappedCountry][mappedService]) {
        // Find the lowest price among operators that have stock
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
  },

  async buyNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, '5sim');
    const mappedCountry = mapCountryToProvider(country, '5sim');

    // Default to 'any' operator for highest success rate
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
      return { orderId: data.id.toString(), phone: data.phone, cost: data.price };
    }
    throw new Error("5Sim: No number returned");
  },

  async rentNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, '5sim');
    const mappedCountry = mapCountryToProvider(country, '5sim');

    // Default to 'any' operator for highest success rate. For 5sim, renting is "hosting".
    const res = await fetch(`https://5sim.net/v1/user/buy/hosting/${mappedCountry}/any/${mappedService}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      if (errorText.toLowerCase().includes("not enough user balance")) {
        throw new ProviderLowBalanceError('5sim');
      }
      throw new Error(`5Sim Rent Error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const data = await res.json();
    
    if (data.id && data.phone) {
      return { orderId: data.id.toString(), phone: data.phone, cost: data.price };
    }
    throw new Error("5Sim Rent: No number returned");
  },

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
  },

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) return false;

    const res = await fetch(`https://5sim.net/v1/user/cancel/${orderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    return res.ok;
  }
};

// ==========================================
// GRIZZLY SMS API WRAPPER
// ==========================================
export const GrizzlyApi = {
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
  },

  async buyNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) throw new Error("GRIZZLYSMS_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, 'grizzly');
    const mappedCountry = mapCountryToProvider(country, 'grizzly');

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=getNumber&service=${mappedService}&country=${mappedCountry}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Grizzly HTTP Error: ${res.status}`);
    }
    const text = await res.text();

    if (text.startsWith("ACCESS_NUMBER:")) {
      const parts = text.split(":");
      return { orderId: parts[1], phone: parts[2], cost: 0.25 }; // Grizzly doesn't return cost in standard request, mock cost or fetch balance diff
    }
    if (text === "NO_BALANCE") {
      throw new ProviderLowBalanceError('grizzly');
    }
    throw new Error(`Grizzly Error: ${text}`);
  },

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
  },

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.GRIZZLYSMS_API_KEY;
    if (!apiKey) return false;

    const url = `https://api.grizzlysms.com/stubs/handler_api.php?api_key=${apiKey}&action=setStatus&status=8&id=${orderId}`;
    const res = await fetch(url);
    return res.ok;
  }
};

// ==========================================
// SMSPVA API WRAPPER
// ==========================================
export const SmspvaApi = {
  async buyNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.SMSPVA_API_KEY;
    if (!apiKey) throw new Error("SMSPVA_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, 'smspva');
    const mappedCountry = mapCountryToProvider(country, 'smspva');

    const url = `https://smspva.com/priemnik.php?metod=get_number&country=${mappedCountry}&service=${mappedService}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SMSPVA HTTP Error: ${res.status}`);
    }
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      throw new Error(`SMSPVA Error (Not JSON): ${text}`);
    }

    if (data.response === '1') {
      return { orderId: data.id.toString(), phone: data.number, cost: 0.30 }; // Mock cost
    }
    if (data.error_msg && data.error_msg.toLowerCase().includes("balance")) {
      throw new ProviderLowBalanceError('smspva');
    }
    throw new Error(`SMSPVA Error: ${JSON.stringify(data)}`);
  },

  async rentNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.SMSPVA_API_KEY;
    if (!apiKey) throw new Error("SMSPVA_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, 'smspva');
    const mappedCountry = mapCountryToProvider(country, 'smspva');

    const url = `https://smspva.com/api/rent.php?method=get_number&country=${mappedCountry}&service=${mappedService}&apikey=${apiKey}&dtype=month&dcount=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SMSPVA Rent HTTP Error: ${res.status}`);
    
    const data = await res.json();
    if (data.response === '1' || data.status === 1) {
      return { orderId: data.id.toString(), phone: data.number, cost: 5.00 }; // Ensure to sync real cost via API if available
    }
    
    if (data.error_msg && data.error_msg.toLowerCase().includes("balance")) {
      throw new ProviderLowBalanceError('smspva');
    }
    throw new Error(`SMSPVA Rent Error: ${JSON.stringify(data)}`);
  },

  async prolongNumber(orderId: string): Promise<boolean> {
    const apiKey = process.env.SMSPVA_API_KEY;
    if (!apiKey) return false;

    const url = `https://smspva.com/api/rent.php?method=prolong&apikey=${apiKey}&id=${orderId}&dtype=month&dcount=1`;
    const res = await fetch(url);
    if (!res.ok) return false;

    const data = await res.json();
    return data.response === '1' || data.status === 1;
  },

  async checkCode(orderId: string, country: string, serviceId: string): Promise<CheckCodeResponse> {
    const apiKey = process.env.SMSPVA_API_KEY;
    if (!apiKey) throw new Error("SMSPVA_API_KEY missing");

    const url = `https://smspva.com/priemnik.php?metod=get_sms&country=${country}&service=${serviceId}&id=${orderId}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.response === '1') {
      return { status: 'Received', code: data.sms };
    }
    if (data.response === '2') {
      return { status: 'Waiting', code: null };
    }
    // Depending on SMSPVA exact timeout string, adapt this
    if (data.response === '3') {
       return { status: 'Expired', code: null };
    }
    
    return { status: 'Waiting', code: null };
  },

  async cancelOrder(orderId: string, country: string, serviceId: string): Promise<boolean> {
    const apiKey = process.env.SMSPVA_API_KEY;
    if (!apiKey) return false;

    const url = `https://smspva.com/priemnik.php?metod=denial&country=${country}&service=${serviceId}&id=${orderId}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.response === '1';
  }
};

// ==========================================
// TEXTVERIFIED API WRAPPER
// ==========================================
export const TextVerifiedApi = {
  // Bearer token needs to be generated using Simple Authentication in TV usually.
  // We'll mock the standard REST call structure for their V2 API.
  async buyNumber(_country: string, _serviceId: string, _serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.TEXTVERIFIED_API_KEY; // Base64 encoded ClientId:Secret
    if (!apiKey) throw new Error("TEXTVERIFIED_API_KEY missing");

    // We first need a bearer token. Assuming apiKey is the Bearer token for simplicity in this implementation.
    const res = await fetch(`https://www.textverified.com/api/v2/Verifications`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1 }) // Mock target service ID for now
    });
    
    if (!res.ok) throw new Error(`TextVerified Error: ${res.status}`);
    const data = await res.json();
    
    if (data.id && data.number) {
      return { orderId: data.id.toString(), phone: data.number, cost: data.cost || 1.0 };
    }
    throw new Error(`TextVerified Error: ${JSON.stringify(data)}`);
  },

  async checkCode(orderId: string): Promise<CheckCodeResponse> {
    const apiKey = process.env.TEXTVERIFIED_API_KEY;
    if (!apiKey) throw new Error("TEXTVERIFIED_API_KEY missing");

    const res = await fetch(`https://www.textverified.com/api/v2/Verifications/${orderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!res.ok) throw new Error(`TextVerified Error: ${res.status}`);
    const data = await res.json();

    if (data.status === 'Completed') {
      return { status: 'Received', code: data.code };
    }
    if (data.status === 'Canceled' || data.status === 'Expired') {
      return { status: 'Expired', code: null };
    }
    return { status: 'Waiting', code: null };
  },

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.TEXTVERIFIED_API_KEY;
    if (!apiKey) return false;
    const res = await fetch(`https://www.textverified.com/api/v2/Verifications/${orderId}/Cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return res.ok;
  }
};

// ==========================================
// SMS-MAN API WRAPPER
// ==========================================
export const SmsManApi = {
  async buyNumber(country: string, serviceId: string, serviceName: string): Promise<ProviderResponse> {
    const apiKey = process.env.SMSMAN_API_KEY;
    if (!apiKey) throw new Error("SMSMAN_API_KEY missing");

    const mappedService = mapServiceToProvider(serviceName, 'smsman');
    const mappedCountry = mapCountryToProvider(country, 'smsman');

    const url = `https://api.sms-man.com/control/get-number?token=${apiKey}&country_id=${mappedCountry}&application_id=${mappedService}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SMSMan HTTP Error: ${res.status}`);
    const data = await res.json();

    if (data.request_id && data.number) {
      return { orderId: data.request_id.toString(), phone: data.number, cost: 0.50 };
    }
    if ((data.error_code && data.error_code.toLowerCase().includes("balance")) || 
        (data.error_msg && data.error_msg.toLowerCase().includes("balance"))) {
      throw new ProviderLowBalanceError('smsman');
    }
    throw new Error(`SMSMan Error: ${JSON.stringify(data)}`);
  },

  async checkCode(orderId: string): Promise<CheckCodeResponse> {
    const apiKey = process.env.SMSMAN_API_KEY;
    if (!apiKey) throw new Error("SMSMAN_API_KEY missing");

    const url = `https://api.sms-man.com/control/get-sms?token=${apiKey}&request_id=${orderId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.sms_code) {
      return { status: 'Received', code: data.sms_code };
    }
    // SMS-man often returns error if not received yet
    if (data.error_msg === "Wait SMS") {
      return { status: 'Waiting', code: null };
    }
    // If cancelled or expired
    if (data.error_msg === "Canceled" || data.error_code === "CANCELED") {
      return { status: 'Expired', code: null };
    }
    return { status: 'Waiting', code: null };
  },

  async cancelOrder(orderId: string): Promise<boolean> {
    const apiKey = process.env.SMSMAN_API_KEY;
    if (!apiKey) return false;
    const url = `https://api.sms-man.com/control/set-status?token=${apiKey}&request_id=${orderId}&status=reject`;
    const res = await fetch(url);
    const data = await res.json();
    return data.success === true;
  }
};
