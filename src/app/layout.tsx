import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingSupport } from "@/components/FloatingSupport";

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
    title: "SmsDigitals | Premium Virtual Numbers",
    description: "Receive SMS verifications instantly. Real SIM numbers from 44+ countries.",
    url: "https://smsdigitals.com",
    siteName: "SmsDigitals",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmsDigitals | Premium Virtual Numbers",
    description: "Receive SMS verifications instantly. Real SIM numbers from 44+ countries.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL("https://smsdigitals.com"),
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
          {children}
          <FloatingSupport />
        </ThemeProvider>
      </body>
    </html>
  );
}
