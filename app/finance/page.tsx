"use client";

import FinanceDashboard from "@/components/dashboard/FinanceDashboard";
import { useRefresh } from "@/app/RefreshContext";

export default function FinancePage() {
  const { refreshTrigger } = useRefresh();
  return <FinanceDashboard refreshTrigger={refreshTrigger} isActive={true} />;
}
