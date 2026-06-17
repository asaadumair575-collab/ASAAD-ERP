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
      <body className="min-h-full flex bg-white text-black">
        <aside className="w-56 shrink-0 bg-black text-white min-h-screen flex flex-col">
          <div className="px-6 py-6 border-b border-white/10">
            <span className="text-lg font-semibold tracking-tight">
              Trader CRM
            </span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/clients">Clients</NavLink>
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <Link
              href="/clients/new"
              className="flex items-center justify-center gap-2 bg-white text-black text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              + Add Client
            </Link>
          </div>
        </aside>
        <main className="flex-1 min-h-screen">
          <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
        </main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
