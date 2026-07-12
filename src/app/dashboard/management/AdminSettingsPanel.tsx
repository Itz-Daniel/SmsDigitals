"use client";

import { useState } from "react";
import { SlidersHorizontal, CheckCircle, WarningCircle, Spinner } from "@phosphor-icons/react";

export default function AdminSettingsPanel({ initialMargin, initialAffiliatePercentage }: { initialMargin: number, initialAffiliatePercentage?: number }) {
  // Convert 0.40 format to 40 for UI
  const [marginInput, setMarginInput] = useState<string>((initialMargin * 100).toString());
  const [affiliateInput, setAffiliateInput] = useState<string>((initialAffiliatePercentage || 5.0).toString());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSave = async () => {
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

      // Convert 50 back to 0.50
      const databaseMargin = parsedMargin / 100;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profit_margin: databaseMargin,
          affiliate_percentage: parsedAffiliate 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings.");
      }

      setMessage({ text: `Settings successfully updated.`, type: "success" });
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

  return (
    <div className="bg-white dark:bg-[#111111] border border-black/5 dark:border-white/5 rounded-[24px] p-6 md:p-8 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
          <SlidersHorizontal size={24} weight="duotone" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Configuration</h2>
          <p className="text-slate-500 dark:text-white/40 text-sm">Adjust pricing margins and affiliate rewards.</p>
        </div>
      </div>

      <div className="max-w-xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-white/80">
            Profit Margin (%)
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
          onClick={handleSave}
          disabled={isSaving || (marginInput === (initialMargin * 100).toString() && affiliateInput === (initialAffiliatePercentage || 5.0).toString())}
          className="bg-brand-blue text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[140px] justify-center shadow-md dark:shadow-none w-full md:w-auto"
        >
          {isSaving ? <Spinner className="animate-spin w-5 h-5" /> : "Deploy Changes"}
        </button>

        {message && (
          <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle size={20} weight="fill" className="shrink-0 mt-0.5" /> : <WarningCircle size={20} weight="fill" className="shrink-0 mt-0.5" />}
            <p className="text-sm font-medium leading-relaxed">{message.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
