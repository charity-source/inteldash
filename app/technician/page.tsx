"use client";

import TechnicianRecovery from "@/components/dashboard/TechnicianRecovery";
import { useRefresh } from "@/app/RefreshContext";

export default function TechnicianPage() {
  const { refreshTrigger } = useRefresh();
  return <TechnicianRecovery refreshTrigger={refreshTrigger} isActive={true} />;
}
