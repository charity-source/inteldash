"use client";

import { DashboardComponentProps } from "@/types";
import { CreditCard } from "lucide-react";

export default function AccountsPayRec({
  refreshTrigger,
  isActive,
}: DashboardComponentProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
          <CreditCard className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Accounts Payable / Receivable
        </h2>
        <p className="text-sm text-gray-500">Component coming soon</p>
        <p className="mt-4 text-xs text-gray-400">
          Refresh count: {refreshTrigger} | Active: {isActive ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
}
