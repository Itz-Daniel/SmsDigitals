"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-white py-16 px-6 font-sans selection:bg-brand-blue/30 selection:text-brand-blue">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#111111] p-10 md:p-16 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-blue transition-colors mb-12">
          <ArrowLeft weight="bold" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Terms of Service</h1>
        <p className="text-slate-500 dark:text-white/40 mb-12">Last Updated: June 2026</p>

        <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using the SmsDigitals platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you may not access the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Description of Service</h2>
            <p>SmsDigitals provides virtual phone numbers for SMS verification and virtual USD cards for online transactions. Numbers provided are temporary unless specifically marked as long-term rentals. We do not guarantee compatibility with all third-party services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. User Conduct and Legality</h2>
            <p>You agree to use the Service only for lawful purposes. You are strictly prohibited from using our virtual numbers or cards for:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Fraudulent activities, scams, or phishing.</li>
              <li>Harassment, spamming, or abuse.</li>
              <li>Any activity that violates the laws of your jurisdiction or the jurisdiction of the provided number.</li>
            </ul>
            <p className="mt-4">We reserve the right to immediately terminate accounts found violating these rules without refund.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Account and Balances</h2>
            <p>Wallet balances (NGN or USD) are non-transferable between accounts. You are responsible for maintaining the security of your account credentials. SmsDigitals is not liable for unauthorized access resulting from user negligence.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Limitation of Liability</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. SmsDigitals shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
