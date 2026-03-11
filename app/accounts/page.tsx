"use client";

import AccountsPayRec from "@/components/dashboard/AccountsPayRec";
import { useRefresh } from "@/app/RefreshContext";

export default function AccountsPage() {
  const { refreshTrigger } = useRefresh();
  return <AccountsPayRec refreshTrigger={refreshTrigger} isActive={true} />;
}
