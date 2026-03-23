"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// -- Types ------------------------------------------------------------------
interface ApiResponse {
  fetchedAt: string;
  invoiced: {
    month: number;
    ytd: number;
    rolling12: number;
  };
  pipeline: {
    totalValue: number;
    jobCount: number;
    byStage: Record<string, { count: number; value: number }>;
  };
}

interface TechSummaryWeek {
  weekEnding: string;
  groupRate: number | null;
}

interface TechApiResponse {
  summary: TechSummaryWeek[];
}

// -- Helpers ----------------------------------------------------------------
function fmtDollar(v: number): string {
  const abs = Math.abs(v);
  const s =
    "$" +
    abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return v < 0 ? "-" + s : s;
}

// -- Icons ------------------------------------------------------------------
function DollarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-blue-600"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 3.5v9M10 5.5c0-1.1-.9-1.5-2-1.5s-2 .4-2 1.5.9 1.5 2 1.5 2 .4 2 1.5-.9 1.5-2 1.5-2-.4-2-1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-emerald-600"
    >
      <path
        d="M2 4h12l-3 4v4l-2 1v-5L6 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// -- KPI Tile ---------------------------------------------------------------
function KPITile({
  label,
  value,
  icon,
  accentColor,
  subtitle,
  error,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
  subtitle?: string;
  error?: boolean;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-4 md:p-5 shadow-sm"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: accentColor + "15" }}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      {error ? (
        <p className="text-sm text-gray-400 italic">No data available</p>
      ) : (
        <>
          <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}

// -- Main Component ---------------------------------------------------------
export default function OpsKPIs({
  refreshTrigger,
  isActive,
}: DashboardComponentProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [techMonthlyAvg, setTechMonthlyAvg] = useState<number | null>(null);
  const [techWeeksInMonth, setTechWeeksInMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [opsRes, techRes] = await Promise.all([
        fetch("/api/simpro/ops-kpis"),
        fetch("/api/technician"),
      ]);

      if (!opsRes.ok) throw new Error(`OpsKPIs HTTP ${opsRes.status}`);
      const opsJson: ApiResponse = await opsRes.json();
      setData(opsJson);
      setLastUpdated(
        new Date(opsJson.fetchedAt).toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      // Calculate monthly average group recovery from technician data
      if (techRes.ok) {
        const techJson: TechApiResponse = await techRes.json();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthWeeks = techJson.summary.filter((w) => {
          const d = new Date(w.weekEnding);
          return d >= monthStart && d <= now && w.groupRate !== null;
        });
        if (monthWeeks.length > 0) {
          const avg =
            monthWeeks.reduce((s, w) => s + (w.groupRate ?? 0), 0) /
            monthWeeks.length;
          setTechMonthlyAvg(avg);
          setTechWeeksInMonth(monthWeeks.length);
        } else {
          setTechMonthlyAvg(null);
          setTechWeeksInMonth(0);
        }
      }

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[OpsKPIs]", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when refresh is triggered
  useEffect(() => {
    if (!isActive) return;
    fetchData();
  }, [isActive, refreshTrigger, fetchData]);

  // 60-second polling
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [isActive, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <strong>Failed to load data:</strong> {error}
      </div>
    );
  }

  const invoiced = data?.invoiced;
  const pipeline = data?.pipeline;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Operations Management KPIs
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live
          </span>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">
            Updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Section A: Invoiced + Section B: Pipeline — responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {/* Section A: Invoiced — 3 tiles */}
        <KPITile
          label="Invoiced — Month"
          value={invoiced ? fmtDollar(invoiced.month) : "—"}
          icon={<DollarIcon />}
          accentColor="#3b82f6"
          subtitle="Current calendar month"
          error={!invoiced}
        />
        <KPITile
          label="Invoiced — YTD"
          value={invoiced ? fmtDollar(invoiced.ytd) : "—"}
          icon={<DollarIcon />}
          accentColor="#3b82f6"
          subtitle="Jan 1 to today"
          error={!invoiced}
        />
        <KPITile
          label="Invoiced — Rolling 12M"
          value={invoiced ? fmtDollar(invoiced.rolling12) : "—"}
          icon={<DollarIcon />}
          accentColor="#3b82f6"
          subtitle="Trailing 12 months"
          error={!invoiced}
        />

        {/* Section B: Pipeline Value — 1 tile */}
        <KPITile
          label="Pipeline Value"
          value={pipeline ? fmtDollar(pipeline.totalValue) : "—"}
          icon={<PipelineIcon />}
          accentColor="#10b981"
          subtitle={
            pipeline
              ? `${pipeline.jobCount} active jobs`
              : undefined
          }
          error={!pipeline}
        />
      </div>

      {/* Pipeline stage breakdown (if data available) */}
      {pipeline && Object.keys(pipeline.byStage).length > 0 && (
        <div className="rounded-xl border bg-white p-4 md:p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pipeline by Stage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {Object.entries(pipeline.byStage)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([stage, { count, value }]) => (
                <div
                  key={stage}
                  className="rounded-lg border bg-gray-50 p-3"
                >
                  <p className="text-xs font-medium text-gray-500">{stage}</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">
                    {fmtDollar(value)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {count} job{count !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sections C, D, E placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Section C
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Coming Soon
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Gross Profit</p>
          <p className="text-xs text-gray-400 mt-1">Data source: Xero</p>
        </div>

        <div
          className="rounded-xl border bg-white p-6 shadow-sm"
          style={{ borderLeftColor: "#8b5cf6", borderLeftWidth: 3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ backgroundColor: "#8b5cf615" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-violet-600">
                <path d="M8 1.5a3 3 0 100 6 3 3 0 000-6zM3 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tech Recovery (Group)
            </span>
          </div>
          {techMonthlyAvg !== null ? (
            <>
              <p className={`text-xl md:text-2xl font-bold leading-tight ${techMonthlyAvg * 100 >= 100 ? "text-green-600" : techMonthlyAvg * 100 >= 88 ? "text-amber-600" : "text-red-600"}`}>
                {(techMonthlyAvg * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Monthly avg — {techWeeksInMonth} week{techWeeksInMonth !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">No data available</p>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Section E
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Coming Soon
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Accounts Receivable, Payable &amp; Overdue Ratio</p>
          <p className="text-xs text-gray-400 mt-1">Data source: Xero</p>
        </div>
      </div>
    </div>
  );
}
