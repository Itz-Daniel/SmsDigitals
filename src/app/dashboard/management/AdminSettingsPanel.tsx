"use client";

import { useState } from "react";
import { SlidersHorizontal, CheckCircle, WarningCircle, Spinner, Gear, Plus, Trash, X } from "@phosphor-icons/react";
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
        throw new Error(data.error || "Failed to update settings.");
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

  const updateBrandRule = (key: string, field: "minPriceUsd" | "multiplier", val: string) => {
    const num = parseFloat(val) || 0;
    setBrandPricingMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: num
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
    setBrandPricingMap(prev => ({
      ...prev,
      [cleanKey]: {
        minPriceUsd: parseFloat(newMinPrice) || 1.00,
        multiplier: parseFloat(newMultiplier) || 2.0
      }
    }));
    setNewBrandKey("");
  };

  return (
    <div className="bg-white dark:bg-[#111111] border border-black/5 dark:border-white/5 rounded-[24px] p-6 md:p-8 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <SlidersHorizontal size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Configuration</h2>
            <p className="text-slate-500 dark:text-white/40 text-sm">Adjust pricing margins, brand floors, and affiliate rewards.</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center gap-2"
        >
          <Gear size={16} weight="bold" /> Configure Brand Pricing
        </button>
      </div>

      <div className="max-w-xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white/80">
            Base Profit Margin (%)
          </label>
          <div className="relative">
            <input 
              type="number"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono text-slate-900 dark:text-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all shadow-inner dark:shadow-none"
              placeholder="40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 font-bold">%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white/80">
            Affiliate Reward (%)
          </label>
          <div className="relative">
            <input 
              type="number"
              value={affiliateInput}
              onChange={(e) => setAffiliateInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black border border-black/5 dark:border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono text-slate-900 dark:text-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all shadow-inner dark:shadow-none"
              placeholder="5.0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 font-bold">%</span>
          </div>
        </div>
      </div>

      <div className="max-w-xl flex flex-col gap-4">
        <button 
          onClick={() => handleSaveGlobal()}
          disabled={isSaving}
          className="bg-brand-blue text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center shadow-md dark:shadow-none w-full md:w-auto"
        >
          {isSaving ? <Spinner className="animate-spin w-5 h-5" /> : "Deploy Global Settings"}
        </button>

        {message && (
          <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle size={20} weight="fill" className="shrink-0 mt-0.5" /> : <WarningCircle size={20} weight="fill" className="shrink-0 mt-0.5" />}
            <p className="text-sm font-medium leading-relaxed">{message.text}</p>
          </div>
        )}
      </div>

      {/* BRAND PRICING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col gap-6 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gear className="text-brand-blue" /> Brand Price Floors & Multipliers
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                  Customize minimum price floors ($ USD) and markup multipliers per application brand.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white hover:bg-slate-200 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* BRAND LIST */}
            <div className="overflow-y-auto max-h-[400px] flex flex-col gap-3 pr-1 custom-scrollbar">
              {Object.entries(brandPricingMap).map(([key, rule]) => (
                <div 
                  key={key}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm capitalize text-slate-900 dark:text-white min-w-[100px]">
                      {key}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-white/40 font-bold uppercase">Min Floor:</span>
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-white/40">$</span>
                        <input
                          type="number"
                          step="0.10"
                          value={rule.minPriceUsd}
                          onChange={(e) => updateBrandRule(key, "minPriceUsd", e.target.value)}
                          className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl pl-6 pr-2 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-white/40 font-bold uppercase">Markup:</span>
                      <div className="relative w-20">
                        <input
                          type="number"
                          step="0.1"
                          value={rule.multiplier}
                          onChange={(e) => updateBrandRule(key, "multiplier", e.target.value)}
                          className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
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
