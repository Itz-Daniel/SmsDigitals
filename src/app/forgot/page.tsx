"use client";

import { motion } from "motion/react";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="w-full min-h-[100dvh] flex flex-col justify-center items-center bg-[#050505] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full bg-brand-blue/10 blur-[150px] mix-blend-screen opacity-50"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-[440px] z-10"
        >
          <div className="w-full rounded-[2.5rem] bg-white/[0.02] border border-white/[0.08] p-2 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-full rounded-[calc(2.5rem-8px)] bg-[#0A0A0A]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-8 md:p-12 flex flex-col gap-6 items-center text-center">
              <div className="w-16 h-16 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-2">
                <div className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_15px_rgba(0,112,243,0.8)] animate-pulse"></div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                If an account exists for {email}, you will receive password reset instructions shortly.
              </p>
              <Link href="/login" className="mt-4 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors">
                Return to Login
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative w-full min-h-[100dvh] flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* Background Radial Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[60vw] h-[60vw] rounded-full bg-brand-blue/10 blur-[150px] mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>
      </div>

      <section className="flex-1 flex flex-col items-center justify-center p-4 md:p-24 relative z-10 w-full max-w-7xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-[440px] mt-12 md:mt-0"
        >
          {/* Outer Shell (Doppelrand) */}
          <div className="w-full rounded-[2.5rem] bg-white/[0.02] border border-white/[0.08] p-2 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            
            {/* Inner Core */}
            <div className="w-full rounded-[calc(2.5rem-8px)] bg-[#0A0A0A]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-8 md:p-10 flex flex-col gap-8">
              
              <div className="flex flex-col gap-2 items-center text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-white/90">Reset Password</h2>
                <p className="text-sm text-white/40">Enter your email to receive recovery instructions.</p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <WarningCircle className="text-lg flex-shrink-0" weight="fill" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  
                  {/* Input Shells */}
                  <div className="group relative w-full rounded-2xl bg-white/[0.03] border border-white/10 p-1 focus-within:border-brand-blue/50 focus-within:bg-brand-blue/[0.02] transition-colors duration-500">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-transparent px-4 py-3 text-white placeholder-white/30 outline-none text-base font-light"
                    />
                  </div>

                </div>

                {/* Primary CTA with Nested Island Button Physics */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="group relative w-full flex items-center justify-between rounded-full bg-white px-2 py-2 mt-6 active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50"
                >
                  <span className="pl-6 text-sm font-semibold tracking-wide text-black">{loading ? "Processing..." : "Send Reset Link"}</span>
                  
                  {/* Nested Icon Circle */}
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    <ArrowRight className="text-black text-lg group-hover:translate-x-1 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" weight="bold" />
                  </div>
                </button>

              </form>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors duration-300">
                  Back to sign in
                </Link>
              </div>

            </div>
          </div>
        </motion.div>

      </section>
    </main>
  );
}
