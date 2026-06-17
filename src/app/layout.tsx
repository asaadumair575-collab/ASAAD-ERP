import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await prisma.businessProfile.findFirst();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-white text-black">
        <Sidebar businessName={profile?.name ?? "Trader CRM"} />
        <main className="flex-1 min-h-screen">
          <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
        </main>
      </body>
    </html>
  );
}
