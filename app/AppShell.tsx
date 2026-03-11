"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import TabNavigation from "@/components/layout/TabNavigation";
import MobileNav from "@/components/layout/MobileNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLoginPage = pathname === "/login" || pathname === "/terms" || pathname === "/privacy";
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev && status === "unauthenticated" && !isLoginPage) {
      router.push("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isDev && status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isDev && status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <TabNavigation />
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
