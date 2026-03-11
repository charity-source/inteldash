"use client";

import NewWorksVolume from "@/components/dashboard/NewWorksVolume";
import { useRefresh } from "@/app/RefreshContext";

export default function NewWorksPage() {
  const { refreshTrigger } = useRefresh();
  return <NewWorksVolume refreshTrigger={refreshTrigger} isActive={true} />;
}
