"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

export default function AppShell({
  children,
  businessName,
  isAdmin,
  username,
  unreadMessages = 0,
}: {
  children: React.ReactNode;
  businessName: string;
  isAdmin: boolean;
  username: string | null;
  unreadMessages?: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        businessName={businessName}
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        unreadMessages={unreadMessages}
      />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader
          onMenuClick={() => setMobileOpen(true)}
          username={username}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
