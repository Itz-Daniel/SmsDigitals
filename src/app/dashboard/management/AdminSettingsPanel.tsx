"use client";

import { useState } from "react";
import { SlidersHorizontal, CheckCircle, WarningCircle, Spinner, Gear, Plus, Trash, X, Ticket, Clock, Users, ShieldCheck, CurrencyDollar, Storefront } from "@phosphor-icons/react";
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

  // Long-Term Rental Profit Margin & Floor Controls
  const [rentalMinFloorInput, setRentalMinFloorInput] = useState<string>("2.50");
  const [rentalDailyRateInput, setRentalDailyRateInput] = useState<string>("1.50");
  const [rentalMarginInput, setRentalMarginInput] = useState<string>("40");

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
          brand_pricing: targetBrandPricing,
          rental_min_floor_usd: parseFloat(rentalMinFloorInput) || 2.50,
          rental_daily_rate_usd: parseFloat(rentalDailyRateInput) || 1.50,
          rental_margin_percent: parseFloat(rentalMarginInput) || 40
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update settings.");
      }

      setMessage({ text: `All Global Settings, Brand Margins & Rental Floor Controls saved successfully!`, type: "success" });
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
    <div className="w-full flex flex-col gap-6 font-sans pb-20">
      
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

      {/* 1. Global Margin Settings Card */}
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
              Affiliate Commission (%)
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
      </div>

      {/* 2. LONG-TERM RENTAL PROFIT MARGIN & PRICING FLOOR CARD */}
      <div className="bg-white dark:bg-[#111] border border-brand-blue/20 dark:border-brand-blue/30 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <Clock size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Long-Term Rental Profit Margin & Floor Controls</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Set minimum floor prices for 1-day rentals to prevent undercutting short-term activations.</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            Profit-Protection Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1-Day Minimum Rental Floor ($) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between">
              Minimum 1-Day Floor ($)
              <span className="text-[10px] text-emerald-500 font-extrabold">~₦3,750 NGN</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <span className="text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.10"
                value={rentalMinFloorInput}
                onChange={(e) => setRentalMinFloorInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="2.50"
              />
            </div>
            <span className="text-[11px] text-slate-400">Guarantees 1-day rentals never undercut single OTP activations.</span>
          </div>

          {/* Daily Base Rate ($) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Base Daily Rate ($)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <span className="text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.10"
                value={rentalDailyRateInput}
                onChange={(e) => setRentalDailyRateInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="1.50"
              />
            </div>
            <span className="text-[11px] text-slate-400">Baseline rate per day before duration bulk discounts.</span>
          </div>

          {/* Profit Margin (%) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Rental Profit Margin (%)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <input
                type="number"
                value={rentalMarginInput}
                onChange={(e) => setRentalMarginInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="40"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
            <span className="text-[11px] text-slate-400">Business profit markup applied on long-term lines.</span>
          </div>

        </div>

        <button
          onClick={() => handleSaveGlobal()}
          disabled={isSaving}
          className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
        >
          {isSaving ? <Spinner size={20} className="animate-spin" /> : "Save Pricing Controls & Minimum Floors"}
        </button>
      </div>

      {/* 3. BRAND-SPECIFIC SERVICE PRICING RULES CARD */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Gear size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Brand-Specific Service Pricing Rules</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Configure custom price multipliers & minimum floors for WhatsApp, Telegram, Tinder, OpenAI, etc.</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md"
          >
            <Gear size={16} weight="bold" /> Configure Brand Rules ({Object.keys(brandPricingMap).length})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(brandPricingMap).map(([brand, rule]) => (
            <div key={brand} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col gap-1">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white capitalize">{brand}</span>
              <span className="text-[11px] text-slate-500 dark:text-white/40 font-mono">Min Floor: ${rule.minPriceUsd.toFixed(2)}</span>
              <span className="text-[11px] text-brand-blue font-mono font-bold">Multiplier: {rule.multiplier}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. ADMIN VOUCHER & GIFT CARD GENERATOR CARD */}
      <div className="bg-white dark:bg-[#111] border border-purple-500/20 dark:border-purple-500/30 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Ticket size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gift Card & Voucher Generator</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Generate promotional voucher codes with user limits and expiration durations.</p>
            </div>
          </div>
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Voucher Code</label>
            <input
              type="text"
              placeholder="e.g. VIPGIFT50"
              value={voucherCodeInput}
              onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white uppercase outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Value in USD ($)</label>
            <input
              type="number"
              step="0.50"
              placeholder="2.00"
              value={voucherAmountUsd}
              onChange={(e) => setVoucherAmountUsd(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">User Limit (Max Uses)</label>
            <input
              type="number"
              placeholder="50"
              value={voucherMaxUses}
              onChange={(e) => setVoucherMaxUses(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Duration (Valid Days)</label>
            <input
              type="number"
              placeholder="7"
              value={voucherValidDays}
              onChange={(e) => setVoucherValidDays(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 mt-2">
            <button
              type="submit"
              disabled={isCreatingVoucher || !voucherCodeInput.trim()}
              className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              {isCreatingVoucher ? <Spinner size={20} className="animate-spin" /> : "Create & Authorize Promo Voucher"}
            </button>
          </div>
        </form>
      </div>

      {/* BRAND PRICING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-black/10 dark:border-white/15 rounded-3xl p-6 md:p-8 max-w-2xl w-full flex flex-col gap-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gear className="text-brand-blue" /> Configure Brand Pricing Rules
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Add New Brand Rule Form */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Brand Price Override</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Service (e.g. whatsapp)"
                  value={newBrandKey}
                  onChange={e => setNewBrandKey(e.target.value)}
                  className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Min Price ($)"
                  value={newMinPrice}
                  onChange={e => setNewMinPrice(e.target.value)}
                  className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Multiplier (e.g. 2.5)"
                  value={newMultiplier}
                  onChange={e => setNewMultiplier(e.target.value)}
                  className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddBrandRule}
                className="py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={16} weight="bold" /> Add Rule
              </button>
            </div>

            {/* Active Brand Rules Table */}
            <div className="flex flex-col gap-3">
              {Object.entries(brandPricingMap).map(([brand, rule]) => (
                <div key={brand} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-4">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white capitalize w-28 shrink-0">{brand}</span>
                  
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">Min: $</span>
                      <input
                        type="number"
                        step="0.1"
                        value={rule.minPriceUsd}
                        onChange={e => updateBrandRule(brand, "minPriceUsd", e.target.value)}
                        className="w-16 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">Mult:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={rule.multiplier}
                        onChange={e => updateBrandRule(brand, "multiplier", e.target.value)}
                        className="w-16 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBrandRule(brand)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSaveGlobal()}
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 mt-2"
            >
              {isSaving ? <Spinner size={20} className="animate-spin" /> : "Save All Brand Pricing Rules"}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
