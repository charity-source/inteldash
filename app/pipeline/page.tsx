"use client";

import PipelineData from "@/components/dashboard/PipelineData";
import { useRefresh } from "@/app/RefreshContext";

export default function PipelinePage() {
  const { refreshTrigger } = useRefresh();
  return <PipelineData refreshTrigger={refreshTrigger} isActive={true} />;
}
