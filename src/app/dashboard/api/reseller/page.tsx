"use client";

import { useState, useEffect } from "react";
import { Storefront, ArrowRight, Spinner, CheckCircle, WarningCircle, Copy, Check, Gear, CurrencyDollar, Link as LinkIcon, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";

interface StorefrontConfig {
  id: string;
  store_slug: string;
  store_name: string;
  logo_url: string | null;
  accent_color: string;
  profit_margin_percent: number;
}

export default function ResellerManagementPage() {
  const [store, setStore] = useState<StorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form Inputs
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#0070F3");
  const [profitMargin, setProfitMargin] = useState("20");

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchStoreConfig();
  }, []);

  const fetchStoreConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reseller/store");
      const data = await res.json();
      if (data.success && data.store) {
        const s = data.store;
        setStore(s);
        setStoreName(s.store_name || "");
        setStoreSlug(s.store_slug || "");
        setLogoUrl(s.logo_url || "");
        setAccentColor(s.accent_color || "#0070F3");
        setProfitMargin(s.profit_margin_percent?.toString() || "20");
      }
    } catch (e) {
      console.error("Failed to load reseller store config:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/reseller/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeSlug,
          logoUrl,
          accentColor,
          profitMarginPercent: parseFloat(profitMargin) || 20
        })
      });

      const data = await res.json();

      if (data.success && data.store) {
        setStore(data.store);
        setMessage({ text: data.message || "Storefront saved successfully!", type: "success" });
      } else {
        setMessage({ text: data.error || "Failed to save storefront.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Network error while saving.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const fullStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${storeSlug || 'your-store'}` : `/store/${storeSlug || 'your-store'}`;

  const copyStoreUrl = () => {
    if (!storeSlug) return;
    navigator.clipboard.writeText(fullStoreUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/40 font-sans">
        <Spinner size={32} className="animate-spin text-brand-blue" />
        <span className="text-sm font-bold">Loading Reseller Storefront Controls...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#111111] p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm">
          <div className="flex flex-col gap-1">
            <Link 
              href="/dashboard/api"
              className="w-fit text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white transition-colors flex items-center gap-1.5 mb-1"
            >
              ← Back to Developer API Portal
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Storefront size={32} className="text-brand-blue" /> White-Label Reseller Storefront Builder
            </h1>
          </div>

          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 flex items-center gap-1.5">
            <Sparkle size={14} /> VIP Reseller Partner Mode
          </span>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <WarningCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: STOREFRONT FORM CONFIGURATOR (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#111111] p-6 sm:p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-xl flex flex-col gap-6">
            
            <div className="border-b border-black/5 dark:border-white/5 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gear size={20} className="text-brand-blue" /> Storefront Branding & Profit Controls
              </h2>
            </div>

            <form onSubmit={handleSaveStore} className="flex flex-col gap-5">
              
              {/* Store Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Storefront Title / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SpeedSMS Global"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white text-sm font-bold focus:border-brand-blue outline-none"
                />
              </div>

              {/* Store Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Custom Storefront URL Slug (`/store/[slug]`)
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden px-4">
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/40 border-r border-slate-200 dark:border-white/10 pr-3 mr-3">/store/</span>
                  <input
                    type="text"
                    required
                    placeholder="speedsms"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-transparent py-4 text-slate-900 dark:text-white text-sm font-bold outline-none"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Storefront Logo Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white text-sm font-bold focus:border-brand-blue outline-none"
                />
              </div>

              {/* Accent Color & Profit Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-black/10 dark:border-white/10 overflow-hidden bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{accentColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                    Profit Margin (% Markup)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      required
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pr-10 text-slate-900 dark:text-white text-sm font-bold focus:border-brand-blue outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 bg-brand-blue text-white font-extrabold text-sm p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-brand-blue/20 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Spinner size={18} className="animate-spin" /> Saving Storefront...
                  </>
                ) : (
                  <>
                    Save & Deploy Storefront <ArrowRight weight="bold" />
                  </>
                )}
              </button>

            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW & LINK SHARING CARD (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Live Storefront Link Box */}
            <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-xl flex flex-col gap-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon size={18} className="text-brand-blue" /> Your Live Storefront Link
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed font-medium">
                Share this link with your customers or embed it on your website. When customers buy numbers, you earn passive profits automatically!
              </p>

              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-brand-blue truncate">{fullStoreUrl}</span>
                <button
                  onClick={copyStoreUrl}
                  disabled={!storeSlug}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              {storeSlug && (
                <Link
                  href={`/store/${storeSlug}`}
                  target="_blank"
                  className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all text-center"
                >
                  Visit Live Storefront <ArrowRight weight="bold" />
                </Link>
              )}
            </div>

            {/* Profit Explainer Box */}
            <div className="p-6 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-brand-blue font-extrabold text-sm">
                <CurrencyDollar size={20} /> Passive Wholesale Margin Economics
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                When a customer orders a <strong>$0.80</strong> SMS line on your store with a <strong>{profitMargin}% profit markup</strong>:
              </p>
              <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-black/40 border border-brand-blue/20 flex flex-col gap-1.5 font-mono text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-white/50">Customer Pays:</span>
                  <span className="text-emerald-500">${(0.80 * (1 + (parseFloat(profitMargin) || 20) / 100)).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-white/50">Wholesale Deducted:</span>
                  <span className="text-slate-700 dark:text-slate-300">$0.80 USD</span>
                </div>
                <div className="flex justify-between border-t border-brand-blue/20 pt-1 text-brand-blue font-black">
                  <span>Your Net Passive Profit:</span>
                  <span>+${(0.80 * ((parseFloat(profitMargin) || 20) / 100)).toFixed(2)} USD</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
