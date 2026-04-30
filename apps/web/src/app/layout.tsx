import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata: Metadata = {
  title: "AR Buildwel — Luxury Real Estate Portfolio",
  description:
    "A modern luxury real estate advisory experience for curated acquisitions, private listings, and high-value portfolio execution.",
  openGraph: {
    title: "AR Buildwel — Modern Luxury Living",
    description: "Editorial-grade real estate portfolio landing for premium buyers and investors.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>
          {children}
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
