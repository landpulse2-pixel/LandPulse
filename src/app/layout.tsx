import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LandPulse - Own Virtual Land, Earn Passively on Solana",
  description: "A Web3 play-to-earn game where you can buy virtual parcels, build buildings, generate passive income, and participate in community events.",
  keywords: ["LandPulse", "Web3", "Solana", "Play-to-Earn", "Virtual Land", "NFT", "Blockchain Gaming"],
  authors: [{ name: "LandPulse Team" }],
  icons: {
    icon: "/landpulse-logo.png",
  },
  openGraph: {
    title: "LandPulse - Own Virtual Land, Earn Passively",
    description: "A Web3 play-to-earn game on Solana",
    url: "https://landpulse.io",
    siteName: "LandPulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LandPulse",
    description: "Own virtual land. Earn passively. Build on Solana.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
