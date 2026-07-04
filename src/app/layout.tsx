import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { getBusinessProfile } from "@/lib/businessProfile";
import { getSessionUser } from "@/lib/auth";
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
  title: "ASAAD ERP",
  description: "Customer and order tracking for traders",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASAAD ERP",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/login";
  const [profile, me] = isLoginPage
    ? [null, null]
    : await Promise.all([getBusinessProfile(), getSessionUser()]);

  if (isLoginPage) {
    return (
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full bg-white text-black">{children}</body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row bg-gray-50 text-black">
        <Sidebar businessName={profile?.name ?? "Trader CRM"} isAdmin={me?.isAdmin ?? false} />
        <main className="flex-1 min-h-screen min-w-0 print:min-h-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
