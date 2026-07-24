"use client";

import { useState, useEffect } from "react";
import { Flask, Crown } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function useSandboxMode() {
  const [isSandbox, setIsSandbox] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminFlag = user.user_metadata?.role === 'admin' || 
                          user.app_metadata?.role === 'admin' ||
                          user.email?.toLowerCase().includes('admin');
        setIsAdmin(!!adminFlag);
      }
    };

    checkAdmin();

    const stored = localStorage.getItem("sms_sandbox_mode");
    if (stored === "true") {
      setIsSandbox(true);
    }
  }, []);

  const toggleSandbox = (val: boolean) => {
    setIsSandbox(val);
    localStorage.setItem("sms_sandbox_mode", val ? "true" : "false");
  };

  // Regular users can NEVER use sandbox mode (force false)
  return { isSandbox: isAdmin ? isSandbox : false, toggleSandbox, isAdmin };
}

export function SandboxToggle() {
  const { isSandbox, toggleSandbox, isAdmin } = useSandboxMode();

  // STRICT SECURITY RULE: Completely hidden from standard non-admin customers!
  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 px-3.5 py-1.5 rounded-2xl">
      <Flask size={18} className="text-purple-500 animate-bounce" weight="fill" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-600 dark:text-purple-300 flex items-center gap-1">
          <Crown size={12} weight="fill" className="text-amber-500" /> Admin Sandbox
        </span>
        <span className="text-[11px] font-bold text-slate-700 dark:text-white/80">
          {isSandbox ? "Free Test Mode ON" : "Real Live Mode"}
        </span>
      </div>

      <button
        onClick={() => toggleSandbox(!isSandbox)}
        className={`ml-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          isSandbox ? "bg-purple-600" : "bg-slate-300 dark:bg-white/20"
        }`}
        title="Admin Only: Toggle Sandbox Mode for Free Testing"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isSandbox ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
