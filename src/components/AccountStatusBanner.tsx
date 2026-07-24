"use client";

import { Warning, LockKey, Headset } from "@phosphor-icons/react";
import Link from "next/link";

interface AccountStatusBannerProps {
  status: string;
  reason?: string | null;
}

export function AccountStatusBanner({ status, reason }: AccountStatusBannerProps) {
  if (status !== "banned" && status !== "flagged") return null;

  const isBanned = status === "banned";

  return (
    <div className={`w-full p-4 mb-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in ${
      isBanned 
        ? "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400"
        : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${isBanned ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"}`}>
          {isBanned ? <LockKey size={24} weight="fill" /> : <Warning size={24} weight="fill" />}
        </div>

        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
            {isBanned ? "🚫 Account Permanently Banned / Disabled" : "⚠️ Account Soft-Frozen for Security Review"}
          </h4>
          <p className="text-xs opacity-90 leading-relaxed font-medium">
            {reason || (isBanned 
              ? "Your account has been suspended due to terms of service violation." 
              : "Your account is temporarily flagged for security verification.")}
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/support"
        className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-md ${
          isBanned 
            ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20" 
            : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20"
        }`}
      >
        <Headset size={16} weight="bold" /> Contact Support
      </Link>
    </div>
  );
}
