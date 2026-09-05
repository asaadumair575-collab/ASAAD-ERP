import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getBusinessProfile } from "@/lib/businessProfile";
import { getSessionUser } from "@/lib/auth";
import { parsePermissions } from "@/lib/permissions";
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
  themeColor: "#16202E",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/login";
  // The dispatch sheet opens in its own tab as a printable report — showing
  // the full app shell (sidebar, header) around it there just looks odd, so
  // it renders standalone like the login page does.
  const isStandalonePage = isLoginPage || pathname === "/ecommerce/dispatch/sheet";
  const [profile, me] = isStandalonePage
    ? [null, null]
    : await Promise.all([getBusinessProfile(), getSessionUser()]);

  const unreadCount = me
    ? await prisma.message.count({ where: { receiverId: me.id, readAt: null } }).catch(() => 0)
    : 0;

  // Non-admin employees must clock in before doing anything else — otherwise
  // it's easy to forget, and there'd be no record of when the day started.
  // /work itself (and its own API route) stays reachable so they can clock
  // in; everything else redirects there until they do.
  if (!isStandalonePage && me && !me.isAdmin && pathname !== "/work" && !pathname.startsWith("/api/")) {
    const todayPK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    const dayStart = new Date(`${todayPK}T00:00:00+05:00`);
    const dayEnd = new Date(`${todayPK}T23:59:59+05:00`);
    const shift = await prisma.employeeShift.findFirst({
      where: { userId: me.id, startedAt: { gte: dayStart, lte: dayEnd } },
      select: { id: true },
    });
    if (!shift) redirect("/work");
  }

  if (isStandalonePage) {
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
          username={me?.isAdmin ? "Admin" : (me?.displayName ?? me?.username ?? null)}
          permissions={parsePermissions(me?.permissions)}
          unreadCount={unreadCount}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
