"use client";

import { useEffect, useState } from "react";
import { User, LockKey, Spinner, CheckCircle, WarningCircle, Gear, Eye, EyeSlash, ClockCountdown, ShieldCheck, SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyContext";
import { motion } from "motion/react";
import clsx from "clsx";

export default function SettingsPage() {
  const { currency, setCurrency, showBalance, toggleShowBalance } = useCurrency();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [loading, setLoading] = useState(true);
  
  // Profile State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Security State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ type: "success" | "error", text: string } | null>(null);
  
  // Session Security
  const [sessionTimeoutDays, setSessionTimeoutDays] = useState<number>(7);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Load session timeout preference from localStorage or cookie
    if (typeof window !== "undefined") {
      const storedTimeout = localStorage.getItem("sms_session_timeout_days");
      if (storedTimeout) {
        setSessionTimeoutDays(parseInt(storedTimeout));
      }
    }

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (data && data.full_name) {
        setFullName(data.full_name);
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleTimeoutChange = (days: number) => {
    setSessionTimeoutDays(days);
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_session_timeout_days", days.toString());
      document.cookie = `sms_session_timeout_days=${days}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setSecurityMsg({ type: "success", text: `Inactivity timeout updated to ${days === 1 ? "24 hours" : `${days} days`}.` });
    setTimeout(() => setSecurityMsg(null), 3000);
  };

  const handleSignOutAll = async () => {
    if (!confirm("Are you sure you want to sign out of all active devices and sessions?")) return;
    setIsSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      document.cookie = "sms_last_active=; path=/; max-age=0";
      window.location.href = "/login?reason=all_devices_signed_out";
    } catch (err: any) {
      setSecurityMsg({ type: "error", text: err.message || "Failed to sign out all devices." });
      setIsSigningOutAll(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySaving(true);
    setSecurityMsg(null);

    if (password !== confirmPassword) {
      setSecurityMsg({ type: "error", text: "Passwords do not match." });
      setSecuritySaving(false);
      return;
    }

    if (password.length < 6) {
      setSecurityMsg({ type: "error", text: "Password must be at least 6 characters." });
      setSecuritySaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSecurityMsg({ type: "success", text: "Password changed successfully!" });
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecurityMsg(null), 3000);
    } catch (err: any) {
      setSecurityMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setSecuritySaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "U";
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 relative overflow-hidden transition-colors duration-500">
      
      {/* Ambient glows */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-brand-blue/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto flex flex-col gap-10 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-3">
          <div className="w-fit rounded-full px-3 py-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-2 mb-2 shadow-sm dark:shadow-none">
            <Gear className="text-slate-500 dark:text-white/60" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-600 dark:text-white/60">Account Settings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/40">
            Settings.
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-sm max-w-md">Manage your personal information, privacy preferences, and security sessions.</p>
        </div>

        {loading ? (
          <div className="w-full h-[40vh] flex items-center justify-center">
            <Spinner className="animate-spin text-3xl text-white/20" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
              <button 
                onClick={() => setActiveTab("profile")}
                className={clsx(
                  "flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-semibold transition-all duration-300 text-left",
                  activeTab === "profile" 
                    ? "bg-white text-slate-900 dark:bg-white/10 dark:text-white border border-black/5 dark:border-white/10 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/80 border border-transparent shadow-none dark:shadow-none"
                )}
              >
                <User weight={activeTab === "profile" ? "fill" : "regular"} className="text-lg" />
                Profile & Preferences
              </button>
              
              <button 
                onClick={() => setActiveTab("security")}
                className={clsx(
                  "flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-semibold transition-all duration-300 text-left",
                  activeTab === "security" 
                    ? "bg-white text-slate-900 dark:bg-white/10 dark:text-white border border-black/5 dark:border-white/10 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/80 border border-transparent shadow-none dark:shadow-none"
                )}
              >
                <LockKey weight={activeTab === "security" ? "fill" : "regular"} className="text-lg" />
                Security & Sessions
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 dark:bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>

              {activeTab === "profile" && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-8 relative z-10"
                >
                  <div className="flex items-center gap-6 pb-8 border-b border-black/5 dark:border-white/10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-blue to-[#10B981] flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-white dark:border-[#0A0A0A]">
                      {getInitials(fullName)}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{fullName || "User"}</h3>
                      <p className="text-sm text-slate-500 dark:text-white/40">Personal Account</p>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSave} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        disabled
                        className="w-full bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl py-3 px-4 text-slate-400 dark:text-white/50 text-sm font-medium cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">To change your email address, please contact support.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white dark:bg-[#050505] border border-black/5 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-medium focus:border-brand-blue/50 outline-none transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>

                    {/* Balance Privacy Mode (Synced with Dashboard Eye Icon) */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Balance Privacy Mode</label>
                      <div className="p-4 border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                            {showBalance ? <Eye size={20} /> : <EyeSlash size={20} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {showBalance ? "Balances Visible" : "Balances Masked (••••••)"}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-white/40">
                              Synced live with the Eye toggle on your dashboard.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={toggleShowBalance}
                          className={clsx(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                            !showBalance 
                              ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20" 
                              : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white border-slate-300 dark:border-white/10"
                          )}
                        >
                          {!showBalance ? "Masked" : "Visible"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Display Currency</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className={clsx("flex-1 p-4 border rounded-xl cursor-pointer flex items-center justify-between transition-all", currency === 'NGN' ? "bg-brand-blue/5 border-brand-blue" : "border-black/10 dark:border-white/10 opacity-70")}>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 dark:text-white">₦ Naira (NGN)</span>
                          </div>
                          <input type="radio" name="currency" className="hidden" checked={currency === 'NGN'} onChange={() => setCurrency('NGN')} />
                        </label>
                        <label className={clsx("flex-1 p-4 border rounded-xl cursor-pointer flex items-center justify-between transition-all", currency === 'USD' ? "bg-brand-blue/5 border-brand-blue" : "border-black/10 dark:border-white/10 opacity-70")}>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 dark:text-white">$ USD</span>
                          </div>
                          <input type="radio" name="currency" className="hidden" checked={currency === 'USD'} onChange={() => setCurrency('USD')} />
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">Changes instantly apply across the entire dashboard.</p>
                    </div>

                    {profileMsg && (
                      <div className={clsx("p-4 rounded-xl flex items-center gap-3 text-sm font-medium", profileMsg.type === "success" ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                        {profileMsg.type === "success" ? <CheckCircle weight="fill" className="text-lg" /> : <WarningCircle weight="fill" className="text-lg" />}
                        {profileMsg.text}
                      </div>
                    )}

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={profileSaving}
                        className="flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-white/90 transition-transform active:scale-95 duration-200 disabled:opacity-50"
                      >
                        {profileSaving ? <Spinner className="animate-spin text-lg" /> : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-10 relative z-10"
                >
                  {/* Password Section */}
                  <div className="flex flex-col gap-6 pb-8 border-b border-black/5 dark:border-white/10">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                      <p className="text-sm text-slate-500 dark:text-white/40">Ensure your account uses a strong password to protect your wallet and SMS data.</p>
                    </div>

                    <form onSubmit={handleSecuritySave} className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">New Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white dark:bg-[#050505] border border-black/5 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-medium focus:border-brand-blue/50 outline-none transition-colors shadow-sm dark:shadow-none"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Confirm New Password</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white dark:bg-[#050505] border border-black/5 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-medium focus:border-brand-blue/50 outline-none transition-colors shadow-sm dark:shadow-none"
                        />
                      </div>

                      {securityMsg && (
                        <div className={clsx("p-4 rounded-xl flex items-center gap-3 text-sm font-medium", securityMsg.type === "success" ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                          {securityMsg.type === "success" ? <CheckCircle weight="fill" className="text-lg" /> : <WarningCircle weight="fill" className="text-lg" />}
                          {securityMsg.text}
                        </div>
                      )}

                      <div className="pt-2">
                        <button 
                          type="submit"
                          disabled={securitySaving || !password || !confirmPassword}
                          className="flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-white/90 transition-transform active:scale-95 duration-200 disabled:opacity-50"
                        >
                          {securitySaving ? <Spinner className="animate-spin text-lg" /> : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Session Inactivity Timeout Section */}
                  <div className="flex flex-col gap-5 pb-8 border-b border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                        <ClockCountdown size={22} weight="duotone" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Session Inactivity Security</h3>
                        <p className="text-xs text-slate-500 dark:text-white/40">Automatically log out inactive sessions to prevent unauthorized device access.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "24 Hours", days: 1 },
                        { label: "7 Days (Recommended)", days: 7 },
                        { label: "14 Days", days: 14 },
                        { label: "30 Days", days: 30 },
                      ].map((item) => (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => handleTimeoutChange(item.days)}
                          className={clsx(
                            "p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1",
                            sessionTimeoutDays === item.days
                              ? "bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm"
                              : "border-black/10 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                        >
                          <span>{item.label}</span>
                          {sessionTimeoutDays === item.days && (
                            <span className="text-[10px] text-brand-blue font-semibold">Active</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remote Device Revocation */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                        <ShieldCheck size={22} weight="duotone" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Device Management</h3>
                        <p className="text-xs text-slate-500 dark:text-white/40">Revoke all active tokens and sessions on all other phones, tablets, and computers.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOutAll}
                      disabled={isSigningOutAll}
                      className="w-fit flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-xs font-bold transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {isSigningOutAll ? (
                        <>
                          <Spinner className="animate-spin text-sm" />
                          <span>Revoking all sessions...</span>
                        </>
                      ) : (
                        <>
                          <SignOut size={16} weight="bold" />
                          <span>Sign Out All Other Devices</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
