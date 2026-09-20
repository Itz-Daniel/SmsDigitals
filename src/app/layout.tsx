import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ReferralTracker } from "@/components/ReferralTracker";
import { ClientWidgets } from "@/components/ClientWidgets";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmsDigitals | Premium Virtual Numbers & SMS Verification",
  description: "Receive SMS verifications instantly. Get virtual phone numbers from 44+ countries routed through real SIM networks for WhatsApp, Telegram, Google, and more.",
  keywords: ["virtual numbers", "sms verification", "temporary phone number", "receive sms online", "SmsDigitals", "non-voip numbers"],
  openGraph: {
    title: "SmsDigitals | Premium Virtual Numbers & SMS Verification",
    description: "Receive SMS verifications instantly. Get virtual phone numbers from 44+ countries routed through real SIM networks for WhatsApp, Telegram, Google, and more.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.smsdigital.fun",
    siteName: "SmsDigitals",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://www.smsdigital.fun/og-image.png",
        width: 1200,
        height: 630,
        alt: "SmsDigitals - Instant Virtual Phone Numbers & SMS Verification",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmsDigitals | Premium Virtual Numbers & SMS Verification",
    description: "Receive SMS verifications instantly. Real SIM numbers from 44+ countries for WhatsApp, Telegram, Google, and more.",
    images: ["https://www.smsdigital.fun/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg?v=2",
    apple: "/icon.svg?v=2",
  },
  verification: {
    google: "googleb63dca589aca6fe2",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.smsdigital.fun"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-brand-blue/30 selection:text-white min-h-[100dvh] flex flex-col bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          {children}
          <ClientWidgets />
        </ThemeProvider>
      </body>
    </html>
  );
}
