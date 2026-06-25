"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Fingerprint,
  WarningCircle,
  GoogleLogo,
  MagicWand,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Lock,
  At,
} from "@phosphor-icons/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthSidebar } from "@/components/auth/AuthSidebar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<"password" | "magic_link">(
    "password"
  );
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <main className="relative w-full min-h-[100dvh] flex flex-col lg:flex-row bg-[#050505] text-white overflow-hidden font-sans">
      {/* Left Panel — branded sidebar (hidden on mobile) */}
      <AuthSidebar
        tagline="Digital Finance Platform"
        headline="Your digital wallet,"
        headlineAccent="elevated."
        subtitle="Virtual cards, instant airtime & data, SMS verification — everything in one fast, secure platform."
      />

      {/* Right Panel — auth form */}
      <section className="w-full lg:w-[48%] flex flex-col min-h-[100dvh] relative z-10">
        {/* Background for the right panel */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[50vw] h-[50vw] rounded-full bg-brand-blue/5 blur-[150px]" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            SmsDigitals
          </span>
        </div>

        {/* Centered form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16 xl:px-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-[420px]"
          >
            {/* Status pill */}
            <div className="flex items-center gap-2 w-fit mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50">
                Secure Login
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-[2rem] font-bold tracking-tight text-white leading-tight">
              Welcome back
            </h2>
            <p className="text-[15px] text-white/40 mt-2 mb-8">
              Sign in to access your dashboard.
            </p>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    marginBottom: 24,
                  }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm overflow-hidden"
                >
                  <WarningCircle
                    className="text-lg flex-shrink-0"
                    weight="fill"
                  />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Magic link success state */}
            {magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-4 py-12 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="w-14 h-14 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-1">
                  <EnvelopeSimple
                    className="text-2xl text-brand-blue"
                    weight="duotone"
                  />
                </div>
                <h3 className="text-xl font-semibold">Check your email</h3>
                <p className="text-sm text-white/50 max-w-[280px]">
                  We sent a magic link to{" "}
                  <span className="text-white font-medium">{email}</span>
                </p>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="text-xs text-brand-blue mt-3 hover:text-white transition-colors"
                >
                  Try another method
                </button>
              </motion.div>
            ) : (
              <>
                <form
                  onSubmit={
                    loginMode === "password" ? handleLogin : handleMagicLink
                  }
                  className="flex flex-col gap-5"
                >
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                      Email Address
                    </label>
                    <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                      <At
                        size={18}
                        weight="bold"
                        className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-[15px] font-light"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <AnimatePresence>
                    {loginMode === "password" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-1.5 overflow-hidden"
                      >
                        <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                          Password
                        </label>
                        <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                          <Lock
                            size={18}
                            weight="bold"
                            className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0"
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            required={loginMode === "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-[15px] font-light"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
                          >
                            {showPassword ? (
                              <EyeSlash size={18} weight="bold" />
                            ) : (
                              <Eye size={18} weight="bold" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setLoginMode(
                          loginMode === "password" ? "magic_link" : "password"
                        )
                      }
                      className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
                    >
                      {loginMode === "password" ? (
                        <>
                          <MagicWand size={13} className="text-brand-blue" />{" "}
                          Use Magic Link
                        </>
                      ) : (
                        <>
                          <Fingerprint size={13} className="text-brand-blue" />{" "}
                          Use Password
                        </>
                      )}
                    </button>

                    {loginMode === "password" && (
                      <Link
                        href="/forgot"
                        className="text-[12px] text-brand-blue hover:text-white transition-colors font-medium"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex items-center justify-between rounded-full bg-brand-blue px-2 py-2 mt-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,112,243,0.3)]"
                  >
                    <span className="pl-5 text-sm font-semibold tracking-wide text-white">
                      {loading
                        ? "Authenticating..."
                        : loginMode === "password"
                          ? "Sign in"
                          : "Send Magic Link"}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                      <ArrowRight
                        className="text-white text-lg group-hover:translate-x-0.5 transition-transform"
                        weight="bold"
                      />
                    </div>
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/25">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Google OAuth */}
                <button
                  onClick={() => handleOAuthLogin("google")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/15 transition-all duration-300 text-sm font-medium text-white/70 hover:text-white"
                >
                  <GoogleLogo size={18} weight="bold" />
                  Continue with Google
                </button>
              </>
            )}

            {/* Footer link */}
            <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
              <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/25">
                New here?
              </span>
              <div className="mt-2">
                <Link
                  href="/register"
                  className="text-sm text-brand-blue font-semibold hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  Create your free account
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </div>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Link
                href="/terms"
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/dashboard/support"
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
              >
                Support
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
