"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@phosphor-icons/react";

interface CancelOrderButtonProps {
  rentalId: string;
  createdAt: string;
  onCancelSuccess: () => void;
}

export function CancelOrderButton({ rentalId, createdAt, onCancelSuccess }: CancelOrderButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - createdTime) / 1000);
      const remaining = 150 - elapsed;
      setSecondsLeft(remaining > 0 ? remaining : 0);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const handleCancel = async () => {
    if (secondsLeft > 0 || isCancelling) return;

    setIsCancelling(true);
    try {
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rental_id: rentalId })
      });

      if (res.ok) {
        onCancelSuccess();
      } else {
        console.error("Failed to cancel");
        setIsCancelling(false);
      }
    } catch (err) {
      console.error(err);
      setIsCancelling(false);
    }
  };

  if (secondsLeft > 0) {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const formattedTime = `${m}:${s < 10 ? '0' : ''}${s}`;

    return (
      <button 
        disabled
        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-white/5 text-white/40 border border-white/5 cursor-not-allowed"
      >
        Cancel in {formattedTime}
      </button>
    );
  }

  return (
    <button 
      onClick={handleCancel}
      disabled={isCancelling}
      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-2"
    >
      {isCancelling ? <Spinner className="w-3 h-3 animate-spin" /> : null}
      {isCancelling ? "Cancelling..." : "Cancel Order"}
    </button>
  );
}
