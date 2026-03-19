"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { getVisibleTabs } from "./TabNavigation";
import type { DashboardRole } from "@/config/viewConfig";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as DashboardRole | undefined;
  const tabs = getVisibleTabs(role);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl md:hidden">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              ID
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Intel Dash
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
