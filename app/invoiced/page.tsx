"use client";

import InvoicedGrossMargin from "@/components/dashboard/InvoicedGrossMargin";
import { useRefresh } from "@/app/RefreshContext";

export default function InvoicedPage() {
  const { refreshTrigger } = useRefresh();
  return <InvoicedGrossMargin refreshTrigger={refreshTrigger} isActive={true} />;
}
