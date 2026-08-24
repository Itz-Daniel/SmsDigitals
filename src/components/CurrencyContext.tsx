"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type CurrencyType = "NGN" | "USD";

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  showBalance: boolean;
  setShowBalance: (show: boolean) => Promise<void>;
  toggleShowBalance: () => Promise<void>;
  isLoading: boolean;
  onboardingCompleted: boolean | null;
  completeOnboarding: (currency: CurrencyType) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("NGN");
  const [showBalance, setShowBalanceState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial LocalStorage check for instant hydration without flash
    if (typeof window !== "undefined") {
      const storedVisibility = localStorage.getItem("sms_show_balance");
      if (storedVisibility !== null) {
        setShowBalanceState(storedVisibility === "true");
      }
    }

    const fetchPreferences = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_currency, onboarding_completed, hide_balance, show_balance")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        if (data.preferred_currency) {
          setCurrencyState(data.preferred_currency as CurrencyType);
        }
        setOnboardingCompleted(!!data.onboarding_completed);

        // Sync account balance visibility preference
        if (typeof data.hide_balance === "boolean") {
          const visible = !data.hide_balance;
          setShowBalanceState(visible);
          localStorage.setItem("sms_show_balance", visible.toString());
        } else if (typeof data.show_balance === "boolean") {
          setShowBalanceState(data.show_balance);
          localStorage.setItem("sms_show_balance", data.show_balance.toString());
        }
      }
      setIsLoading(false);
    };

    fetchPreferences();
  }, []);

  const setCurrency = async (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_currency: newCurrency })
        .eq("id", user.id);
    }
  };

  const setShowBalance = async (show: boolean) => {
    setShowBalanceState(show);
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_show_balance", show.toString());
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ 
            hide_balance: !show,
            show_balance: show 
          })
          .eq("id", user.id);
      } catch (e) {
        console.warn("Could not update profile balance visibility column in DB:", e);
      }
    }
  };

  const toggleShowBalance = async () => {
    await setShowBalance(!showBalance);
  };

  const completeOnboarding = async (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    setOnboardingCompleted(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ 
          preferred_currency: newCurrency,
          onboarding_completed: true 
        })
        .eq("id", user.id);
    }
  };

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        setCurrency, 
        showBalance, 
        setShowBalance, 
        toggleShowBalance,
        isLoading, 
        onboardingCompleted, 
        completeOnboarding 
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
