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

interface TechWeeklyDetail {
  tabName: string;
  group: { actual: number; costed: number; recovery: number | null } | null;
}

interface TechApiResponse {
  summary: { weekEnding: string; groupRate: number | null }[];
  weeklyDetails: TechWeeklyDetail[];
}

interface WeekBar {
  label: string;
  endDate: Date;
  recovery: number; // as percentage e.g. 115.6
  actual: number;
  costed: number;
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

function parseTabEndDate(tabName: string): Date {
  const endPart = tabName.split("-")[1];
  const day = parseInt(endPart.substring(0, 2), 10);
  const month = parseInt(endPart.substring(2, 4), 10) - 1;
  const year = 2000 + parseInt(endPart.substring(4, 6), 10);
  return new Date(year, month, day);
}

function formatWeekLabel(tabName: string): string {
  const parts = tabName.split("-");
  const startDay = parts[0].substring(0, 2);
  const startMonth = parseInt(parts[0].substring(2, 4), 10);
  const endDay = parts[1].substring(0, 2);
  const endMonth = parseInt(parts[1].substring(2, 4), 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (startMonth === endMonth) {
    return `${parseInt(startDay)}–${parseInt(endDay)} ${months[endMonth - 1]}`;
  }
  return `${parseInt(startDay)} ${months[startMonth - 1]}–${parseInt(endDay)} ${months[endMonth - 1]}`;
}

function recoveryColor(pct: number): string {
  if (pct >= 100) return "text-green-600";
  if (pct >= 88) return "text-amber-600";
  return "text-red-600";
}

function barColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 88) return "bg-amber-500";
  return "bg-red-500";
}

