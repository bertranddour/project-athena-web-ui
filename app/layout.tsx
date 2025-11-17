import type { Metadata } from "next";
import "./globals.css";
import { Nunito_Sans } from "next/font/google";
import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { cn } from "@/lib/utils";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/stack/client";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  preload: true,
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wave Artisans Console",
  description: "An Athena Engine console restyled with the Wave Artisans UI kit.",
  metadataBase: new URL("https://agentchat.vercel.app"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
  openGraph: {
    title: "Wave Artisans Console",
    description:
      "Chat with Athena Engine agents inside a SoftUI-inspired console built with Tailwind 4.",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wave Artisans Console",
    description:
      "A neumorphic control room for Athena-powered assistants.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("bg-zinc-200 text-zinc-800", nunito.className)}>
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <NuqsAdapter>{children}</NuqsAdapter>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
