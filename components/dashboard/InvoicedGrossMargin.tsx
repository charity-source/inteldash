"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// -- Types ------------------------------------------------------------------
type TimePeriod = "Month" | "Year to Date" | "Rolling 12 Months";

const PERIOD_API_MAP: Record<TimePeriod, string> = {
  "Month": "month",
  "Year to Date": "ytd",
  "Rolling 12 Months": "rolling12",
};

interface ApiResponse {
  period: string;
  periodStart: string;
  fetchedAt: string;
  summary: {
    invoiceCount: number;
    totalExTax: number;
  };
  breakdown: {
    byCustomer: Record<string, { count: number; value: number }>;
    topProjects: { name: string; value: number }[];
  };
  grossMargin: {
    jobsAnalysed: number;
    avgGrossMarginActual: number;
  };
}

// -- Helpers ----------------------------------------------------------------
function fmtDollar(v: number, compact?: boolean): string {
  if (compact && Math.abs(v) >= 1_000_000) {
    return "$" + (v / 1_000_000).toFixed(2) + "M";
  }
  const abs = Math.abs(v);
  const s = "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? "-" + s : s;
}

function fmtPct(v: number): string {
  return v.toFixed(2) + "%";
}

// -- Icons ------------------------------------------------------------------
function InvoiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MarginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// -- Main Component ---------------------------------------------------------
export default function InvoicedGrossMargin({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [period, setPeriod] = useState<TimePeriod>("Month");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const fetchData = useCallback(async (p: TimePeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/simpro/invoiced?period=${PERIOD_API_MAP[p]}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }
      const json: ApiResponse = await res.json();
      setData(json);
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isActive) fetchData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh trigger
  useEffect(() => {
    if (!isActive) return;
    fetchData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handlePeriodChange = useCallback((p: TimePeriod) => {
    setPeriod(p);
    fetchData(p);
  }, [fetchData]);

  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  if (!isActive) return null;

  // -- Loading state --
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // -- Error state --
  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Failed to load invoiced data:</strong> {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const customers = Object.entries(data.breakdown.byCustomer)
    .map(([name, { count, value }]) => ({ name, invoiceCount: count, value }))
    .sort((a, b) => b.value - a.value);

  const topProjects = data.breakdown.topProjects ?? [];

  const marginPct = data.grossMargin.avgGrossMarginActual;

  return (
    <>
      <style>{`
        @keyframes cardFlash {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between bg-white px-5 py-4 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <h2 className="text-xl font-bold text-slate-800">Invoiced + Gross Margin</h2>
          <span className="text-[0.72rem] font-semibold text-slate-400">{data.period}</span>
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-[3px] gap-0.5">
          {(["Month", "Year to Date", "Rolling 12 Months"] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`text-[0.82rem] font-medium px-4 py-1.5 rounded-md border-none transition-all ${
                period === p
                  ? "bg-white text-blue-500 font-semibold shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* SUMMARY BANNER */}
        <div
          className="rounded-[10px] px-6 py-3.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
        >
          <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide">
            {data.period} Summary
          </div>
          <div className="flex gap-12">
            <SummaryMetric label="Invoices" value={String(data.summary.invoiceCount)} color="#60a5fa" />
            <SummaryMetric label="Total Ex-Tax" value={fmtDollar(data.summary.totalExTax, true)} color="#60a5fa" />
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            className={cardFlash}
            borderColor="#3b82f6"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={<InvoiceIcon />}
            label="Total Invoiced"
            value={fmtDollar(data.summary.totalExTax)}
            sub={`${data.summary.invoiceCount} invoices — ex-tax`}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#8b5cf6"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            icon={<MarginIcon />}
            label="Avg Gross Margin"
            value={marginPct > 0 ? fmtPct(marginPct) : "N/A"}
            sub={marginPct > 0 ? `Based on ${data.grossMargin.jobsAnalysed} jobs` : "No margin data for this period"}
            targetIndicator={35}
            currentMargin={marginPct}
          />
        </div>

        {/* TOP CUSTOMERS + TOP PROJECTS ROW */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Top Customers */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Top Customers</div>
              <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Ex-tax
              </span>
            </div>
            {customers.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">No invoices in this period</div>
            ) : (
              <div className="flex flex-col gap-0">
                {customers.map((cust, i) => {
                  const maxVal = customers[0].value;
                  const barW = maxVal > 0 ? (cust.value / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                      <span className="text-[0.85rem] font-semibold text-slate-800 w-[160px] truncate" title={cust.name}>{cust.name}</span>
                      <span className="text-[0.7rem] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">
                        {cust.invoiceCount} inv
                      </span>
                      <div className="flex-1 h-[22px] bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded bg-blue-400 transition-all"
                          style={{ width: barW + "%" }}
                        />
                      </div>
                      <span className="text-[0.85rem] font-bold text-slate-800 whitespace-nowrap">{fmtDollar(cust.value, true)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Projects */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Top Projects</div>
              <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Ex-tax
              </span>
            </div>
            {topProjects.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">No projects in this period</div>
            ) : (
              <div className="flex flex-col gap-0">
                {topProjects.map((proj, i) => {
                  const maxVal = topProjects[0].value;
                  const barW = maxVal > 0 ? (proj.value / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                      <span className="text-[0.85rem] font-semibold text-slate-800 w-[160px] truncate" title={proj.name}>{proj.name}</span>
                      <div className="flex-1 h-[22px] bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded bg-emerald-400 transition-all"
                          style={{ width: barW + "%" }}
                        />
                      </div>
                      <span className="text-[0.85rem] font-bold text-slate-800 whitespace-nowrap">{fmtDollar(proj.value, true)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LAST UPDATED */}
        <div className="text-right text-[0.7rem] text-slate-400">
          Last updated: {new Date(data.fetchedAt).toLocaleString("en-AU")}
        </div>
      </div>
    </>
  );
}

// -- Sub-components ---------------------------------------------------------

function SummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[0.72rem] text-slate-400 font-medium mb-0.5">{label}</div>
      <div className="text-[1.15rem] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function MetricCard({
  borderColor,
  iconBg,
  iconColor,
  icon,
  label,
  value,
  sub,
  className,
  targetIndicator,
  currentMargin,
}: {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  className?: string;
  targetIndicator?: number;
  currentMargin?: number;
}) {
  const isMarginCard = targetIndicator !== undefined && currentMargin !== undefined;
  return (
    <div
      className={`relative bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm ${className ?? ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {isMarginCard && currentMargin > 0 && (
          <span
            className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
              currentMargin >= targetIndicator ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {currentMargin >= targetIndicator ? "Above" : "Below"} {targetIndicator}%
          </span>
        )}
      </div>
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{value}</div>
      {sub && <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">{sub}</div>}
      {isMarginCard && currentMargin > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[0.72rem] font-semibold text-slate-400 mb-1">
            <span>0%</span>
            <span>50%</span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: Math.min((currentMargin / 50) * 100, 100) + "%",
                background: currentMargin >= targetIndicator ? "#10b981" : "#ef4444",
              }}
            />
            <div
              className="absolute top-[-3px] h-[calc(100%+6px)] w-[2px] bg-purple-600"
              style={{ left: (targetIndicator / 50) * 100 + "%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

