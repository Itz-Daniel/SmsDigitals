export const COUNTRIES = [
  { id: '1', name: 'United States', iso: 'usa' },
  { id: '2', name: 'United Kingdom', iso: 'england' },
  { id: '3', name: 'Canada', iso: 'canada' },
  { id: '4', name: 'Russia', iso: 'russia' },
  { id: '5', name: 'Ukraine', iso: 'ukraine' },
  { id: '6', name: 'Kazakhstan', iso: 'kazakhstan' },
  { id: '7', name: 'China', iso: 'china' },
  { id: '8', name: 'Philippines', iso: 'philippines' },
  { id: '9', name: 'Myanmar', iso: 'myanmar' },
  { id: '10', name: 'Indonesia', iso: 'indonesia' },
  { id: '11', name: 'Malaysia', iso: 'malaysia' },
  { id: '12', name: 'Vietnam', iso: 'vietnam' },
  { id: '13', name: 'Thailand', iso: 'thailand' },
  { id: '14', name: 'India', iso: 'india' },
  { id: '15', name: 'Brazil', iso: 'brazil' },
  { id: '16', name: 'Mexico', iso: 'mexico' },
  { id: '17', name: 'Argentina', iso: 'argentina' },
  { id: '18', name: 'Colombia', iso: 'colombia' },
  { id: '19', name: 'Germany', iso: 'germany' },
  { id: '20', name: 'France', iso: 'france' },
  { id: '21', name: 'Spain', iso: 'spain' },
  { id: '22', name: 'Italy', iso: 'italy' },
  { id: '23', name: 'Netherlands', iso: 'netherlands' },
  { id: '24', name: 'Poland', iso: 'poland' },
  { id: '25', name: 'Romania', iso: 'romania' },
  { id: '26', name: 'Turkey', iso: 'turkey' },
  { id: '27', name: 'Egypt', iso: 'egypt' },
  { id: '28', name: 'South Africa', iso: 'southafrica' },
  { id: '29', name: 'Nigeria', iso: 'nigeria' },
  { id: '30', name: 'Kenya', iso: 'kenya' },
  { id: '31', name: 'Ghana', iso: 'ghana' },
  { id: '32', name: 'Morocco', iso: 'morocco' },
  { id: '33', name: 'Australia', iso: 'australia' },
  { id: '34', name: 'New Zealand', iso: 'newzealand' },
  { id: '35', name: 'Japan', iso: 'japan' },
  { id: '36', name: 'South Korea', iso: 'southkorea' },
  { id: '37', name: 'Taiwan', iso: 'taiwan' },
  { id: '38', name: 'Hong Kong', iso: 'hongkong' },
  { id: '39', name: 'Saudi Arabia', iso: 'saudiarabia' },
  { id: '40', name: 'United Arab Emirates', iso: 'uae' },
  { id: '41', name: 'Pakistan', iso: 'pakistan' },
  { id: '42', name: 'Bangladesh', iso: 'bangladesh' },
  { id: '43', name: 'Sri Lanka', iso: 'srilanka' },
  { id: '44', name: 'Nepal', iso: 'nepal' }
];

export interface ServiceItem {
  id: string;
  name: string;
  category?: string;
}

export const SERVICES: ServiceItem[] = [
  // --- TOP MESSAGING & SOCIAL ---
  { id: "whatsapp", name: "WhatsApp", category: "Social & Messaging" },
  { id: "telegram", name: "Telegram", category: "Social & Messaging" },
  { id: "tiktok", name: "TikTok", category: "Social & Messaging" },
  { id: "instagram", name: "Instagram", category: "Social & Messaging" },
  { id: "facebook", name: "Facebook", category: "Social & Messaging" },
  { id: "twitter", name: "Twitter / X", category: "Social & Messaging" },
  { id: "snapchat", name: "Snapchat", category: "Social & Messaging" },
  { id: "discord", name: "Discord", category: "Social & Messaging" },
  { id: "wechat", name: "WeChat", category: "Social & Messaging" },
  { id: "linkedin", name: "LinkedIn", category: "Social & Messaging" },
  { id: "reddit", name: "Reddit", category: "Social & Messaging" },
  { id: "signal", name: "Signal", category: "Social & Messaging" },
  { id: "viber", name: "Viber", category: "Social & Messaging" },
  { id: "threads", name: "Threads", category: "Social & Messaging" },

  // --- DATING APPS (HIGH DEMAND) ---
  { id: "tinder", name: "Tinder", category: "Dating" },
  { id: "bumble", name: "Bumble", category: "Dating" },
  { id: "hinge", name: "Hinge", category: "Dating" },
  { id: "badoo", name: "Badoo", category: "Dating" },
  { id: "match", name: "Match.com", category: "Dating" },
  { id: "okcupid", name: "OkCupid", category: "Dating" },
  { id: "pof", name: "Plenty of Fish (POF)", category: "Dating" },
  { id: "grindr", name: "Grindr", category: "Dating" },
  { id: "tagged", name: "Tagged", category: "Dating" },

  // --- FINTECH, BANKING & PAYMENTS ---
  { id: "paypal", name: "PayPal", category: "Fintech & Payments" },
  { id: "cashapp", name: "CashApp", category: "Fintech & Payments" },
  { id: "wise", name: "Wise (TransferWise)", category: "Fintech & Payments" },
  { id: "stripe", name: "Stripe", category: "Fintech & Payments" },
  { id: "skrill", name: "Skrill", category: "Fintech & Payments" },
  { id: "payoneer", name: "Payoneer", category: "Fintech & Payments" },
  { id: "revolut", name: "Revolut", category: "Fintech & Payments" },
  { id: "venmo", name: "Venmo", category: "Fintech & Payments" },

  // --- FREELANCING & REMOTE WORK ---
  { id: "upwork", name: "Upwork", category: "Freelance" },
  { id: "fiverr", name: "Fiverr", category: "Freelance" },

  // --- ARTIFICIAL INTELLIGENCE ---
  { id: "openai", name: "OpenAI / ChatGPT", category: "AI & Tech" },
  { id: "claude", name: "Claude (Anthropic)", category: "AI & Tech" },

  // --- TECH ECOSYSTEMS & EMAIL ---
  { id: "google", name: "Google / Gmail / YouTube", category: "Tech & Email" },
  { id: "apple", name: "Apple ID / iCloud", category: "Tech & Email" },
  { id: "microsoft", name: "Microsoft / Outlook", category: "Tech & Email" },
  { id: "yahoo", name: "Yahoo Mail", category: "Tech & Email" },

  // --- ENTERTAINMENT, SHOPPING & TRAVEL ---
  { id: "netflix", name: "Netflix", category: "Entertainment" },
  { id: "spotify", name: "Spotify", category: "Entertainment" },
  { id: "steam", name: "Steam", category: "Gaming" },
  { id: "roblox", name: "Roblox", category: "Gaming" },
  { id: "amazon", name: "Amazon", category: "E-Commerce" },
  { id: "ebay", name: "eBay", category: "E-Commerce" },
  { id: "aliexpress", name: "AliExpress", category: "E-Commerce" },
  { id: "uber", name: "Uber", category: "Travel & Lifestyle" },
  { id: "bolt", name: "Bolt", category: "Travel & Lifestyle" },
  { id: "airbnb", name: "Airbnb", category: "Travel & Lifestyle" }
];
