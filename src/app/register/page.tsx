"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  WarningCircle,
  GoogleLogo,
  ShieldCheck,
  Eye,
  EyeSlash,
  Lock,
  At,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import zxcvbn from "zxcvbn";
import { Turnstile } from "@marsidev/react-turnstile";
import { AuthSidebar } from "@/components/auth/AuthSidebar";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  const passwordStrength = password ? zxcvbn(password).score : 0;

  // Password requirement checks
  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  }, [password, passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 1)
      return { bar: "bg-red-500", text: "text-red-400" };
    if (passwordStrength === 2)
      return { bar: "bg-yellow-500", text: "text-yellow-400" };
    if (passwordStrength === 3)
      return { bar: "bg-emerald-400", text: "text-emerald-400" };
    return { bar: "bg-emerald-400", text: "text-emerald-400" };
  }, [passwordStrength]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordStrength < 3) {
      setError("Password is too weak. Please use a stronger password.");
      return;
    }
    // Turnstile requirement (only if site key is actually configured by the user)
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (
      siteKey &&
      siteKey !== "your_turnstile_site_key_here" &&
      !turnstileToken
    ) {
      setError("Please complete the security check.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("Password should contain at least one character of each")) {
        setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      // Trigger WhatsApp Admin Alert (fire and forget)
      fetch("/api/admin-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `🚀 *New User Alert*\n\nA new user just joined!\nEmail: ${email}`,
        }),
      }).catch((err) => console.error("Failed to trigger admin alert:", err));

      setSuccess(true);
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <main className="w-full min-h-[100dvh] flex flex-col justify-center items-center bg-[#050505] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full bg-brand-blue/10 blur-[150px] mix-blend-screen opacity-50" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-[440px] z-10"
        >
          <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-10 flex flex-col gap-6 items-center text-center">
            <div className="w-14 h-14 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-1">
              <div className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_15px_rgba(0,112,243,0.8)] animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Check your email
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-[320px]">
              We&apos;ve sent a secure activation link to your inbox. Please
              click the link to verify your identity and access the ledger.
            </p>
            <Link
              href="/login"
              className="mt-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
            >
              Return to Login
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative w-full min-h-[100dvh] flex flex-col lg:flex-row bg-[#050505] text-white overflow-hidden font-sans">
      {/* Left Panel — branded sidebar (hidden on mobile) */}
      <AuthSidebar
        tagline="Join Thousands Already Using"
        headline="Everything you need"
        headlineAccent="in one place."
        subtitle="Manage virtual cards, airtime, data and SMS verification with confidence."
      />

      {/* Right Panel — registration form */}
      <section className="w-full lg:w-[48%] flex flex-col min-h-[100dvh] relative z-10">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[50vw] h-[50vw] rounded-full bg-brand-blue/5 blur-[150px]" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-500/5 blur-[120px]" />
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
                Free Account
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-[2rem] font-bold tracking-tight text-white leading-tight">
              Get started today.
            </h2>
            <p className="text-[15px] text-white/40 mt-2 mb-8">
              Complete the form below to create your account.
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

            <form
              onSubmit={handleRegister}
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                  Password <span className="text-brand-blue">*</span>
                </label>
                <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                  <Lock
                    size={18}
                    weight="bold"
                    className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
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

                {/* Strength bar + label */}
                <AnimatePresence>
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 mt-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[11px] text-white/30 font-medium">
                          Strength
                        </span>
                        <span
                          className={`text-[11px] font-bold ${strengthColor.text}`}
                        >
                          {strengthLabel}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${((passwordStrength + 1) / 5) * 100}%`,
                          }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className={`h-full rounded-full ${strengthColor.bar}`}
                        />
                      </div>

                      {/* Requirement checklist grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
                        {[
                          { key: "length", label: "8+ characters" },
                          { key: "uppercase", label: "Uppercase" },
                          { key: "lowercase", label: "Lowercase" },
                          { key: "number", label: "Number" },
                          { key: "special", label: "Special char" },
                        ].map(({ key, label }) => {
                          const met =
                            passwordChecks[
                              key as keyof typeof passwordChecks
                            ];
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-1.5"
                            >
                              {met ? (
                                <CheckCircle
                                  size={13}
                                  weight="fill"
                                  className="text-emerald-400 flex-shrink-0"
                                />
                              ) : (
                                <XCircle
                                  size={13}
                                  weight="bold"
                                  className="text-white/20 flex-shrink-0"
                                />
                              )}
                              <span
                                className={`text-[11px] ${met ? "text-white/60" : "text-white/25"} transition-colors`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40">
                  Confirm Password <span className="text-brand-blue">*</span>
                </label>
                <div className="group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-all duration-300">
                  <Lock
                    size={18}
                    weight="bold"
                    className="text-white/25 group-focus-within:text-brand-blue transition-colors flex-shrink-0"
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-[15px] font-light"
                  />
                  {confirmPassword ? (
                    password === confirmPassword ? (
                      <ShieldCheck
                        size={18}
                        weight="fill"
                        className="text-emerald-400 flex-shrink-0"
                      />
                    ) : (
                      <WarningCircle
                        size={18}
                        weight="fill"
                        className="text-red-400 flex-shrink-0"
                      />
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
                    >
                      {showConfirmPassword ? (
                        <EyeSlash size={18} weight="bold" />
                      ) : (
                        <Eye size={18} weight="bold" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Bot Protection */}
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
                process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !==
                  "your_turnstile_site_key_here" && (
                  <div className="flex justify-center mt-1">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      options={{ theme: "dark" }}
                    />
                  </div>
                )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex items-center justify-between rounded-full bg-brand-blue px-2 py-2 mt-3 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_30px_rgba(0,112,243,0.3)]"
              >
                <span className="pl-5 text-sm font-semibold tracking-wide text-white">
                  {loading ? "Creating account..." : "Create Account"}
                </span>
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <ShieldCheck
                    className="text-white text-lg"
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
              Sign up with Google
            </button>

            {/* Footer link */}
            <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
              <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/25">
                Have an account?
              </span>
              <div className="mt-2">
                <Link
                  href="/login"
                  className="text-sm text-brand-blue font-semibold hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  Sign in
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
