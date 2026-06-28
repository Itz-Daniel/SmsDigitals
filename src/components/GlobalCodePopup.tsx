"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface CodeAlert {
  id: string; // rental id
  service: string;
  code: string;
}

export function GlobalCodePopup({ userId }: { userId: string }) {
  const [supabase] = useState(() => createClient());
  const [waitingRentals, setWaitingRentals] = useState<Set<string>>(new Set());
  const waitingRentalsRef = useRef<Set<string>>(new Set());
  const [codeQueue, setCodeQueue] = useState<CodeAlert[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Function to add a code to the queue
  const enqueueCode = (rentalId: string, service: string, code: string) => {
    if (shownIdsRef.current.has(rentalId)) return;
    shownIdsRef.current.add(rentalId);
    setCodeQueue((prev) => [...prev, { id: rentalId, service, code }]);
  };

  // Sync ref with state
  useEffect(() => {
    waitingRentalsRef.current = waitingRentals;
  }, [waitingRentals]);

  useEffect(() => {
    if (!userId) return;

    // 1. Initial fetch of Waiting rentals
    const fetchWaiting = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'Waiting');
      
      if (data) {
        setWaitingRentals(new Set(data.map(r => r.id)));
      }
    };

    fetchWaiting();

    // 2. Realtime listener to sync Waiting rentals and catch Received codes
    const channel = supabase.channel('realtime-global-popup')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rentals', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        const { eventType, new: newRec } = payload as any;
        
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRec.status === 'Waiting') {
            setWaitingRentals(prev => {
              const next = new Set(prev);
              next.add(newRec.id);
              return next;
            });
          } else {
            setWaitingRentals(prev => {
              const next = new Set(prev);
              next.delete(newRec.id);
              return next;
            });
            
            // If it just became Received, queue the popup
            if (newRec.status === 'Received' && newRec.sms_code) {
              enqueueCode(newRec.id, newRec.service, newRec.sms_code);
            }
          }
        } else if (eventType === 'DELETE') {
          const oldRec = (payload as any).old;
          setWaitingRentals(prev => {
            const next = new Set(prev);
            next.delete(oldRec.id);
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 3. Polling for Waiting rentals
  useEffect(() => {
    const interval = setInterval(() => {
      if (waitingRentalsRef.current.size === 0) return;

      // Convert Set to Array to avoid mutation issues during iteration
      const waitingList = Array.from(waitingRentalsRef.current);
      waitingList.forEach(rentalId => {
        fetch('/api/check-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rental_id: rentalId })
        }).catch(console.error);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle current popup
  const currentAlert = codeQueue[0];

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!currentAlert) return;
    const timer = setTimeout(() => {
      setCodeQueue(prev => prev.slice(1));
    }, 30000);
    return () => clearTimeout(timer);
  }, [currentAlert]);

  const handleClose = () => {
    setCodeQueue(prev => prev.slice(1));
  };

  const handleCopy = async () => {
    if (currentAlert) {
      await navigator.clipboard.writeText(currentAlert.code);
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {currentAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-sm bg-[#0a140f] border border-[#1a3324] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden"
          >
            {/* Subtle top border highlight */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#22c55e] to-transparent"></div>
            
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full border-[3px] border-[#153a25] flex items-center justify-center mt-2">
              <CheckCircle weight="bold" className="text-[#22c55e] w-12 h-12" />
            </div>

            <div className="flex flex-col items-center text-center gap-1">
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-[#22c55e]"></span> Code Received!
              </h2>
              <p className="text-[#849f8d] text-sm">
                Your verification code for <span className="text-white capitalize">{currentAlert.service}</span> is:
              </p>
            </div>

            {/* Code Box */}
            <div className="w-full bg-[#0b1c13] border border-[#1a3a25] rounded-xl p-5 flex items-center justify-center shadow-inner">
              <span className="text-4xl md:text-5xl font-mono font-bold text-[#22c55e] tracking-[0.2em] ml-2">
                {currentAlert.code}
              </span>
            </div>

            {/* Actions */}
            <div className="w-full flex gap-3 mt-2">
              <button
                onClick={handleClose}
                className="flex-1 py-3.5 rounded-xl bg-[#535d64] hover:bg-[#636d74] text-white text-sm font-bold transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCopy}
                className="flex-[1.5] py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#e66000] text-white text-sm font-bold transition-colors shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_25px_rgba(255,107,0,0.5)]"
              >
                Copy Code
              </button>
            </div>
            
            {/* Progress bar for 30s timer */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 30, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#ff6b00] to-[#f9a826]"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
