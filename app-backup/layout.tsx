import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/auth-wrapper";
import { Toaster } from "react-hot-toast"; // NEW: For global toasts

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enki - Waterproofing PM Tool",
  description: "AI-powered app for waterproofing subcontractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthWrapper>
          {children}
        </AuthWrapper>
        <Toaster position="top-center" /> {/* NEW: Global toast container */}
      </body>
    </html>
  );
}