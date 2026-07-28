"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import ReportBugButton from "@/components/ReportBugButton";
import type { UserPermissions } from "@/lib/permissions";

export default function AppShell({
  children,
  businessName,
  isAdmin,
  username,
  permissions,
}: {
  children: React.ReactNode;
  businessName: string;
  isAdmin: boolean;
  username: string | null;
  permissions?: UserPermissions;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        businessName={businessName}
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        permissions={permissions}
      />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader
          onMenuClick={() => setMobileOpen(true)}
          username={username}
        />
        <main className="flex-1 overflow-y-auto overscroll-none bg-gray-50 [-webkit-overflow-scrolling:touch]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
      <ReportBugButton />
    </div>
  );
}
