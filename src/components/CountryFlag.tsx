"use client";

import React from "react";

interface CountryFlagProps {
  country?: string;
  countryCode?: string;
  size?: number;
  className?: string;
}

export function CountryFlag({
  country = "",
  countryCode = "",
  size = 20,
  className = ""
}: CountryFlagProps) {
  const code = (countryCode || country || "").toLowerCase().trim();
  const dim = { width: size, height: size };

  // 1. USA (United States)
  if (code === "usa" || code === "us" || code.includes("united states") || code.includes("america")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="United States"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <g fill="#B22234">
            <rect width="64" height="64" fill="#FFFFFF" />
            <rect y="0" width="64" height="4.92" />
            <rect y="9.84" width="64" height="4.92" />
            <rect y="19.68" width="64" height="4.92" />
            <rect y="29.52" width="64" height="4.92" />
            <rect y="39.36" width="64" height="4.92" />
            <rect y="49.2" width="64" height="4.92" />
            <rect y="59.04" width="64" height="4.96" />
          </g>
          {/* Blue Canton */}
          <rect width="32" height="34.46" fill="#3C3B6E" />
          {/* Canton Stars Pattern */}
          <g fill="#FFFFFF">
            <circle cx="6" cy="6" r="1.8" />
            <circle cx="16" cy="6" r="1.8" />
            <circle cx="26" cy="6" r="1.8" />
            <circle cx="11" cy="12" r="1.8" />
            <circle cx="21" cy="12" r="1.8" />
            <circle cx="6" cy="18" r="1.8" />
            <circle cx="16" cy="18" r="1.8" />
            <circle cx="26" cy="18" r="1.8" />
            <circle cx="11" cy="24" r="1.8" />
            <circle cx="21" cy="24" r="1.8" />
            <circle cx="6" cy="29" r="1.8" />
            <circle cx="16" cy="29" r="1.8" />
            <circle cx="26" cy="29" r="1.8" />
          </g>
        </svg>
      </span>
    );
  }

  // 2. Canada
  if (code === "canada" || code === "ca") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Canada"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          {/* White Center Field */}
          <rect width="64" height="64" fill="#FFFFFF" />
          {/* Red Side Bands */}
          <rect width="16" height="64" fill="#FF0000" />
          <rect x="48" width="16" height="64" fill="#FF0000" />
          {/* Stylized 11-Point Canadian Maple Leaf */}
          <path
            fill="#FF0000"
            d="M32 14L34.1 23.4L39.8 21.6L37.5 27.5L44.5 28.5L40.2 34.2L42.5 39.8L35.8 38.2L34.2 46.5H29.8L28.2 38.2L21.5 39.8L23.8 34.2L19.5 28.5L26.5 27.5L24.2 21.6L29.9 23.4L32 14Z"
          />
          <path fill="#FF0000" d="M30.7 44H33.3V52H30.7Z" />
        </svg>
      </span>
    );
  }

  // 3. United Kingdom / England
  if (code === "uk" || code === "england" || code === "gb" || code.includes("united kingdom")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="United Kingdom"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="64" fill="#012169" />
          {/* White Diagonals */}
          <path d="M0 0L64 64M64 0L0 64" stroke="#FFFFFF" strokeWidth="9" />
          {/* Red Diagonals */}
          <path d="M0 0L64 64M64 0L0 64" stroke="#C8102E" strokeWidth="4.5" />
          {/* White Cross */}
          <path d="M32 0V64M0 32H64" stroke="#FFFFFF" strokeWidth="15" />
          {/* Red Cross */}
          <path d="M32 0V64M0 32H64" stroke="#C8102E" strokeWidth="9" />
        </svg>
      </span>
    );
  }

  // 4. Nigeria
  if (code === "nigeria" || code === "ng") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Nigeria"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="21.3" height="64" fill="#008751" />
          <rect x="21.3" width="21.4" height="64" fill="#FFFFFF" />
          <rect x="42.7" width="21.3" height="64" fill="#008751" />
        </svg>
      </span>
    );
  }

  // 5. Germany
  if (code === "germany" || code === "de") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Germany"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="21.3" fill="#000000" />
          <rect y="21.3" width="64" height="21.4" fill="#DD0000" />
          <rect y="42.7" width="64" height="21.3" fill="#FFCE00" />
        </svg>
      </span>
    );
  }

  // 6. France
  if (code === "france" || code === "fr") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="France"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width={21.3} height={64} fill="#002654" />
          <rect x={21.3} width={21.4} height={64} fill="#FFFFFF" />
          <rect x={42.7} width={21.3} height={64} fill="#CE1126" />
        </svg>
      </span>
    );
  }

  // 7. Brazil
  if (code === "brazil" || code === "br") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Brazil"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="64" fill="#009B3A" />
          <polygon points="32,8 58,32 32,56 6,32" fill="#FEDF00" />
          <circle cx="32" cy="32" r="14" fill="#002776" />
        </svg>
      </span>
    );
  }

  // 8. Indonesia
  if (code === "indonesia" || code === "id") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Indonesia"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="32" fill="#CE1126" />
          <rect y="32" width="64" height="32" fill="#FFFFFF" />
        </svg>
      </span>
    );
  }

  // 9. Spain
  if (code === "spain" || code === "es") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Spain"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="16" fill="#AA151B" />
          <rect y="16" width="64" height="32" fill="#F1BF00" />
          <rect y="48" width="64" height="16" fill="#AA151B" />
        </svg>
      </span>
    );
  }

  // 10. Italy
  if (code === "italy" || code === "it") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Italy"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width={21.3} height={64} fill="#009246" />
          <rect x={21.3} width={21.4} height={64} fill="#FFFFFF" />
          <rect x={42.7} width={21.3} height={64} fill="#CE2B37" />
        </svg>
      </span>
    );
  }

  // 11. Netherlands
  if (code === "netherlands" || code === "nl") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Netherlands"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="21.3" fill="#AE1C28" />
          <rect y="21.3" width="64" height="21.4" fill="#FFFFFF" />
          <rect y="42.7" width="64" height="21.3" fill="#21468B" />
        </svg>
      </span>
    );
  }

  // 12. India
  if (code === "india" || code === "in") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="India"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="21.3" fill="#FF9933" />
          <rect y="21.3" width="64" height="21.4" fill="#FFFFFF" />
          <rect y="42.7" width="64" height="21.3" fill="#138808" />
          <circle cx="32" cy="32" r="6" fill="none" stroke="#000080" strokeWidth="1.5" />
        </svg>
      </span>
    );
  }

  // 13. Japan
  if (code === "japan" || code === "jp") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-xs ${className}`}
        title="Japan"
      >
        <svg viewBox="0 0 64 64" width={size} height={size} className="w-full h-full object-cover">
          <rect width="64" height="64" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="18" fill="#BC002D" />
        </svg>
      </span>
    );
  }

  // 14. Global / Worldwide / All Countries
  if (code.includes("global") || code.includes("all") || code.includes("world")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs ${className}`}
        title="Worldwide"
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>
    );
  }

  // 15. General Country Fallback: Two-letter uppercase badge
  const displayCode = code.slice(0, 2).toUpperCase() || "🌐";
  return (
    <span
      style={dim}
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/15 text-[10px] font-mono font-bold shadow-xs select-none ${className}`}
      title={country || countryCode}
    >
      {displayCode}
    </span>
  );
}
