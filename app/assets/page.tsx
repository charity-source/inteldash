"use client";

import AssetData from "@/components/dashboard/AssetData";
import { useRefresh } from "@/app/RefreshContext";

export default function AssetsPage() {
  const { refreshTrigger } = useRefresh();
  return <AssetData refreshTrigger={refreshTrigger} isActive={true} />;
}
