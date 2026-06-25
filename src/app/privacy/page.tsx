"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-white py-16 px-6 font-sans selection:bg-brand-blue/30 selection:text-brand-blue">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#111111] p-10 md:p-16 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-blue transition-colors mb-12">
          <ArrowLeft weight="bold" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Privacy Policy</h1>
        <p className="text-slate-500 dark:text-white/40 mb-12">Last Updated: June 2026</p>

        <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, fund your wallet, or contact support. This includes your email address, billing information, and transaction history. We do not store full credit card numbers on our servers; these are processed securely by our payment partners (e.g., Paystack).</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide, maintain, and improve our services.</li>
              <li>Process transactions and send related information.</li>
              <li>Send technical notices, updates, and support messages.</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Data Retention</h2>
            <p>We store SMS verification codes only for the duration necessary to display them to you. Historical verification logs are kept for diagnostic and anti-fraud purposes. User accounts and wallet balances are retained until account deletion is requested.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Sharing of Information</h2>
            <p>We do not sell your personal information. We may share your information with trusted third-party service providers (such as telecommunication partners) solely for the purpose of providing our services to you.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact our support team at <a href="mailto:dannyhell96@gmail.com" className="text-brand-blue font-semibold hover:underline">dannyhell96@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
