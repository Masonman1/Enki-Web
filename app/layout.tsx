import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // CORRECTED: Use 'Geist' and 'Geist_Mono' from next/font/google (per workspace file; fixes "Unknown font" error)
import "./globals.css";
import AuthWrapper from "@/components/auth-wrapper";
import { Toaster } from "sonner"; // NEW: Import Sonner Toaster

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
        <Toaster position="top-center" expand={true} richColors duration={4000} /> {/* NEW: Sonner Toaster with Phase 1 options (expand for details, longer duration) */}
      </body>
    </html>
  );
}