// -- Icons ------------------------------------------------------------------
function DollarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3.5v9M10 5.5c0-1.1-.9-1.5-2-1.5s-2 .4-2 1.5.9 1.5 2 1.5 2 .4 2 1.5-.9 1.5-2 1.5-2-.4-2-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-600">
      <path d="M2 4h12l-3 4v4l-2 1v-5L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TechIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-violet-600">
      <path d="M8 1.5a3 3 0 100 6 3 3 0 000-6zM3 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
  subtitle?: string;
  error?: boolean;
  valueClassName?: string;
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
          <p className={`text-xl md:text-2xl font-bold leading-tight ${valueClassName || "text-gray-900"}`}>
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
  const [weeklyBars, setWeeklyBars] = useState<WeekBar[]>([]);
  const [monthRecovery, setMonthRecovery] = useState<{ pct: number; weeks: number } | null>(null);
  const [ytdRecovery, setYtdRecovery] = useState<{ pct: number; weeks: number } | null>(null);
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

      // Process technician recovery data
      if (techRes.ok) {
        const techJson: TechApiResponse = await techRes.json();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ytdStart = new Date(now.getFullYear(), 0, 1);

        // Build weekly bars from weeklyDetails (has actual/costed hours)
        const bars: WeekBar[] = techJson.weeklyDetails
          .filter((w) => w.group && w.group.actual > 0)
          .map((w) => {
            const endDate = parseTabEndDate(w.tabName);
            const actual = w.group!.actual;
            const costed = w.group!.costed;
            const recovery = actual > 0 ? (costed / actual) * 100 : 0;
            return {
              label: formatWeekLabel(w.tabName),
              endDate,
              recovery,
              actual,
              costed,
            };
          })
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
          .slice(-6); // last 6 weeks

        setWeeklyBars(bars);

        // Month recovery: sum actual/costed for weeks ending in current month
        const monthWeeks = bars.filter((w) => w.endDate >= monthStart && w.endDate <= now);
        if (monthWeeks.length > 0) {
          const totalActual = monthWeeks.reduce((s, w) => s + w.actual, 0);
          const totalCosted = monthWeeks.reduce((s, w) => s + w.costed, 0);
          const pct = totalActual > 0 ? (totalCosted / totalActual) * 100 : 0;
          setMonthRecovery({ pct, weeks: monthWeeks.length });
        } else {
          setMonthRecovery(null);
        }

        // YTD recovery: sum actual/costed for all weeks from Jan 1
        const allWeeks = techJson.weeklyDetails
          .filter((w) => w.group && w.group.actual > 0)
          .map((w) => ({
            endDate: parseTabEndDate(w.tabName),
            actual: w.group!.actual,
            costed: w.group!.costed,
          }));
        const ytdWeeks = allWeeks.filter((w) => w.endDate >= ytdStart && w.endDate <= now);
        if (ytdWeeks.length > 0) {
          const totalActual = ytdWeeks.reduce((s, w) => s + w.actual, 0);
          const totalCosted = ytdWeeks.reduce((s, w) => s + w.costed, 0);
          const pct = totalActual > 0 ? (totalCosted / totalActual) * 100 : 0;
          setYtdRecovery({ pct, weeks: ytdWeeks.length });
        } else {
          setYtdRecovery(null);
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

  useEffect(() => {
    if (!isActive) return;
    fetchData();
  }, [isActive, refreshTrigger, fetchData]);

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
  const maxRecovery = weeklyBars.length > 0 ? Math.max(...weeklyBars.map((w) => w.recovery), 100) : 100;

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
          <p className="text-xs text-gray-400 mt-1">Updated: {lastUpdated}</p>
        )}
      </div>

      {/* Section A: Invoiced + Section B: Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
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
        <KPITile
          label="Pipeline Value"
          value={pipeline ? fmtDollar(pipeline.totalValue) : "—"}
          icon={<PipelineIcon />}
          accentColor="#10b981"
          subtitle={pipeline ? `${pipeline.jobCount} active jobs` : undefined}
          error={!pipeline}
        />
      </div>

      {/* Pipeline stage breakdown */}
      {pipeline && Object.keys(pipeline.byStage).length > 0 && (
        <div className="rounded-xl border bg-white p-4 md:p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pipeline by Stage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {Object.entries(pipeline.byStage)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([stage, { count, value }]) => (
                <div key={stage} className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">{stage}</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">{fmtDollar(value)}</p>
                  <p className="text-xs text-gray-400">{count} job{count !== 1 ? "s" : ""}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Section C placeholder + Section D (live) + Section E placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {/* Section C: Gross Profit — placeholder */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section C</span>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Coming Soon</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Gross Profit</p>
          <p className="text-xs text-gray-400 mt-1">Data source: Xero</p>
        </div>

        {/* Section D: Technician Recovery (Group) — LIVE */}
        <div className="rounded-xl border bg-white p-4 md:p-5 shadow-sm" style={{ borderLeftColor: "#8b5cf6", borderLeftWidth: 3 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "#8b5cf615" }}>
              <TechIcon />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tech Recovery (Group)
            </span>
          </div>

          {weeklyBars.length > 0 ? (
            <>
              {/* Bar chart */}
              <div className="space-y-2 mb-4">
                {weeklyBars.map((w) => (
                  <div key={w.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-24 md:w-28 shrink-0 truncate">{w.label}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      {/* 100% marker line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
                        style={{ left: `${(100 / maxRecovery) * 100}%` }}
                      />
                      <div
                        className={`h-full rounded-full ${barColor(w.recovery)} transition-all`}
                        style={{ width: `${Math.min((w.recovery / maxRecovery) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold w-14 text-right ${recoveryColor(w.recovery)}`}>
                      {w.recovery.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Month + YTD tiles */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Month</p>
                  {monthRecovery ? (
                    <>
                      <p className={`text-lg font-bold ${recoveryColor(monthRecovery.pct)}`}>
                        {monthRecovery.pct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">{monthRecovery.weeks} week{monthRecovery.weeks !== 1 ? "s" : ""}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No data</p>
                  )}
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">YTD</p>
                  {ytdRecovery ? (
                    <>
                      <p className={`text-lg font-bold ${recoveryColor(ytdRecovery.pct)}`}>
                        {ytdRecovery.pct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">{ytdRecovery.weeks} week{ytdRecovery.weeks !== 1 ? "s" : ""}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No data</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">No data available</p>
          )}
        </div>

        {/* Section E: AR/AP/Overdue — placeholder */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Section E</span>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Coming Soon</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Accounts Receivable, Payable &amp; Overdue Ratio</p>
          <p className="text-xs text-gray-400 mt-1">Data source: Xero</p>
        </div>
      </div>
    </div>
  );
}
