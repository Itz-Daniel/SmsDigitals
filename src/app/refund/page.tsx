"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-white py-16 px-6 font-sans selection:bg-brand-blue/30 selection:text-brand-blue">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#111111] p-10 md:p-16 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-blue transition-colors mb-12">
          <ArrowLeft weight="bold" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Refund Policy</h1>
        <p className="text-slate-500 dark:text-white/40 mb-12">Last Updated: June 2026</p>

        <div className="space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Wallet Deposits</h2>
            <p>All deposits made into your SmsDigitals wallet (via Paystack, Crypto, or other methods) are final and non-refundable to your original payment method. Wallet balances can only be used to purchase services within the SmsDigitals platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Virtual Number Purchases</h2>
            <p>If you purchase a temporary virtual number for SMS verification and do not receive the SMS code within the designated timeout period (usually 5 to 20 minutes), the system will automatically cancel the order and fully refund the purchase amount back to your SmsDigitals wallet balance.</p>
            <p className="mt-4">If the SMS code is successfully received and displayed to you, the transaction is considered complete, and no refund will be issued, even if the third-party service rejects the account creation.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Virtual Cards</h2>
            <p>Creation fees for virtual USD cards are non-refundable once the card is generated. Any unused funds loaded onto a virtual card can be withdrawn back to your SmsDigitals wallet balance, subject to standard withdrawal or processing fees.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Dispute Resolution</h2>
            <p>If you believe a transaction was processed in error or your account was compromised, please contact our support team immediately at <a href="mailto:dannyhell96@gmail.com" className="text-brand-blue font-semibold hover:underline">dannyhell96@gmail.com</a>. Disputes must be raised within 7 days of the transaction.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
