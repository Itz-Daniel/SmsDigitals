"use client";

import { useState } from "react";
import { SlidersHorizontal, CheckCircle, WarningCircle, Spinner, Gear, Plus, Trash, X, Ticket, Clock, Users } from "@phosphor-icons/react";
import { DEFAULT_BRAND_PRICE_RULES, BrandMarginRule } from "@/lib/pricing-engine";

export default function AdminSettingsPanel({ 
  initialMargin, 
  initialAffiliatePercentage,
  initialBrandPricing 
}: { 
  initialMargin: number, 
  initialAffiliatePercentage?: number,
  initialBrandPricing?: Record<string, BrandMarginRule> | null
}) {
  // Convert 0.40 format to 40 for UI
  const [marginInput, setMarginInput] = useState<string>((initialMargin * 100).toString());
  const [affiliateInput, setAffiliateInput] = useState<string>((initialAffiliatePercentage || 5.0).toString());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Brand Pricing Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brandPricingMap, setBrandPricingMap] = useState<Record<string, BrandMarginRule>>(() => {
    return initialBrandPricing && Object.keys(initialBrandPricing).length > 0
      ? initialBrandPricing
      : DEFAULT_BRAND_PRICE_RULES;
  });

  const [newBrandKey, setNewBrandKey] = useState("");
  const [newMinPrice, setNewMinPrice] = useState("1.00");
  const [newMultiplier, setNewMultiplier] = useState("2.5");

  // Admin Voucher Creation Form State
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherAmountUsd, setVoucherAmountUsd] = useState("2.00");
  const [voucherMaxUses, setVoucherMaxUses] = useState("50");
  const [voucherValidDays, setVoucherValidDays] = useState("7");
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSaveGlobal = async (updatedBrandPricing?: Record<string, BrandMarginRule>) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const parsedMargin = parseFloat(marginInput);
      if (isNaN(parsedMargin) || parsedMargin < 0) {
        throw new Error("Margin must be a valid positive number.");
      }

      const parsedAffiliate = parseFloat(affiliateInput);
      if (isNaN(parsedAffiliate) || parsedAffiliate < 0) {
        throw new Error("Affiliate percentage must be a valid positive number.");
      }

      const databaseMargin = parsedMargin / 100;
      const targetBrandPricing = updatedBrandPricing || brandPricingMap;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profit_margin: databaseMargin,
          affiliate_percentage: parsedAffiliate,
          brand_pricing: targetBrandPricing
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update settings.");
      }

      setMessage({ text: `Settings & Brand Margins successfully saved.`, type: "success" });
      setIsModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: "error" });
      } else {
        setMessage({ text: "An unknown error occurred.", type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateVoucherAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) return;

    setIsCreatingVoucher(true);
    setVoucherMessage(null);

    try {
      const res = await fetch('/api/admin/voucher/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCodeInput.trim(),
          amountUsd: voucherAmountUsd,
          maxUses: voucherMaxUses,
          validDays: voucherValidDays
        })
      });

      const data = await res.json();
      if (data.success) {
        setVoucherMessage({ text: data.message, type: "success" });
        setVoucherCodeInput("");
      } else {
        setVoucherMessage({ text: data.error || "Failed to create voucher.", type: "error" });
      }
    } catch (err: any) {
      setVoucherMessage({ text: err.message || "Network error.", type: "error" });
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const updateBrandRule = (key: string, field: "minPriceUsd" | "multiplier", val: string) => {
    const num = parseFloat(val);
    setBrandPricingMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: isNaN(num) ? 0 : num
      }
    }));
  };

  const removeBrandRule = (key: string) => {
    setBrandPricingMap(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddBrandRule = () => {
    if (!newBrandKey.trim()) return;
    const cleanKey = newBrandKey.trim().toLowerCase();
    const minP = parseFloat(newMinPrice) || 1.0;
    const mult = parseFloat(newMultiplier) || 2.5;

    setBrandPricingMap(prev => ({
      ...prev,
      [cleanKey]: {
        minPriceUsd: minP,
        multiplier: mult
      }
    }));

    setNewBrandKey("");
    setNewMinPrice("1.00");
    setNewMultiplier("2.5");
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      
      {message && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold ${
          message.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Global Margin Settings Card */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
        
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <SlidersHorizontal size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Global Pricing Margin & Revenue Controls</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Adjust baseline profit margins across all 1,300+ services.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Default Profit Margin (%)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <input
                type="number"
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                placeholder="40"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Affiliate Reward Percentage (%)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <input
                type="number"
                value={affiliateInput}
                onChange={(e) => setAffiliateInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-lg text-slate-900 dark:text-white"
                placeholder="5"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Gear size={18} weight="bold" /> Configure Brand Pricing Rules ({Object.keys(brandPricingMap).length})
          </button>

          <button
            onClick={() => handleSaveGlobal()}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            {isSaving ? <Spinner className="animate-spin" size={18} /> : "Save Pricing Settings"}
          </button>
        </div>

      </div>

      {/* ADMIN GIFT CARD & PROMO VOUCHER CREATOR CARD */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
        
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Ticket size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Gift Card & Voucher Generator</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Set custom user limits and duration expiry for promo vouchers.</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
            Admin Creation Panel
          </span>
        </div>

        {voucherMessage && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
            voucherMessage.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {voucherMessage.type === "success" ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}
            <span>{voucherMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleCreateVoucherAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Voucher Code
            </label>
            <input
              type="text"
              placeholder="e.g. VIPSUMMER"
              value={voucherCodeInput}
              onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none uppercase"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Value Amount ($ USD)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="2.00"
              value={voucherAmountUsd}
              onChange={(e) => setVoucherAmountUsd(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center gap-1">
              <Users size={14} /> Max User Limit
            </label>
            <input
              type="number"
              placeholder="50"
              value={voucherMaxUses}
              onChange={(e) => setVoucherMaxUses(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center gap-1">
              <Clock size={14} /> Duration (Days)
            </label>
            <input
              type="number"
              placeholder="7"
              value={voucherValidDays}
              onChange={(e) => setVoucherValidDays(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={isCreatingVoucher || !voucherCodeInput.trim()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              {isCreatingVoucher ? <Spinner className="animate-spin" size={16} /> : <Ticket size={18} weight="bold" />}
              Generate Custom Voucher
            </button>
          </div>

        </form>

      </div>

      {/* BRAND PRICING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-black/10 dark:border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] flex flex-col gap-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Brand Margin Rules</h3>
                <p className="text-xs text-slate-500 dark:text-white/40">Set custom floor prices and multipliers for high-demand services.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* BRAND RULES SCROLLABLE LIST */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[45vh] pr-1 custom-scrollbar">
              {Object.entries(brandPricingMap).map(([key, rule]) => (
                <div key={key} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-900 dark:text-white capitalize w-full sm:w-1/3 truncate">
                    {key}
                  </span>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Min Price</span>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={rule.minPriceUsd}
                          onChange={(e) => updateBrandRule(key, "minPriceUsd", e.target.value)}
                          className="w-24 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-white/40">$</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Multiplier</span>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={rule.multiplier}
                          onChange={(e) => updateBrandRule(key, "multiplier", e.target.value)}
                          className="w-20 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-white/40">x</span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeBrandRule(key)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete brand rule"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ADD NEW BRAND RULE */}
            <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Brand Keyword (e.g. netflix)"
                value={newBrandKey}
                onChange={(e) => setNewBrandKey(e.target.value)}
                className="w-full sm:w-1/3 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="Min USD"
                  value={newMinPrice}
                  onChange={(e) => setNewMinPrice(e.target.value)}
                  className="w-20 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">Multiplier</span>
                <input
                  type="number"
                  placeholder="Multiplier x"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(e.target.value)}
                  className="w-16 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
              <button
                onClick={handleAddBrandRule}
                disabled={!newBrandKey.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                <Plus size={14} weight="bold" /> Add Rule
              </button>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveGlobal(brandPricingMap)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md shadow-brand-blue/20"
              >
                {isSaving ? <Spinner className="animate-spin" size={16} /> : "Save Brand Margins"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
