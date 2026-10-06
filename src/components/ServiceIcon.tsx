"use client";

import React from "react";

interface ServiceIconProps {
  name?: string;
  id?: string;
  size?: number;
  className?: string;
}

export function ServiceIcon({ name = "", id = "", size = 20, className = "" }: ServiceIconProps) {
  const normalized = (name || id || "").toLowerCase().trim();

  // Helper for responsive square dimensions
  const dim = { width: size, height: size };

  // 1. WhatsApp
  if (normalized.includes("whatsapp")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#25D366] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.15C10.57 20.15 9.12 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 14.98 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.08C19.42 7.64 20.28 9.7 20.28 11.91C20.28 16.46 16.58 20.15 12.05 20.15ZM16.57 14.33C16.32 14.21 15.1 13.61 14.88 13.52C14.65 13.44 14.49 13.4 14.32 13.64C14.16 13.89 13.69 14.44 13.54 14.61C13.4 14.78 13.25 14.8 13 14.68C12.75 14.55 11.95 14.29 11 13.45C10.26 12.79 9.76 11.98 9.61 11.73C9.47 11.49 9.6 11.35 9.72 11.23C9.83 11.12 9.97 10.94 10.09 10.8C10.21 10.66 10.26 10.55 10.34 10.39C10.42 10.23 10.38 10.08 10.32 9.96C10.26 9.84 9.77 8.63 9.56 8.13C9.36 7.64 9.16 7.71 9.01 7.7C8.87 7.69 8.71 7.69 8.54 7.69C8.38 7.69 8.11 7.75 7.89 7.99C7.66 8.24 7.02 8.84 7.02 10.06C7.02 11.28 7.91 12.45 8.03 12.62C8.16 12.78 9.77 15.28 12.24 16.34C12.83 16.59 13.28 16.74 13.64 16.86C14.23 17.05 14.77 17.02 15.2 16.96C15.68 16.89 16.67 16.36 16.88 15.77C17.08 15.18 17.08 14.68 17.02 14.58C16.96 14.47 16.81 14.45 16.57 14.33Z" />
        </svg>
      </span>
    );
  }

  // 2. Telegram
  if (normalized.includes("telegram")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#229ED9] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </span>
    );
  }

  // 3. TikTok
  if (normalized.includes("tiktok")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-black text-white border border-white/10 shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.41a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3 15.69a6.34 6.34 0 0 0 10.82 4.48 6.27 6.27 0 0 0 1.86-4.5V8.8a8.28 8.28 0 0 0 5.25 1.85v-3.5a4.86 4.86 0 0 1-1.34-.46z" />
        </svg>
      </span>
    );
  }

  // 4. Instagram
  if (normalized.includes("instagram")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    );
  }

  // 5. Facebook
  if (normalized.includes("facebook")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#1877F2] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </span>
    );
  }

  // 6. Twitter / X
  if (normalized.includes("twitter") || normalized === "x") {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-black text-white border border-white/10 shadow-xs ${className}`}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </span>
    );
  }

  // 7. Google / Gmail / YouTube
  if (normalized.includes("google") || normalized.includes("gmail") || normalized.includes("youtube")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-white dark:bg-white/10 border border-black/10 dark:border-white/15 shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </span>
    );
  }

  // 8. OpenAI / ChatGPT
  if (normalized.includes("openai") || normalized.includes("chatgpt")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#10A37F] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      </span>
    );
  }

  // 9. Claude (Anthropic)
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#CC785C] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.2 9.4L21.6 11.6L14.2 13.8L12 21.2L9.8 13.8L2.4 11.6L9.8 9.4L12 2Z" />
        </svg>
      </span>
    );
  }

  // 10. Discord
  if (normalized.includes("discord")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#5865F2] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </span>
    );
  }

  // 11. Snapchat
  if (normalized.includes("snapchat")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#FFFC00] text-black shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.295 2c-3.13 0-5.33 2.37-5.33 5.56 0 .84.18 1.92.51 2.87-.85.34-1.85.83-1.85 1.77 0 .82.68 1.48 1.63 1.66-.08.43-.16.92-.16 1.48 0 1.79 1.4 3.03 3.33 3.32-.44.47-.94.94-1.63 1.13-.5.14-.94.13-1.38.35-.43.21-.49.57-.27.87.27.37.89.47 1.46.47.78 0 1.57-.2 2.29-.44.59-.2 1.16-.38 1.76-.38.58 0 1.15.18 1.74.38.72.24 1.51.44 2.29.44.57 0 1.19-.1 1.46-.47.22-.3.16-.66-.27-.87-.44-.22-.88-.21-1.38-.35-.69-.19-1.19-.66-1.63-1.13 1.93-.29 3.33-1.53 3.33-3.32 0-.56-.08-1.05-.16-1.48.95-.18 1.63-.84 1.63-1.66 0-.94-1-.143-1.85-1.77.33-.95.51-2.03.51-2.87 0-3.19-2.2-5.56-5.33-5.56z" />
        </svg>
      </span>
    );
  }

  // 12. PayPal
  if (normalized.includes("paypal")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#003087] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.79.79 0 0 1 .778-.667h6.914c3.486 0 5.86 1.528 5.485 5.09-.434 4.126-3.109 6.27-6.52 6.27H8.814a.79.79 0 0 0-.78.667l-.958 6.257zm4.33-11.238h-2.12l-1.06 6.924h1.77a3.89 3.89 0 0 0 3.968-3.693c.277-2.316-1.04-3.231-2.558-3.231z" />
        </svg>
      </span>
    );
  }

  // 13. CashApp
  if (normalized.includes("cashapp") || normalized.includes("cash app")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#00D632] text-white shadow-xs font-black ${className}`}
      >
        <span style={{ fontSize: size * 0.65 }}>$</span>
      </span>
    );
  }

  // 14. Tinder
  if (normalized.includes("tinder")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-tr from-[#FF655B] to-[#FF5864] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.96 1.25C11.63 2.1 11.39 3 11.39 3.92C11.39 6.2 12.87 8.04 14.7 8.93C15.65 9.4 16.35 10.3 16.5 11.37C16.8 13.3 15.34 15.08 13.37 15.24C11.16 15.42 9.24 13.62 9.24 11.4C9.24 10.28 9.68 9.26 10.4 8.5C9.42 8.7 8.5 9.25 7.82 10.05C6.46 11.66 6.07 13.96 6.84 15.93C7.94 18.73 10.84 20.65 13.88 20.35C17.27 20.02 19.98 17.06 19.94 13.65C19.9 10.5 18.15 7.6 15.5 6C14.78 4.28 13.6 2.66 11.96 1.25Z" />
        </svg>
      </span>
    );
  }

  // 15. Bumble
  if (normalized.includes("bumble")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#FFC629] text-slate-900 shadow-xs font-black ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3.5 7V17L12 22L20.5 17V7L12 2ZM8 10H16V11.5H8V10ZM8 13.5H16V15H8V13.5Z" />
        </svg>
      </span>
    );
  }

  // 16. Apple
  if (normalized.includes("apple") || normalized.includes("icloud")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.06.66-2.7 1.42-.57.66-1.06 1.73-.93 2.77 1.08.08 2.01-.57 2.62-1.32z" />
        </svg>
      </span>
    );
  }

  // 17. Netflix
  if (normalized.includes("netflix")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-black text-[#E50914] shadow-xs font-black ${className}`}
      >
        <span style={{ fontSize: size * 0.7, fontWeight: 900 }}>N</span>
      </span>
    );
  }

  // 18. Spotify
  if (normalized.includes("spotify")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#1ED760] text-black shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.793-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.745 3.808-.87 7.076-.496 9.722 1.112.294.18.386.563.207.857zm1.225-2.724c-.226.367-.707.482-1.074.256-2.69-1.654-6.79-2.134-9.97-1.168-.413.125-.85-.11-.975-.523-.125-.413.11-.85.523-.975 3.633-1.103 8.147-.568 11.24 1.336.367.226.482.707.256 1.074zm.106-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.496.15-1.022-.134-1.172-.63-.15-.496.134-1.022.63-1.172 3.535-1.073 9.404-.87 13.116 1.334.446.265.592.844.327 1.29-.265.447-.844.593-1.29.328z" />
        </svg>
      </span>
    );
  }

  // 19. Steam
  if (normalized.includes("steam")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#171A21] text-white border border-white/10 shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.979 0C5.666 0 .502 4.908.033 11.134l5.957 2.458a3.52 3.52 0 0 1 2.378-.925c.21 0 .416.02.617.058l3.01-4.358v-.058a4.423 4.423 0 0 1 4.423-4.423 4.423 4.423 0 0 1 4.423 4.423 4.423 4.423 0 0 1-4.423 4.423h-.103l-4.303 3.064a3.537 3.537 0 0 1-5.719 2.766L.484 15.65C2.072 20.44 6.626 24 12 24c6.627 0 12-5.373 12-12S18.627 0 11.979 0z" />
        </svg>
      </span>
    );
  }

  // 20. Amazon
  if (normalized.includes("amazon")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-slate-900 text-[#FF9900] shadow-xs font-black ${className}`}
      >
        <span style={{ fontSize: size * 0.6, fontWeight: 900 }}>a</span>
      </span>
    );
  }

  // 21. Uber
  if (normalized.includes("uber")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-black text-white border border-white/10 shadow-xs font-bold text-[9px] ${className}`}
      >
        U
      </span>
    );
  }

  // 22. Bolt
  if (normalized.includes("bolt")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#34D186] text-white shadow-xs font-black ${className}`}
      >
        ⚡
      </span>
    );
  }

  // 23. Airbnb
  if (normalized.includes("airbnb")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#FF5A5F] text-white shadow-xs font-black ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.5 2 6 5.5 6 9.5C6 14.5 12 22 12 22C12 22 18 14.5 18 9.5C18 5.5 15.5 2 12 2ZM12 12C10.6 12 9.5 10.9 9.5 9.5C9.5 8.1 10.6 7 12 7C13.4 7 14.5 8.1 14.5 9.5C14.5 10.9 13.4 12 12 12Z" />
        </svg>
      </span>
    );
  }

  // 24. LinkedIn
  if (normalized.includes("linkedin")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#0A66C2] text-white shadow-xs font-bold ${className}`}
      >
        <span style={{ fontSize: size * 0.55, fontWeight: 800 }}>in</span>
      </span>
    );
  }

  // 25. Reddit
  if (normalized.includes("reddit")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#FF4500] text-white shadow-xs ${className}`}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z" />
        </svg>
      </span>
    );
  }

  // 26. Signal
  if (normalized.includes("signal")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-[#3A76F0] text-white shadow-xs font-black ${className}`}
      >
        <span style={{ fontSize: size * 0.6 }}>💬</span>
      </span>
    );
  }

  // 27. Microsoft / Outlook
  if (normalized.includes("microsoft") || normalized.includes("outlook")) {
    return (
      <span
        style={dim}
        className={`inline-flex items-center justify-center shrink-0 rounded-full bg-white dark:bg-white/10 border border-black/10 dark:border-white/15 shadow-xs ${className}`}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
          <rect x="2" y="2" width="9" height="9" fill="#F25022" />
          <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
          <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
          <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
        </svg>
      </span>
    );
  }

  // 28. Universal Clean Fallback: Gradient Pill with Initial Letter
  const initial = (name || id || "?").charAt(0).toUpperCase();
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600"
  ];
  const colorIndex = (name || id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const gradient = colors[colorIndex];

  return (
    <span
      style={dim}
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br ${gradient} text-white font-extrabold shadow-xs select-none ${className}`}
    >
      <span style={{ fontSize: Math.max(9, size * 0.5) }}>{initial}</span>
    </span>
  );
}
