"use client";

import OpsKPIs from "@/components/dashboard/OpsKPIs";
import { useRefresh } from "@/app/RefreshContext";

export default function OpsKPIsPage() {
  const { refreshTrigger } = useRefresh();
  return <OpsKPIs refreshTrigger={refreshTrigger} isActive={true} />;
}
