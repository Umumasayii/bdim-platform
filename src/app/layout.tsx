import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LearnerProvider } from "@/lib/learner/provider";
import { themeInitScript } from "@/lib/theme";
import { siteUrl } from "@/lib/config";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-code", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Data science, statistics & AI training`,
    template: `%s · ${site.name}`,
  },
  description:
    "Practical training in data analytics, statistics, programming, AI and business intelligence — courses, free practice, a browser-based coding lab and consulting from Big Data IQ Minds in Kigali, Rwanda.",
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_GB",
    title: `${site.name} — ${site.tagline}`,
    description: "Learn data analytics, statistics, programming, AI and business intelligence through practical training.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#052553",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved light/dark theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <LearnerProvider>{children}</LearnerProvider>
        {/* Vercel Web Analytics + Speed Insights (they read the URL, so they sit in Suspense). */}
        <Suspense fallback={null}>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
