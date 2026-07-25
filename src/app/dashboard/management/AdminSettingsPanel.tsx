"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, CheckCircle, WarningCircle, Spinner, Gear, Plus, Trash, X, Ticket, Clock, Users, ShieldCheck, CurrencyDollar, Storefront, Copy, Check, UserPlus } from "@phosphor-icons/react";
import { DEFAULT_BRAND_PRICE_RULES, BrandMarginRule } from "@/lib/pricing-engine";

interface VoucherRecord {
  id: string;
  code: string;
  amount_usd: number;
  amount_ngn: number;
  max_uses: number;
  used_count: number;
  is_used: boolean;
  target_audience?: "all" | "new_users" | "existing_users";
  expires_at?: string;
  created_at: string;
}

export default function AdminSettingsPanel({ 
  initialMargin, 
  initialAffiliatePercentage,
  initialBrandPricing,
  initialRentalMinFloor = 0.80,
  initialRentalDailyRate = 0.50,
  initialRentalMargin = 30
}: { 
  initialMargin: number, 
  initialAffiliatePercentage?: number,
  initialBrandPricing?: Record<string, BrandMarginRule> | null,
  initialRentalMinFloor?: number,
  initialRentalDailyRate?: number,
  initialRentalMargin?: number
}) {
  // Convert 0.40 format to 40 for UI
  const [marginInput, setMarginInput] = useState<string>((initialMargin * 100).toString());
  const [affiliateInput, setAffiliateInput] = useState<string>((initialAffiliatePercentage || 5.0).toString());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Long-Term Rental Profit Margin & Floor Controls
  const [rentalMinFloorInput, setRentalMinFloorInput] = useState<string>(initialRentalMinFloor.toString());
  const [rentalDailyRateInput, setRentalDailyRateInput] = useState<string>(initialRentalDailyRate.toString());
  const [rentalMarginInput, setRentalMarginInput] = useState<string>(initialRentalMargin.toString());

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

  // Admin Voucher Creation & Target Audience State
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherAmountUsd, setVoucherAmountUsd] = useState("2.00");
  const [voucherMaxUses, setVoucherMaxUses] = useState("50");
  const [voucherValidDays, setVoucherValidDays] = useState("7");
  const [voucherTargetAudience, setVoucherTargetAudience] = useState<"all" | "new_users" | "existing_users">("all");
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [vouchersList, setVouchersList] = useState<VoucherRecord[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [deletingVoucherId, setDeletingVoucherId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load existing settings & vouchers on mount
  useEffect(() => {
    fetchVouchersHistory();
  }, []);

  const fetchVouchersHistory = async () => {
    setIsLoadingVouchers(true);
    try {
      const res = await fetch("/api/admin/voucher/list");
      const data = await res.json();
      if (data.success && data.vouchers) {
        setVouchersList(data.vouchers);
      }
    } catch (err) {
      console.error("Failed to load vouchers list:", err);
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  // Sync props to state if props update from server
  useEffect(() => {
    if (initialRentalMinFloor) setRentalMinFloorInput(initialRentalMinFloor.toString());
    if (initialRentalDailyRate) setRentalDailyRateInput(initialRentalDailyRate.toString());
    if (initialRentalMargin) setRentalMarginInput(initialRentalMargin.toString());
  }, [initialRentalMinFloor, initialRentalDailyRate, initialRentalMargin]);

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
          rental_min_floor_usd: parseFloat(rentalMinFloorInput) || 0.80,
          rental_daily_rate_usd: parseFloat(rentalDailyRateInput) || 0.50,
          rental_margin_percent: parseFloat(rentalMarginInput) || 30
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update settings.");
      }

      setMessage({ text: `🎉 All Global Settings & Rental Floor ($${rentalMinFloorInput}) saved & persisted!`, type: "success" });
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
          validDays: voucherValidDays,
          targetAudience: voucherTargetAudience
        })
      });

      const data = await res.json();
      if (data.success) {
        setVoucherMessage({ text: data.message, type: "success" });
        setVoucherCodeInput("");
        fetchVouchersHistory();
      } else {
        setVoucherMessage({ text: data.error || "Failed to create voucher.", type: "error" });
      }
    } catch (err: any) {
      setVoucherMessage({ text: err.message || "Network error.", type: "error" });
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke and delete voucher code "${code}"?`)) return;
    setDeletingVoucherId(id);

    try {
      const res = await fetch('/api/admin/voucher/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherId: id })
      });
      const data = await res.json();
      if (data.success) {
        fetchVouchersHistory();
      } else {
        alert(data.error || "Failed to delete voucher.");
      }
    } catch (err) {
      alert("Network error while deleting voucher.");
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
        
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
      <div className="bg-white dark:bg-[#111] border border-brand-blue/20 dark:border-brand-blue/30 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <Clock size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Long-Term Rental Profit Margin & Floor Controls</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Set minimum floor prices for 1-day rentals to keep pricing fair and highly profitable.</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            Fair Pricing Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between">
              Minimum 1-Day Floor ($)
              <span className="text-[10px] text-emerald-500 font-extrabold">~₦1,200 NGN</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <span className="text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.10"
                value={rentalMinFloorInput}
                onChange={(e) => setRentalMinFloorInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="0.80"
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-white/40">Fair minimum cost for a full 24-hour rental line.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between">
              Base Daily Rate ($)
              <span className="text-[10px] text-brand-blue font-extrabold">~₦750 NGN/day</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <span className="text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.10"
                value={rentalDailyRateInput}
                onChange={(e) => setRentalDailyRateInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="0.50"
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-white/40">Rate per day before bulk duration discounts.</span>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 md:col-span-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
              Rental Profit Margin (%)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <input
                type="number"
                value={rentalMarginInput}
                onChange={(e) => setRentalMarginInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="30"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-white/40">Profit markup on long-term lines.</span>
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
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
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

      {/* 4. ADMIN VOUCHER & GIFT CARD GENERATOR & HISTORY CENTER CARD */}
      <div className="bg-white dark:bg-[#111] border border-brand-blue/20 dark:border-brand-blue/30 rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <Ticket size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gift Card & Voucher Management Center</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Create promotional gift cards, target new/existing users, and track live redemption records.</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            {vouchersList.length} Total Vouchers Created
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

        {/* Voucher Generator Form (Fully Screen Responsive Grid) */}
        <form onSubmit={handleCreateVoucherAdmin} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Target Audience</label>
            <select
              value={voucherTargetAudience}
              onChange={(e) => setVoucherTargetAudience(e.target.value as any)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-bold text-xs text-slate-900 dark:text-white outline-none"
            >
              <option value="all" className="bg-white dark:bg-[#111] text-slate-900 dark:text-white">🌐 All Members (Everyone)</option>
              <option value="new_users" className="bg-white dark:bg-[#111] text-slate-900 dark:text-white">✨ New Registered Users Only (≤ 7 Days)</option>
              <option value="existing_users" className="bg-white dark:bg-[#111] text-slate-900 dark:text-white">👑 Existing Members Only (&gt; 7 Days)</option>
            </select>
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

          <div className="sm:col-span-2 md:col-span-3 xl:col-span-5 mt-1">
            <button
              type="submit"
              disabled={isCreatingVoucher || !voucherCodeInput.trim()}
              className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
            >
              {isCreatingVoucher ? <Spinner size={20} className="animate-spin" /> : "Create & Authorize Targeted Promo Voucher"}
            </button>
          </div>
        </form>

        {/* LIVE VOUCHERS HISTORY TABLE */}
        <div className="flex flex-col gap-4 border-t border-slate-200/80 dark:border-white/5 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Created Vouchers & Redemption Ledger</h3>
            <button
              onClick={fetchVouchersHistory}
              className="text-xs text-brand-blue hover:underline font-bold flex items-center gap-1"
            >
              Refresh Table
            </button>
          </div>

          {isLoadingVouchers ? (
            <div className="py-12 text-center flex justify-center">
              <Spinner size={24} className="animate-spin text-brand-blue" />
            </div>
          ) : vouchersList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-white/40 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/5 text-xs font-medium">
              No promo voucher codes have been generated yet. Use the form above to generate your first gift card code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-wider font-bold">
                    <th className="pb-3 px-3">Voucher Code</th>
                    <th className="pb-3 px-3">Value ($)</th>
                    <th className="pb-3 px-3">Target Audience</th>
                    <th className="pb-3 px-3">Usage Progress</th>
                    <th className="pb-3 px-3 text-center">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchersList.map((v) => {
                    const usedCount = v.used_count || 0;
                    const maxUses = v.max_uses || 1;
                    const isDepleted = v.is_used || usedCount >= maxUses;
                    const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
                    const percentUsed = Math.min(100, Math.round((usedCount / maxUses) * 100));
                    const audience = v.target_audience || "all";

                    return (
                      <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        {/* Code + Copy Button */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-black px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/10">
                              {v.code}
                            </span>
                            <button
                              onClick={() => copyVoucherCode(v.code)}
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title="Copy Code"
                            >
                              {copiedCode === v.code ? <Check className="text-emerald-500" size={14} weight="bold" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-3 font-mono font-bold text-xs text-brand-blue">
                          ${(v.amount_usd || 0).toFixed(2)} USD
                        </td>

                        {/* Target Audience Badge */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${
                            audience === 'new_users' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            audience === 'existing_users' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                            'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                          }`}>
                            {audience === 'new_users' ? <UserPlus size={12} weight="fill" /> :
                             audience === 'existing_users' ? <Users size={12} weight="fill" /> :
                             <Users size={12} />}
                            {audience === 'new_users' ? 'New Users (≤ 7d)' :
                             audience === 'existing_users' ? 'Existing (> 7d)' :
                             'All Members'}
                          </span>
                        </td>

                        {/* Usage Progress Bar */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 dark:text-white/50">
                              <span>{usedCount} / {maxUses} claimed</span>
                              <span>{percentUsed}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${isDepleted ? 'bg-amber-500' : 'bg-brand-blue'}`} 
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            isDepleted ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            {isExpired ? 'Expired' : isDepleted ? 'Fully Redeemed' : 'Active'}
                          </span>
                        </td>

                        {/* Delete / Revoke Action */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteVoucher(v.id, v.code)}
                            disabled={deletingVoucherId === v.id}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Revoke & Delete Voucher"
                          >
                            {deletingVoucherId === v.id ? <Spinner size={16} className="animate-spin" /> : <Trash size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
