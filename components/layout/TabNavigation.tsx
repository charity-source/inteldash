"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  Briefcase,
  Wrench,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTabsForRole, type DashboardRole } from "@/config/viewConfig";

interface Tab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  "/finance": DollarSign,
  "/pipeline": TrendingUp,
  "/invoiced": FileText,
  "/accounts": CreditCard,
  "/new-works": Briefcase,
  "/technician": Wrench,
  "/assets": Truck,
};

// All tabs — used as fallback in dev mode
const allTabs: Tab[] = [
  { label: "Finance Dashboard", href: "/finance", icon: DollarSign },
  { label: "Pipeline Data", href: "/pipeline", icon: TrendingUp },
  { label: "Invoiced + Gross Margin", href: "/invoiced", icon: FileText },
  { label: "Accounts Pay/Rec", href: "/accounts", icon: CreditCard },
  { label: "New Works Volume", href: "/new-works", icon: Briefcase },
  { label: "Technician Recovery", href: "/technician", icon: Wrench },
  { label: "Asset Data", href: "/assets", icon: Truck },
];

function getVisibleTabs(role?: DashboardRole): Tab[] {
  if (!role) return allTabs; // dev fallback
  const roleTabs = getTabsForRole(role);
  return roleTabs.map((t) => ({
    label: t.label,
    href: t.href,
    icon: TAB_ICONS[t.href] || Briefcase,
  }));
}

export default function TabNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as DashboardRole | undefined;
  const tabs = getVisibleTabs(role);

  return (
    <nav className="hidden border-b border-gray-200 bg-white md:block">
      <div className="flex overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export { allTabs as tabs, getVisibleTabs };
