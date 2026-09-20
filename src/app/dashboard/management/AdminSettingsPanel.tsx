"use client";

import { useState, useEffect } from "react";
import { 
  SlidersHorizontal, 
  CheckCircle, 
  WarningCircle, 
  Spinner, 
  Plus, 
  Trash, 
  Ticket, 
  Clock, 
  Copy, 
  Check, 
  Sparkle, 
  Tag, 
  MagnifyingGlass,
  ArrowRight
} from "@phosphor-icons/react";
import { DEFAULT_BASELINE_FLOOR_NGN } from "@/lib/pricing-engine";
import { SERVICES } from "@/lib/data/sms-data";

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
  initialMargin = 0.40, 
  initialAffiliatePercentage = 5.0,
  initialBrandPricing,
  initialRentalMinFloor = 0.80,
  initialRentalDailyRate = 0.50,
  initialRentalMargin = 30
}: { 
  initialMargin?: number, 
  initialAffiliatePercentage?: number,
  initialBrandPricing?: any,
  initialRentalMinFloor?: number,
  initialRentalDailyRate?: number,
  initialRentalMargin?: number
}) {
  const [affiliateInput, setAffiliateInput] = useState<string>((initialAffiliatePercentage || 5.0).toString());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- 1. DIRECT NAIRA SERVICE PRICING STATE (LOADED 100% FROM DATABASE) ---
  const [pricesNgn, setPricesNgn] = useState<Record<string, number>>(() => {
    const saved: Record<string, number> = {};
    if (initialBrandPricing) {
      if (initialBrandPricing.pricesNgn && typeof initialBrandPricing.pricesNgn === 'object') {
        Object.assign(saved, initialBrandPricing.pricesNgn);
      } else {
        for (const [k, v] of Object.entries(initialBrandPricing)) {
          if (typeof v === 'number') saved[k] = v;
          else if (v && typeof (v as any).priceNgn === 'number') saved[k] = (v as any).priceNgn;
          else if (v && typeof (v as any).minPriceUsd === 'number') saved[k] = Math.round((v as any).minPriceUsd * 1500);
        }
      }
    }
    
    // Ensure all curated services appear in the admin panel table ready for the admin to configure
    const baseline = initialBrandPricing?.baselineFloorNgn || DEFAULT_BASELINE_FLOOR_NGN;
    const result: Record<string, number> = { ...saved };
    for (const service of SERVICES) {
      if (!(service.id in result)) {
        result[service.id] = baseline;
      }
    }
    return result;
  });

  const [promoMultiplier, setPromoMultiplier] = useState<number>(() => {
    if (initialBrandPricing?.promoMultiplier && typeof initialBrandPricing.promoMultiplier === 'number') {
      return initialBrandPricing.promoMultiplier;
    }
    return 1.0;
  });

  const [baselineFloorNgn, setBaselineFloorNgn] = useState<number>(() => {
    if (initialBrandPricing?.baselineFloorNgn && typeof initialBrandPricing.baselineFloorNgn === 'number') {
      return initialBrandPricing.baselineFloorNgn;
    }
    return DEFAULT_BASELINE_FLOOR_NGN;
  });

  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("2000");
  const [serviceSearch, setServiceSearch] = useState("");

  // --- 2. LONG-TERM RENTAL CONTROLS STATE ---
  const [rentalMinFloorInput, setRentalMinFloorInput] = useState<string>(initialRentalMinFloor.toString());
  const [rentalDailyRateInput, setRentalDailyRateInput] = useState<string>(initialRentalDailyRate.toString());
  const [rentalMarginInput, setRentalMarginInput] = useState<string>(initialRentalMargin.toString());

  // --- 3. VOUCHER CREATION STATE ---
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

  const handlePriceChange = (serviceKey: string, value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    setPricesNgn(prev => ({
      ...prev,
      [serviceKey]: isNaN(num) ? 0 : num
    }));
  };

  const handleAddServicePrice = () => {
    if (!newServiceName.trim()) return;
    const cleanKey = newServiceName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const price = parseInt(newServicePrice.replace(/[^0-9]/g, ''), 10) || 2000;
    
    setPricesNgn(prev => ({
      ...prev,
      [cleanKey]: price
    }));

    setNewServiceName("");
    setNewServicePrice("2000");
  };

  const handleRemoveServicePrice = (key: string) => {
    setPricesNgn(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const parsedAffiliate = parseFloat(affiliateInput);
      if (isNaN(parsedAffiliate) || parsedAffiliate < 0) {
        throw new Error("Affiliate percentage must be a valid positive number.");
      }

      const payload = {
        profit_margin: 0.40,
        affiliate_percentage: parsedAffiliate,
        brand_pricing: {
          pricesNgn,
          promoMultiplier,
          baselineFloorNgn: baselineFloorNgn || DEFAULT_BASELINE_FLOOR_NGN
        },
        rental_min_floor_usd: parseFloat(rentalMinFloorInput) || 0.80,
        rental_daily_rate_usd: parseFloat(rentalDailyRateInput) || 0.50,
        rental_margin_percent: parseFloat(rentalMarginInput) || 30
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update settings.");
      }

      setMessage({ 
        text: `🎉 Pricing Saved! Baseline floor is ₦${(baselineFloorNgn || 1200).toLocaleString()} & ${Object.keys(pricesNgn).length} service prices updated live!`, 
        type: "success" 
      });
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
          amountUsd: parseFloat(voucherAmountUsd) || 2.00,
          maxUses: parseInt(voucherMaxUses) || 50,
          validDays: parseInt(voucherValidDays) || 7,
          targetAudience: voucherTargetAudience
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create voucher code.");
      }

      setVoucherMessage({ 
        text: `🎉 Promo Voucher '${data.voucher.code}' created successfully ($${data.voucher.amount_usd} USD)!`, 
        type: "success" 
      });
      setVoucherCodeInput("");
      fetchVouchersHistory();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setVoucherMessage({ text: err.message, type: "error" });
      }
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this voucher code?")) return;
    setDeletingVoucherId(id);
    try {
      const res = await fetch(`/api/admin/voucher/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete voucher.");
      setVouchersList(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      alert((err as Error).message || "Error deleting voucher.");
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter services for the table
  const filteredServices = Object.entries(pricesNgn).filter(([name]) => 
    name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

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

      {/* ======================================================== */}
      {/* 1. DIRECT NAIRA PRICING & 1-CLICK PROMO CONTROLS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black">₦</span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Direct Naira (₦) Pricing & Live Margins
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/50">
                What you type here is exactly what your customers see and pay. No hidden formulas.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAllSettings}
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
          >
            {isSaving ? <Spinner size={18} className="animate-spin" /> : <CheckCircle size={18} weight="bold" />}
            Save All Prices
          </button>
        </div>

        {/* 1-CLICK PROMO / SURGE SELECTOR */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-white flex items-center gap-1.5">
              <Sparkle className="text-brand-blue" size={16} weight="fill" />
              1-Click Global Promotional Mode
            </span>
            <span className="text-xs font-mono font-bold text-brand-blue bg-brand-blue/10 px-2.5 py-0.5 rounded-full border border-brand-blue/20">
              Active Multiplier: {promoMultiplier}x ({promoMultiplier === 1 ? 'Normal' : promoMultiplier < 1 ? `${Math.round((1 - promoMultiplier) * 100)}% OFF` : `+${Math.round((promoMultiplier - 1) * 100)}% Surge`})
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Instantly scale all store prices for promotions, weekend sales, or high demand without retyping each service:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setPromoMultiplier(1.0)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                promoMultiplier === 1.0
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                  : "bg-white dark:bg-black/40 text-slate-700 dark:text-white/80 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              🟢 Normal (0%)
            </button>

            <button
              type="button"
              onClick={() => setPromoMultiplier(0.90)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                promoMultiplier === 0.90
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-white dark:bg-black/40 text-slate-700 dark:text-white/80 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              🎉 Weekend (-10%)
            </button>

            <button
              type="button"
              onClick={() => setPromoMultiplier(0.80)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                promoMultiplier === 0.80
                  ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                  : "bg-white dark:bg-black/40 text-slate-700 dark:text-white/80 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              ⚡ Flash Sale (-20%)
            </button>

            <button
              type="button"
              onClick={() => setPromoMultiplier(1.20)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                promoMultiplier === 1.20
                  ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20"
                  : "bg-white dark:bg-black/40 text-slate-700 dark:text-white/80 border-slate-200 dark:border-white/10 hover:border-slate-300"
              }`}
            >
              🔥 Surge (+20%)
            </button>
          </div>
        </div>

        {/* BASELINE SAFETY FLOOR & AFFILIATE ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white flex items-center justify-between">
              Baseline Safety Floor (₦)
              <span className="text-[10px] text-emerald-500 font-extrabold">Min Price Guarantee</span>
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5">
              <span className="text-slate-400 font-extrabold">₦</span>
              <input
                type="number"
                value={baselineFloorNgn}
                onChange={(e) => setBaselineFloorNgn(parseInt(e.target.value) || 1200)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="1200"
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-white/40">
              Any miscellaneous unlisted app will never sell for less than this amount.
            </span>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white flex items-center justify-between">
              Affiliate Commission (%)
              <span className="text-[10px] text-brand-blue font-extrabold">Per Deposit</span>
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5">
              <input
                type="number"
                value={affiliateInput}
                onChange={(e) => setAffiliateInput(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-base text-slate-900 dark:text-white"
                placeholder="5"
              />
              <span className="text-slate-400 font-extrabold">%</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-white/40">
              Commission rewarded to users whose referrals fund their wallet.
            </span>
          </div>
        </div>

        {/* DIRECT NAIRA SERVICE PRICING TABLE */}
        <div className="flex flex-col gap-4 border-t border-slate-200/80 dark:border-white/5 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Tag size={16} weight="bold" className="text-brand-blue" />
                Service Price Ledger ({Object.keys(pricesNgn).length} Configured)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-white/40">
                Type the exact Naira amount you want your customers to pay.
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 w-full sm:w-64">
              <MagnifyingGlass size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Filter services..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Add New Service */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/15 flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-extrabold text-slate-700 dark:text-white shrink-0">
              Add New Service:
            </span>
            <input
              type="text"
              placeholder="e.g. grindr, binance, uber"
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none w-full sm:w-56"
            />
            <div className="flex items-center gap-1 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 w-full sm:w-40">
              <span className="text-xs font-extrabold text-slate-400">₦</span>
              <input
                type="number"
                placeholder="Price"
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                className="w-full bg-transparent outline-none text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddServicePrice}
              className="py-2 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-extrabold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
            >
              <Plus size={14} weight="bold" /> Add Service
            </button>
          </div>

          {/* Services List Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-white/5">
            <table className="w-full text-left whitespace-nowrap min-w-[620px]">
              <thead className="sticky top-0 bg-slate-100 dark:bg-[#181818] z-10">
                <tr className="border-b border-black/5 dark:border-white/5 text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-wider font-extrabold">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Your Retail Price (₦)</th>
                  <th className="py-3 px-4">USD Equivalent</th>
                  <th className="py-3 px-4">Est. Wholesale</th>
                  <th className="py-3 px-4">Your Net Profit (₦)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-[#111]">
                {filteredServices.map(([key, price]) => {
                  const effectivePrice = Math.round(price * promoMultiplier);
                  const approxWholesaleNgn = 250; // Average wholesale for 5SIM line
                  const approxProfit = Math.max(0, effectivePrice - approxWholesaleNgn);
                  const profitMarginPct = Math.round((approxProfit / effectivePrice) * 100) || 0;
                  const usdEquiv = (effectivePrice / 1500).toFixed(2);

                  return (
                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      {/* Service Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white capitalize">
                            {key}
                          </span>
                        </div>
                      </td>

                      {/* Retail Price Input */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 w-36">
                          <span className="text-slate-400 font-extrabold text-xs">₦</span>
                          <input
                            type="number"
                            value={price || ""}
                            onChange={(e) => handlePriceChange(key, e.target.value)}
                            className="w-full bg-transparent outline-none font-mono font-extrabold text-sm text-slate-900 dark:text-white"
                            placeholder="2000"
                          />
                        </div>
                      </td>

                      {/* USD Equivalent */}
                      <td className="py-3 px-4 font-mono font-bold text-xs text-slate-500 dark:text-white/60">
                        ${usdEquiv} USD
                      </td>

                      {/* Wholesale Cost */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        ~₦{approxWholesaleNgn}
                      </td>

                      {/* Net Profit Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          +₦{approxProfit.toLocaleString()} ({profitMarginPct}%)
                        </span>
                      </td>

                      {/* Remove Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveServicePrice(key)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove custom rule"
                        >
                          <Trash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 dark:text-white/40">
              Showing {filteredServices.length} of {Object.keys(pricesNgn).length} configured services
            </span>
            <button
              onClick={handleSaveAllSettings}
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            >
              {isSaving ? <Spinner size={18} className="animate-spin" /> : <CheckCircle size={18} weight="bold" />}
              Save All Prices
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. LONG-TERM RENTAL PROFIT MARGIN & PRICING FLOOR CARD */}
      {/* ======================================================== */}
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

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center justify-between">
              Rental Profit Margin (%)
              <span className="text-[10px] text-purple-500 font-extrabold">Auto-Applied</span>
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
            <span className="text-[11px] text-slate-500 dark:text-white/40">Guaranteed profit margin on long-term rental duration.</span>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. PROMO VOUCHERS CREATION & LEDGER */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <Ticket size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Promo Vouchers & Gift Cards</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">Generate targeted redemption vouchers to fund user balances for marketing campaigns.</p>
            </div>
          </div>
        </div>

        {voucherMessage && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold ${
            voucherMessage.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {voucherMessage.type === "success" ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
            <span>{voucherMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleCreateVoucherAdmin} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Voucher Code</label>
            <input
              type="text"
              placeholder="e.g. WELCOME50"
              value={voucherCodeInput}
              onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white uppercase outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Value ($ USD)</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
              <span className="text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.50"
                placeholder="2.00"
                value={voucherAmountUsd}
                onChange={(e) => setVoucherAmountUsd(e.target.value)}
                className="w-full bg-transparent outline-none font-mono font-bold text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">Target Audience</label>
            <select
              value={voucherTargetAudience}
              onChange={(e) => setVoucherTargetAudience(e.target.value as any)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-sans font-bold text-xs text-slate-900 dark:text-white outline-none"
            >
              <option value="all">Everyone (Public)</option>
              <option value="new_users">New Users Only</option>
              <option value="existing_users">Existing Users Only</option>
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
                    const audience = v.target_audience || "all";

                    return (
                      <tr key={v.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
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

                        <td className="py-3.5 px-3 font-mono font-bold text-xs text-brand-blue">
                          ${(v.amount_usd || 0).toFixed(2)} USD
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70 border-slate-200 dark:border-white/10">
                            {audience === 'all' ? 'Everyone' : audience === 'new_users' ? 'New Users' : 'Existing Users'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-white/60">
                          {usedCount} / {maxUses} uses
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isExpired 
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : isDepleted 
                                ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          }`}>
                            {isExpired ? "Expired" : isDepleted ? "Depleted" : "Active"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            disabled={deletingVoucherId === v.id}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Voucher"
                          >
                            {deletingVoucherId === v.id ? <Spinner size={14} className="animate-spin" /> : <Trash size={14} />}
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

    </div>
  );
}
