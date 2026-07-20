import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import AppShell from "@/components/AppShell";
import { getBusinessProfile } from "@/lib/businessProfile";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions } from "@/lib/permissions";
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
      <body className="h-dvh overflow-hidden text-black">
        <AppShell
          businessName={profile?.name ?? "Trader CRM"}
          isAdmin={me?.isAdmin ?? false}
          username={me?.displayName ?? me?.username ?? null}
          permissions={parsePermissions(me?.permissions)}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
