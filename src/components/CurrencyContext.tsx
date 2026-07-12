"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type CurrencyType = "NGN" | "USD";

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  isLoading: boolean;
  onboardingCompleted: boolean | null;
  completeOnboarding: (currency: CurrencyType) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("NGN");
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCurrency = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_currency, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        if (data.preferred_currency) {
          setCurrencyState(data.preferred_currency as CurrencyType);
        }
        setOnboardingCompleted(!!data.onboarding_completed);
      }
      setIsLoading(false);
    };

    fetchCurrency();
  }, []);

  const setCurrency = async (newCurrency: CurrencyType) => {
    // Optimistic update
    setCurrencyState(newCurrency);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_currency: newCurrency })
        .eq("id", user.id);
    }
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
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading, onboardingCompleted, completeOnboarding }}>
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
