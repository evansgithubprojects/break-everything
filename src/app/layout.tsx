import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AbstractBg from "@/components/layout/AbstractBg";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Break Everything — Free Tools for Students",
  description:
    "A curated, open-source tool directory for students — build-ready listings with source links and clear details.",
  icons: {
    icon: [{ url: "/logo-mark.png", type: "image/png" }],
    apple: "/logo-mark.png",
  },
  openGraph: {
    title: "Break Everything — Free Tools for Students",
    description:
      "A curated, open-source tool directory for students — build-ready listings with source links and clear details.",
    images: [{ url: "/logo-lockup.png", alt: "Break Everything" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/logo-lockup.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AbstractBg />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
