"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, WarningCircle, CheckCircle, Spinner, CaretDown } from "@phosphor-icons/react";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewTicketModal({ isOpen, onClose, onSuccess }: NewTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSubject("");
        setMessage("");
        setPriority("Normal");
        onSuccess();
      } else {
        setError(data.error || "Failed to submit ticket.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-[70] w-full max-w-lg bg-white dark:bg-[#0A0A0A] rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Open a Ticket
                  </h2>
                  <button 
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors"
                  >
                    <X weight="bold" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Subject
                    </label>
                    <input 
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of the issue"
                      className="w-full bg-slate-50 dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-slate-900 dark:border-white/50 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Priority
                    </label>
                    <div className="flex gap-2 bg-slate-50 dark:bg-[#111] border border-black/5 dark:border-white/10 p-1 rounded-xl">
                      {["Low", "Normal", "High", "Urgent"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg ${priority === p ? (p === 'Urgent' ? 'bg-red-500 text-white shadow-md' : p === 'High' ? 'bg-orange-500 text-white shadow-md' : p === 'Normal' ? 'bg-brand-blue text-white shadow-md' : 'bg-purple-500 text-white shadow-md') : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Message
                    </label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      className="w-full h-32 resize-none bg-slate-50 dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-slate-900 dark:border-white/50 outline-none transition-colors custom-scrollbar"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                      <WarningCircle weight="bold" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 mt-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]"
                  >
                    {isSubmitting ? <Spinner className="animate-spin" size={18} /> : "Submit Ticket"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
