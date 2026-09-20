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
  const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, ''); // "WhatsApp" -> "whatsapp", "Match.com" -> "matchcom"
  
  if (provider === '5sim') {
    // 5SIM exact product mapping aliases
    const fiveSimAlias: Record<string, string> = {
      'matchcom': 'match',
      'plentyoffishpof': 'pof',
      'plentyoffish': 'pof',
      'googlehotmailyoutube': 'google',
      'googlegmailyoutube': 'google',
      'gmail': 'google',
      'appleidiclouid': 'apple',
      'appleid': 'apple',
      'icloud': 'apple',
      'microsoftoutlook': 'microsoft',
      'outlook': 'microsoft',
      'yahoomail': 'yahoo',
      'twitterx': 'twitter',
      'x': 'twitter',
      'openaichatgpt': 'openai',
      'chatgpt': 'openai',
      'wisetransferwise': 'wise',
      'transferwise': 'wise'
    };
    return fiveSimAlias[normalized] || normalized;
  }
  
  if (provider === 'grizzly') {
    // Grizzly SMS 2-letter / 3-letter protocol shortcodes
    const grizzlyMap: Record<string, string> = {
      // Social & Messaging
      'whatsapp': 'wa',
      'telegram': 'tg',
      'tiktok': 'lf',
      'instagram': 'ig',
      'facebook': 'fb',
      'twitter': 'tw',
      'twitterx': 'tw',
      'x': 'tw',
      'snapchat': 'fu',
      'discord': 'ds',
      'wechat': 'wb',
      'linkedin': 'ms',
      'reddit': 'rl',
      'signal': 'sig',
      'viber': 'vi',
      'threads': 'ig',

      // Dating Apps (High Demand)
      'tinder': 'oi',
      'bumble': 'mo',
      'hinge': 'vz',
      'badoo': 'we',
      'match': 'fq',
      'matchcom': 'fq',
      'okcupid': 'vm',
      'pof': 'pf',
      'plentyoffish': 'pf',
      'plentyoffishpof': 'pf',
      'grindr': 'yw',
      'tagged': 'al',

      // Fintech & Payments
      'paypal': 'ts',
      'cashapp': 'it',
      'wise': 'bz',
      'wisetransferwise': 'bz',
      'transferwise': 'bz',
      'stripe': 'nu',
      'skrill': 'sv',
      'payoneer': 'po',
      'revolut': 're',
      'venmo': 'yy',

      // Freelancing
      'upwork': 'cl',
      'fiverr': 'rr',

      // AI
      'openai': 'dr',
      'openaichatgpt': 'dr',
      'chatgpt': 'dr',
      'claude': 'dr',

      // Tech Ecosystems & Email
      'google': 'go',
      'gmail': 'go',
      'googlegmailyoutube': 'go',
      'apple': 'wx',
      'appleid': 'wx',
      'appleidiclouid': 'wx',
      'icloud': 'wx',
      'microsoft': 'mm',
      'microsoftoutlook': 'mm',
      'outlook': 'mm',
      'yahoo': 'mb',
      'yahoomail': 'mb',

      // Entertainment, Shopping & Travel
      'netflix': 'nf',
      'spotify': 'pm',
      'steam': 'mt',
      'roblox': 'rb',
      'amazon': 'am',
      'ebay': 'dh',
      'aliexpress': 'hx',
      'uber': 'ub',
      'bolt': 'tx',
      'airbnb': 'ah'
    };
    return grizzlyMap[normalized] || normalized;
  }

  return normalized;
}

// Map frontend country identifiers (like 'canada', 'usa', '1', etc) to provider codes
export function mapCountryToProvider(countryStr: string, provider: ProviderCode): string {
  const normalized = countryStr.toLowerCase().trim();
  
  if (provider === '5sim') {
    if (normalized === '1' || normalized === 'usa' || normalized === 'us' || normalized === 'united states') return 'usa';
    if (normalized === '2' || normalized === 'uk' || normalized === 'gb' || normalized === 'england' || normalized === 'united kingdom') return 'england';
    if (normalized === '3' || normalized === 'canada' || normalized === 'ca') return 'canada';
    return normalized;
  }

  if (provider === 'grizzly') {
    // Grizzly SMS integer country codes for all 45 platform countries
    const grizzlyCountryMap: Record<string, string> = {
      '1': '12', 'usa': '12', 'us': '12', 'united states': '12',
      '2': '18', 'uk': '18', 'gb': '18', 'england': '18', 'united kingdom': '18',
      '3': '16', 'canada': '16', 'ca': '16',
      '4': '0',  'russia': '0', 'ru': '0',
      '5': '1',  'ukraine': '1', 'ua': '1',
      '6': '2',  'kazakhstan': '2', 'kz': '2',
      '7': '3',  'china': '3', 'cn': '3',
      '8': '4',  'philippines': '4', 'ph': '4',
      '9': '5',  'myanmar': '5', 'mm': '5',
      '10': '6', 'indonesia': '6', 'id': '6',
      '11': '7', 'malaysia': '7', 'my': '7',
      '12': '10', 'vietnam': '10', 'vn': '10',
      '13': '52', 'thailand': '52', 'th': '52',
      '14': '22', 'india': '22', 'in': '22',
      '15': '73', 'brazil': '73', 'br': '73',
      '16': '54', 'mexico': '54', 'mx': '54',
      '17': '39', 'argentina': '39', 'ar': '39',
      '18': '33', 'colombia': '33', 'co': '33',
      '19': '43', 'germany': '43', 'de': '43',
      '20': '78', 'france': '78', 'fr': '78',
      '21': '56', 'spain': '56', 'es': '56',
      '22': '86', 'italy': '86', 'it': '86',
      '23': '48', 'netherlands': '48', 'nl': '48',
      '24': '15', 'poland': '15', 'pl': '15',
      '25': '32', 'romania': '32', 'ro': '32',
      '26': '62', 'turkey': '62', 'tr': '62',
      '27': '21', 'egypt': '21', 'eg': '21',
      '28': '31', 'southafrica': '31', 'za': '31', 'south africa': '31',
      '29': '19', 'nigeria': '19', 'ng': '19',
      '30': '8',  'kenya': '8', 'ke': '8',
      '31': '159', 'ghana': '159', 'gh': '159',
      '32': '37', 'morocco': '37', 'ma': '37',
      '33': '176', 'australia': '176', 'au': '176',
      '34': '67', 'newzealand': '67', 'nz': '67', 'new zealand': '67',
      '35': '182', 'japan': '182', 'jp': '182',
      '36': '190', 'southkorea': '190', 'kr': '190', 'south korea': '190',
      '37': '114', 'taiwan': '114', 'tw': '114',
      '38': '14', 'hongkong': '14', 'hk': '14', 'hong kong': '14',
      '39': '53', 'saudiarabia': '53', 'sa': '53', 'saudi arabia': '53',
      '40': '95', 'uae': '95', 'ae': '95', 'united arab emirates': '95',
      '41': '66', 'pakistan': '66', 'pk': '66',
      '42': '60', 'bangladesh': '60', 'bd': '60',
      '43': '64', 'srilanka': '64', 'lk': '64', 'sri lanka': '64',
      '44': '81', 'nepal': '81', 'np': '81'
    };

    return grizzlyCountryMap[normalized] || '12';
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
