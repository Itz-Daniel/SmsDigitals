"use client";

import { useState, useEffect } from "react";
import { 
  Code, 
  Key, 
  Copy, 
  Check, 
  Plus, 
  Trash, 
  TerminalWindow, 
  ShieldCheck, 
  Lightning, 
  BookOpen,
  ArrowRight,
  LockKey,
  Wallet,
  Spinner,
  Crown,
  Storefront,
  Hash,
  ClockCounterClockwise,
  Coins,
  Eye,
  EyeSlash
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { TwoFactorVerifyModal } from "@/components/TwoFactorVerifyModal";

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

type ServiceCategory = "numbers" | "marketplace" | "longterm" | "wallet";
type Language = "curl" | "python" | "node" | "php";

export default function DeveloperApiPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>("numbers");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("rent_number");
  const [activeLang, setActiveLang] = useState<Language>("curl");
  
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [keyNameInput, setKeyNameInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // 2FA Verification Modal State
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "generate" | "copy" | "reveal"; payload?: any } | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Record<string, boolean>>({});

  // Active Customer Wallet Check & Admin Bypass
  const [isFunded, setIsFunded] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [checkingWallet, setCheckingWallet] = useState(true);

  useEffect(() => {
    const checkUserFunding = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsFunded(false);
          setCheckingWallet(false);
          return;
        }

        const isAdmin = user.user_metadata?.role === 'admin' || 
                        user.app_metadata?.role === 'admin' ||
                        user.email?.toLowerCase().includes('admin');

        if (isAdmin) {
          setIsAdminUser(true);
          setIsFunded(true);
          setCheckingWallet(false);
          return;
        }

        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance_usd, balance_ngn, lifetime_deposits_usd')
          .eq('user_id', user.id)
          .single();

        if (wallet) {
          const hasBalance = (wallet.balance_usd && wallet.balance_usd > 0) || 
                             (wallet.balance_ngn && wallet.balance_ngn > 0) || 
                             (wallet.lifetime_deposits_usd && wallet.lifetime_deposits_usd > 0);
          setIsFunded(!!hasBalance);
        } else {
          setIsFunded(false);
        }
      } catch (err) {
        setIsFunded(false);
      } finally {
        setCheckingWallet(false);
      }
    };

    checkUserFunding();
  }, []);

  useEffect(() => {
    // NO PRE-CREATED MOCK KEYS: Starts 100% empty until user explicitly generates one!
    const stored = localStorage.getItem("sms_user_api_keys");
    if (stored) {
      try {
        setApiKeys(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const request2FaVerification = (type: "generate" | "copy" | "reveal", payload?: any) => {
    setPendingAction({ type, payload });
    setIs2FaModalOpen(true);
  };

  const handle2FaSuccess = () => {
    if (!pendingAction) return;

    if (pendingAction.type === "generate") {
      executeGenerateKey();
    } else if (pendingAction.type === "copy") {
      const { text, id } = pendingAction.payload;
      setUnlockedKeys(prev => ({ ...prev, [id]: true }));
      navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else if (pendingAction.type === "reveal") {
      const { id } = pendingAction.payload;
      setUnlockedKeys(prev => ({ ...prev, [id]: !prev[id] }));
    }
    setPendingAction(null);
  };

  const executeGenerateKey = () => {
    setIsGenerating(true);
    const newRawKey = `sd_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
    const newKeyObj: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: keyNameInput.trim() || "Reseller API Key",
      key: newRawKey,
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [newKeyObj, ...apiKeys];
    setApiKeys(updated);
    localStorage.setItem("sms_user_api_keys", JSON.stringify(updated));
    setNewlyCreatedKey(newRawKey);
    setUnlockedKeys(prev => ({ ...prev, [newKeyObj.id]: true }));
    setKeyNameInput("");
    setIsGenerating(false);
  };

  const handleDeleteKey = (id: string) => {
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem("sms_user_api_keys", JSON.stringify(updated));
  };

  const copyText = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const sampleApiKey = apiKeys[0]?.key || "sd_live_your_api_key_here";

  // Dynamic Code Generator for 4 Categories & Endpoints
  const getSnippet = () => {
    if (activeCategory === "numbers") {
      if (selectedEndpoint === "rent_number") {
        if (activeLang === "curl") {
          return `curl -X POST https://smsdigitals.vercel.app/api/v1/user/rent \\
  -H "Authorization: Bearer ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"country": "usa", "service": "wa", "currency": "USD"}';`;
        }
        if (activeLang === "python") {
          return `import requests

url = "https://smsdigitals.vercel.app/api/v1/user/rent"
headers = {
    "Authorization": "Bearer ${sampleApiKey}",
    "Content-Type": "application/json"
}
payload = {
    "country": "usa",
    "service": "wa"  # WhatsApp
}

res = requests.post(url, json=payload)
print(res.json())`;
        }
        if (activeLang === "node") {
          return `const fetch = require('node-fetch');

async function buyVirtualNumber() {
  const res = await fetch('https://smsdigitals.vercel.app/api/v1/user/rent', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${sampleApiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ country: 'usa', service: 'wa' })
  });
  
  const data = await res.json();
  console.log(data);
}

buyVirtualNumber();`;
        }
        return `<?php
$ch = curl_init('https://smsdigitals.vercel.app/api/v1/user/rent');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${sampleApiKey}',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['country' => 'usa', 'service' => 'wa']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo $response;
?>`;
      }

      if (activeLang === "curl") {
        return `curl -X GET "https://smsdigitals.vercel.app/api/v1/user/check?order_id=ord_894102" \\
  -H "Authorization: Bearer ${sampleApiKey}"`;
      }
      return `import requests

url = "https://smsdigitals.vercel.app/api/v1/user/check?order_id=ord_894102"
headers = {"Authorization": "Bearer ${sampleApiKey}"}

res = requests.get(url, headers=headers)
print(res.json())`;
    }

    if (activeCategory === "marketplace") {
      if (selectedEndpoint === "mkt_catalog") {
        if (activeLang === "curl") {
          return `curl -X GET https://smsdigitals.vercel.app/api/v1/marketplace/catalog \\
  -H "Authorization: Bearer ${sampleApiKey}"`;
        }
        return `import requests

res = requests.get(
    "https://smsdigitals.vercel.app/api/v1/marketplace/catalog",
    headers={"Authorization": "Bearer ${sampleApiKey}"}
)
print(res.json())`;
      }

      if (activeLang === "curl") {
        return `curl -X POST https://smsdigitals.vercel.app/api/v1/marketplace/buy \\
  -H "Authorization: Bearer ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"item_id": "mkt_fb_01", "quantity": 1}';`;
      }
      return `import requests

url = "https://smsdigitals.vercel.app/api/v1/marketplace/buy"
headers = {
    "Authorization": "Bearer ${sampleApiKey}",
    "Content-Type": "application/json"
}
payload = {"item_id": "mkt_fb_01", "quantity": 1}

res = requests.post(url, json=payload)
print(res.json())`;
    }

    if (activeCategory === "longterm") {
      return `curl -X POST https://smsdigitals.vercel.app/api/sms/long-term/rent \\
  -H "Authorization: Bearer ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"country": "us", "days": 30, "service": "wa"}';`;
    }

    return `curl -X GET https://smsdigitals.vercel.app/api/v1/user/balance \\
  -H "Authorization: Bearer ${sampleApiKey}"`;
  };

  const getResponseSchema = () => {
    if (activeCategory === "numbers") {
      if (selectedEndpoint === "rent_number") {
        return `{
  "success": true,
  "order_id": "ord_894102",
  "phone_number": "+13328942019",
  "service": "wa",
  "country": "usa",
  "cost": 1.50,
  "currency": "USD",
  "expires_at": "2026-07-24T12:15:00Z"
}`;
      }
      return `{
  "success": true,
  "order_id": "ord_894102",
  "phone_number": "+13328942019",
  "status": "Received",
  "sms_code": "849-201",
  "delivered_at": "2026-07-24T12:02:14Z"
}`;
    }

    if (activeCategory === "marketplace") {
      if (selectedEndpoint === "mkt_catalog") {
        return `{
  "success": true,
  "total_items": 3,
  "catalog": [
    {
      "id": "mkt_fb_01",
      "name": "Facebook Verified PVA (Aged 2022)",
      "price_usd": 4.50,
      "in_stock": 42
    }
  ]
}`;
      }
      return `{
  "success": true,
  "order_id": "mkt_ord_90412",
  "item_id": "mkt_fb_01",
  "credentials": [
    "login: password123 | 2fa_key: JBSWY3DPEHPK3PXP"
  ],
  "download_url": "https://smsdigitals.com/api/marketplace/download?order=mkt_ord_90412"
}`;
    }

    if (activeCategory === "longterm") {
      return `{
  "success": true,
  "rental_id": "lt_99410",
  "phone_number": "+14159820192",
  "rental_period_days": 30,
  "cost_usd": 18.00,
  "auto_renew": true
}`;
    }

    return `{
  "success": true,
  "user_id": "usr_99182",
  "balance_usd": 150.00,
  "balance_ngn": 225000,
  "api_status": "operational"
}`;
  };

  if (checkingWallet) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/40 font-sans">
        <Spinner size={32} className="animate-spin text-brand-blue" />
        <span className="text-sm font-bold">Loading Security Credentials...</span>
      </div>
    );
  }

  // RESTRICTED ACCESS CARD FOR UNFUNDED NON-ADMIN ACCOUNTS
  if (isFunded === false && !isAdminUser) {
    return (
      <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 flex items-center justify-center transition-colors duration-500">
        <div className="max-w-xl mx-auto flex flex-col gap-6 text-center items-center bg-white dark:bg-[#111111] p-8 md:p-12 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <LockKey size={32} weight="duotone" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500">
              Active Customer Account Required
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Unlock Developer API Access
            </h1>
            <p className="text-slate-500 dark:text-white/50 text-sm leading-relaxed max-w-md">
              Reseller API Keys and automated endpoints are reserved for active platform users. Fund your wallet with at least <strong className="text-slate-800 dark:text-white">₦1,000 / $1.00</strong> to instantly generate API Keys and access automated documentation.
            </p>
          </div>

          <Link
            href="/dashboard/fund"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet size={18} weight="bold" /> Fund Wallet to Unlock API Access <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500 overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 relative">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111111] p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <Code size={24} weight="bold" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-blue flex items-center gap-1">
                Reseller & Developer API v1 {isAdminUser && <span className="ml-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-extrabold uppercase flex items-center gap-1"><Crown size={12} weight="fill" /> Admin Bypass Active</span>}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Automated API Documentation & Hub
            </h1>
            <p className="text-slate-500 dark:text-white/50 text-sm max-w-xl">
              Connect your Telegram bots, Python scripts, and automated software to buy virtual numbers, digital accounts, and long-term lines via REST API.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-4 py-2 rounded-2xl border border-emerald-500/20">
            <ShieldCheck size={20} weight="fill" className="animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider">Security Status</span>
              <span className="text-xs font-bold">2FA Lock Active</span>
            </div>
          </div>
        </div>

        {/* CATEGORY NAV TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar relative z-10">
          <button
            onClick={() => { setActiveCategory("numbers"); setSelectedEndpoint("rent_number"); }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${activeCategory === "numbers" ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20" : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"}`}
          >
            <Hash size={16} weight="bold" /> Virtual Numbers API
          </button>
          
          <button
            onClick={() => { setActiveCategory("marketplace"); setSelectedEndpoint("mkt_catalog"); }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${activeCategory === "marketplace" ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20" : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"}`}
          >
            <Storefront size={16} weight="bold" /> Digital Marketplace API
          </button>

          <button
            onClick={() => { setActiveCategory("longterm"); setSelectedEndpoint("rent_longterm"); }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${activeCategory === "longterm" ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20" : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"}`}
          >
            <ClockCounterClockwise size={16} weight="bold" /> Long-Term Rentals API
          </button>

          <button
            onClick={() => { setActiveCategory("wallet"); setSelectedEndpoint("get_balance"); }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${activeCategory === "wallet" ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20" : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"}`}
          >
            <Coins size={16} weight="bold" /> Wallet & Balance API
          </button>
        </div>

        {/* MAIN SPLIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* LEFT: API KEY GENERATOR & LIST */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#111111] rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key size={20} className="text-brand-blue" /> Your Reseller API Keys
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white">
                  {apiKeys.length} Active
                </span>
              </div>

              {/* GENERATE NEW KEY FORM (REQUIRES 2FA) */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Key Name / Application Label
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Telegram Bot #1"
                    value={keyNameInput}
                    onChange={(e) => setKeyNameInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-blue min-w-0"
                  />
                  <button
                    onClick={() => request2FaVerification("generate")}
                    disabled={isGenerating}
                    className="px-4 py-3 rounded-2xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-brand-blue/20"
                  >
                    <Plus size={16} weight="bold" /> Generate
                  </button>
                </div>
              </div>

              {/* NEWLY CREATED KEY NOTICE */}
              {newlyCreatedKey && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2 animate-in fade-in">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={16} weight="bold" /> New API Key Generated & 2FA Verified!
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-black border border-emerald-500/30">
                    <code className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">{newlyCreatedKey}</code>
                    <button
                      onClick={() => copyText(newlyCreatedKey, 'new-key')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shrink-0"
                    >
                      {copiedKeyId === 'new-key' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* KEYS LIST (STARTS EMPTY UNTIL USER CREATES ONE) */}
              <div className="flex flex-col gap-3">
                {apiKeys.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center flex flex-col items-center gap-2">
                    <Key size={24} className="text-slate-400 dark:text-white/40" />
                    <span className="text-xs font-bold text-slate-700 dark:text-white/80">No API Keys Generated Yet</span>
                    <span className="text-[11px] text-slate-400 dark:text-white/40">Enter a label above and click Generate to create your first reseller key.</span>
                  </div>
                ) : (
                  apiKeys.map((item) => {
                    const isUnlocked = unlockedKeys[item.id];
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</span>
                          <code className="text-[11px] font-mono text-slate-400 dark:text-white/40 truncate">
                            {isUnlocked ? item.key : "sd_live_••••••••••••••••••••"}
                          </code>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              if (isUnlocked) {
                                copyText(item.key, item.id);
                              } else {
                                request2FaVerification("copy", { text: item.key, id: item.id });
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm border border-slate-200/80 dark:border-transparent"
                          >
                            {copiedKeyId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            {copiedKeyId === item.id ? 'Copied' : 'Copy Key'}
                          </button>

                          <button
                            onClick={() => {
                              if (isUnlocked) {
                                setUnlockedKeys(prev => ({ ...prev, [item.id]: false }));
                              } else {
                                request2FaVerification("reveal", { id: item.id });
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors"
                            title={isUnlocked ? "Mask Key" : "Verify 2FA to Unmask"}
                          >
                            {isUnlocked ? <EyeSlash size={16} /> : <Eye size={16} />}
                          </button>

                          <button
                            onClick={() => handleDeleteKey(item.id)}
                            className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

          {/* RIGHT: INTERACTIVE CODE SNIPPETS & DOCS */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#111111] text-slate-900 dark:text-white rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/5 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TerminalWindow size={20} className="text-brand-blue" /> API Interactive Playground
                </h2>

                {/* ENDPOINT SELECTOR TABS PER CATEGORY */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-x-auto max-w-full">
                  {activeCategory === "numbers" && (
                    <>
                      <button
                        onClick={() => setSelectedEndpoint("rent_number")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedEndpoint === "rent_number" ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 dark:text-white/60"}`}
                      >
                        1. Rent Number
                      </button>
                      <button
                        onClick={() => setSelectedEndpoint("check_code")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedEndpoint === "check_code" ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 dark:text-white/60"}`}
                      >
                        2. Check Code
                      </button>
                    </>
                  )}

                  {activeCategory === "marketplace" && (
                    <>
                      <button
                        onClick={() => setSelectedEndpoint("mkt_catalog")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedEndpoint === "mkt_catalog" ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 dark:text-white/60"}`}
                      >
                        1. Fetch Catalog
                      </button>
                      <button
                        onClick={() => setSelectedEndpoint("mkt_buy")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedEndpoint === "mkt_buy" ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 dark:text-white/60"}`}
                      >
                        2. Buy Account
                      </button>
                    </>
                  )}

                  {activeCategory === "longterm" && (
                    <button
                      onClick={() => setSelectedEndpoint("rent_longterm")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-blue text-white shadow-sm shrink-0"
                    >
                      1. Rent Long-Term Line
                    </button>
                  )}

                  {activeCategory === "wallet" && (
                    <button
                      onClick={() => setSelectedEndpoint("get_balance")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-blue text-white shadow-sm shrink-0"
                    >
                      1. Check Balance
                    </button>
                  )}
                </div>
              </div>

              {/* LANGUAGE TABS */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-2 overflow-x-auto">
                  {(["curl", "python", "node", "php"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        activeLang === lang
                          ? "bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white"
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border-slate-200/80 dark:border-white/10"
                      }`}
                    >
                      {lang === "curl" ? "cURL" : lang === "python" ? "Python" : lang === "node" ? "Node.js" : "PHP"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => copyText(getSnippet())}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-xs font-bold hover:bg-brand-blue hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                >
                  {copiedSnippet ? <Check size={14} /> : <Copy size={14} />}
                  {copiedSnippet ? "Copied Snippet!" : "Copy Code"}
                </button>
              </div>

              {/* CODE BLOCK */}
              <div className="relative rounded-2xl bg-slate-900 dark:bg-[#050505] p-5 border border-slate-800 dark:border-white/10 overflow-x-auto custom-scrollbar shadow-inner">
                <pre className="font-mono text-xs text-slate-200 dark:text-slate-300 leading-relaxed whitespace-pre min-w-[280px]">
                  {getSnippet()}
                </pre>
              </div>

              {/* RESPONSE SPECIFICATION */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                  Sample JSON Response
                </span>
                <pre className="font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 overflow-x-auto custom-scrollbar min-w-[280px]">
                  {getResponseSchema()}
                </pre>
              </div>

            </div>
          </div>

        </div>
      </div>

      <TwoFactorVerifyModal
        isOpen={is2FaModalOpen}
        onClose={() => setIs2FaModalOpen(false)}
        onSuccess={handle2FaSuccess}
      />
    </div>
  );
}
