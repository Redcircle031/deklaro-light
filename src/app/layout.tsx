import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deklaro | AI Invoice Management",
  description:
    "Deklaro accelerates Polish SME accounting workflows with AI-powered OCR, KSeF submissions, and tenant-aware automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[rgb(var(--background))] text-[rgb(var(--foreground))] antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
