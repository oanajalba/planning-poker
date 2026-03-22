import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_VERSION } from "@/lib/version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planning Poker & Board",
  description: "Extremely fast, zero-friction planning poker and board.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        <footer style={{ 
          textAlign: "center", 
          padding: "1rem", 
          fontSize: "0.8rem", 
          opacity: 0.6,
          marginTop: "auto"
        }}>
          v{APP_VERSION}
        </footer>
      </body>
    </html>
  );
}
