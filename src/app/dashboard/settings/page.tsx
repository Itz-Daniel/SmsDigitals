"use client";

import { useEffect, useState } from "react";
import { User, LockKey, Spinner, CheckCircle, WarningCircle, Gear } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import clsx from "clsx";

export default function SettingsPage() {
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

  const supabase = createClient();

  useEffect(() => {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
          <p className="text-slate-500 dark:text-white/40 text-sm max-w-md">Manage your personal information, security preferences, and platform configuration.</p>
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
                Profile Information
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
                Security & Password
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
                  className="flex flex-col gap-8 relative z-10"
                >
                  <div className="flex flex-col gap-2 pb-8 border-b border-black/5 dark:border-white/10">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                    <p className="text-sm text-slate-500 dark:text-white/40">Ensure your account is using a long, random password to stay secure.</p>
                  </div>

                  <form onSubmit={handleSecuritySave} className="flex flex-col gap-6">
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

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={securitySaving || !password || !confirmPassword}
                        className="flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-white/90 transition-transform active:scale-95 duration-200 disabled:opacity-50"
                      >
                        {securitySaving ? <Spinner className="animate-spin text-lg" /> : "Update Password"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
