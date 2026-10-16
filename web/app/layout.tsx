import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SafetyGate } from "../components/safety-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "INSTEAD — Practical alternatives for everyday life",
  description:
    "Explore recipes and practical alternatives for everyday life.",
  openGraph: {
    title: "INSTEAD",
    description: "A better way to do everyday things.",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "INSTEAD",
    description: "A better way to do everyday things.",
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SafetyGate>{children}</SafetyGate>
      </body>
    </html>
  );
}
