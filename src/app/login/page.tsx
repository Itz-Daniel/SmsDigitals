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
  ShieldCheck,
} from "@phosphor-icons/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthSidebar } from "@/components/auth/AuthSidebar";
import { Turnstile } from "@marsidev/react-turnstile";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<"password" | "magic_link">("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const supabase = createClient();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

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
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the security check.");
      return;
    }
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
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the security check.");
      return;
    }
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
      {/* Left Panel — branded sidebar */}
      <AuthSidebar
        tagline="Digital Finance Platform"
        headline="Your digital wallet,"
        headlineAccent="elevated."
        subtitle="Virtual cards, instant airtime & data, SMS verification — everything in one fast, secure platform."
      />

      {/* Right Panel — auth form */}
      <section className="w-full lg:w-[48%] flex flex-col min-h-[100dvh] relative z-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[50vw] h-[50vw] rounded-full bg-brand-blue/5 blur-[150px]" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)]">
            <span className="font-bold text-white text-sm">S</span>
          </div>
          <span className="font-bold text-base tracking-tight text-white">SmsDigitals</span>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 max-w-lg mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8"
          >
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-semibold w-fit mb-2">
                <ShieldCheck size={14} weight="fill" />
                <span>Protected Access</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Welcome back
              </h1>
              <p className="text-sm text-white/50 font-light">
                Sign in to manage your virtual numbers and marketplace services.
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium"
                >
                  <WarningCircle className="text-lg flex-shrink-0" weight="fill" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Magic Link Sent Notice */}
            {magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                  <EnvelopeSimple size={28} weight="duotone" />
                </div>
                <h3 className="text-lg font-bold text-white">Check your email</h3>
                <p className="text-sm text-white/60 font-light max-w-xs">
                  We sent a magic sign-in link to <span className="font-semibold text-white">{email}</span>. Click the link to log in instantly.
                </p>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="text-xs text-brand-blue hover:underline mt-2 font-medium"
                >
                  Back to login
                </button>
              </motion.div>
            ) : (
              <form onSubmit={loginMode === "password" ? handleLogin : handleMagicLink} className="flex flex-col gap-5">
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                    Email Address
                  </label>
                  <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                    <At size={18} weight="bold" className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0" />
                    <input
                      id="email"
                      name="email"
                      autoComplete="email"
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
                      initial={{ opacity: 1, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-1.5 overflow-hidden"
                    >
                      <label htmlFor="password" className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                        Password
                      </label>
                      <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                        <Lock size={18} weight="bold" className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0" />
                        <input
                          id="password"
                          name="password"
                          autoComplete="current-password"
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
                          {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions row */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setLoginMode(loginMode === "password" ? "magic_link" : "password")}
                    className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
                  >
                    {loginMode === "password" ? (
                      <><MagicWand size={13} className="text-brand-blue" /> Use Magic Link</>
                    ) : (
                      <><Fingerprint size={13} className="text-brand-blue" /> Use Password</>
                    )}
                  </button>

                  {loginMode === "password" && (
                    <Link href="/forgot" className="text-[12px] text-brand-blue hover:text-white transition-colors font-medium">
                      Forgot password?
                    </Link>
                  )}
                </div>

                {/* Cloudflare Turnstile CAPTCHA Widget */}
                <div className="flex justify-center mt-2">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: "dark" }}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex items-center justify-between rounded-full bg-brand-blue px-2 py-2 mt-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,112,243,0.3)]"
                >
                  <span className="pl-5 text-sm font-semibold tracking-wide text-white">
                    {loading ? "Signing in..." : loginMode === "password" ? "Sign In" : "Send Magic Link"}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                    <ArrowRight className="text-white text-lg group-hover:translate-x-0.5 transition-transform" weight="bold" />
                  </div>
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 my-2">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/25">Or</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={() => handleOAuthLogin("google")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/15 transition-all duration-300 text-sm font-medium text-white/70 hover:text-white"
            >
              <GoogleLogo size={18} weight="bold" />
              Sign in with Google
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-xs text-white/40 font-light">
              Don't have an account?{" "}
              <Link href="/register" className="text-brand-blue font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
