"use client";

import { useState, Suspense } from "react";
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
  ClockCountdown
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthSidebar } from "@/components/auth/AuthSidebar";
import { Turnstile } from "@marsidev/react-turnstile";

function LoginContent() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason");

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
      // Set initial activity timestamp cookie on client for immediate hydration
      document.cookie = `sms_last_active=${Date.now()}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="w-full max-w-sm">
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

        {/* Inactivity & Security Status Banners */}
        {reason === "inactivity_timeout" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium leading-relaxed"
          >
            <ClockCountdown className="text-xl flex-shrink-0 text-amber-400" weight="fill" />
            <span>You were signed out due to inactivity for your account security. Please sign in to resume.</span>
          </motion.div>
        )}

        {reason === "all_devices_signed_out" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium leading-relaxed"
          >
            <ShieldCheck className="text-xl flex-shrink-0 text-emerald-400" weight="fill" />
            <span>All active sessions across other devices were revoked successfully.</span>
          </motion.div>
        )}

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
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 text-sm font-light focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                />
                <At className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-lg" />
              </div>
            </div>

            {/* Password (if password mode) */}
            {loginMode === "password" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                    Password
                  </label>
                  <Link href="/forgot" className="text-[11px] text-white/40 hover:text-brand-blue transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 text-sm font-light focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-lg" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Turnstile Bot Protection */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center my-1">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  options={{ theme: "dark" }}
                />
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex items-center justify-between text-xs text-white/40 pt-1">
              <button
                type="button"
                onClick={() => setLoginMode(loginMode === "password" ? "magic_link" : "password")}
                className="flex items-center gap-1.5 text-white/50 hover:text-brand-blue transition-colors"
              >
                {loginMode === "password" ? (
                  <>
                    <MagicWand size={14} />
                    <span>Sign in with Magic Link</span>
                  </>
                ) : (
                  <>
                    <Fingerprint size={14} />
                    <span>Sign in with Password</span>
                  </>
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-between p-1.5 group shadow-lg shadow-brand-blue/20"
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
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand-blue font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative w-full min-h-[100dvh] flex flex-col lg:flex-row bg-[#050505] text-white overflow-hidden font-sans">
      {/* Left Panel — branded sidebar */}
      <AuthSidebar
        tagline="Digital Finance Platform"
        headline="Your digital wallet,"
        headlineAccent="elevated."
        subtitle="Virtual cards, instant airtime & data, SMS verification — everything in one fast, secure platform."
      />

      {/* Right Panel — login form */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <Suspense fallback={<div className="text-white/40 text-sm">Loading...</div>}>
          <LoginContent />
        </Suspense>
      </section>
    </main>
  );
}
