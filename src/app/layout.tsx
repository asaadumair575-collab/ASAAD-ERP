import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Trader CRM",
  description: "Client and order tracking for traders",
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
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-gray-900 text-white">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              Trader CRM
            </Link>
            <Link href="/" className="text-sm text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/clients" className="text-sm text-gray-300 hover:text-white">
              Clients
            </Link>
            <Link
              href="/clients/new"
              className="text-sm text-gray-300 hover:text-white ml-auto"
            >
              + Add Client
            </Link>
          </nav>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
