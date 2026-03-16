"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────
interface ApiResponse {
  period: string;
  periodStart: string;
  fetchedAt: string;
  summary: {
    invoiceCount: number;
    totalInvoiced: number;
    totalExTax: number;
    totalPaid: number;
    totalOutstanding: number;
    paidCount: number;
    unpaidCount: number;
  };
  breakdown: {
    byType: Record<string, { count: number; value: number }>;
    byCustomer: Record<string, { count: number; value: number }>;
  };
  grossMargin: {
    jobsAnalysed: number;
    avgGrossMarginActual: number | null;
    avgGrossMarginEstimate: number | null;
    totalGrossProfitLoss: number | null;
    totalInvoicedOnJobs: number | null;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────
function fmtDollar(v: number): string {
  if (Math.abs(v) >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return "$" + (v / 1_000).toFixed(1) + "K";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function safeDollar(v: number | null): string {
  return v != null ? fmtDollar(v) : "—";
}

function fmtPct(v: number): string {
  return v.toFixed(1) + "%";
}

function safePct(v: number | null): string {
  return v != null ? fmtPct(v) : "—";
}

// Type colors
const TYPE_COLORS: Record<string, string> = {
  ProgressInvoice: "#3b82f6",
  TaxInvoice: "#8b5cf6",
  FinalInvoice: "#10b981",
  Deposit: "#f59e0b",
  CreditNote: "#ef4444",
  Claim: "#f59e0b",
  Unknown: "#94a3b8",
};

function typeColor(t: string): string {
  return TYPE_COLORS[t] ?? "#94a3b8";
}

function typeLabel(t: string): string {
  return t.replace(/([A-Z])/g, " $1").trim();
}

// ── Donut Chart ─────────────────────────────────────────────────────────
function PaidUnpaidDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  if (total === 0) return null;

  const cx = 100, cy = 100, r = 70, innerR = 48;
  const slices = [
    { label: "Paid", value: paid, color: "#10b981" },
    { label: "Unpaid", value: unpaid, color: "#f59e0b" },
  ].filter((s) => s.value > 0);

  let startAngle = -90;
  const arcs = slices.map((slice) => {
    const pct = slice.value / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const rad1 = (startAngle * Math.PI) / 180;
    const rad2 = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(rad1), y1 = cy + r * Math.sin(rad1);
    const x2 = cx + r * Math.cos(rad2), y2 = cy + r * Math.sin(rad2);
    const ix1 = cx + innerR * Math.cos(rad2), iy1 = cy + innerR * Math.sin(rad2);
    const ix2 = cx + innerR * Math.cos(rad1), iy2 = cy + innerR * Math.sin(rad1);

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    startAngle = endAngle;
    return { ...slice, path };
  });

  const paidPct = ((paid / total) * 100).toFixed(0);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-40 h-40">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.path} fill={arc.color} stroke="white" strokeWidth="2" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="800">
          {paidPct}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
          Paid
        </text>
      </svg>
      <div className="flex gap-5 mt-3">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[0.82rem]">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
            <span className="font-semibold text-slate-700">{s.label}</span>
            <span className="text-slate-400 font-medium">{fmtDollar(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bar Breakdown ───────────────────────────────────────────────────────
function BreakdownBars({
  data,
  title,
  colorFn,
  labelFn,
}: {
  data: Record<string, { count: number; value: number }>;
  title: string;
  colorFn: (key: string) => string;
  labelFn?: (key: string) => string;
}) {
  const entries = Object.entries(data)
    .filter(([, v]) => v.value > 0)
    .sort(([, a], [, b]) => b.value - a.value);

  const maxVal = entries.length > 0 ? Math.max(...entries.map(([, v]) => v.value), 1) : 1;

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        No data
      </div>
    );
  }

  return (
    <div>
      <div className="text-[0.92rem] font-bold text-slate-800 mb-4">{title}</div>
      <div className="space-y-2.5">
        {entries.map(([key, val]) => {
          const barPct = Math.max(8, (val.value / maxVal) * 100);
          const label = labelFn ? labelFn(key) : key;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-[120px] text-[0.82rem] font-semibold text-slate-700 shrink-0 truncate" title={label}>
                {label}
              </div>
              <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{ width: barPct + "%", background: colorFn(key), opacity: 0.8 }}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-slate-700">
                  {val.count} inv
                </span>
              </div>
              <div className="w-[90px] text-right text-[0.85rem] font-bold text-slate-800 shrink-0">
                {fmtDollar(val.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────
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

// ── Main Component ──────────────────────────────────────────────────────
export default function InvoicedGrossMargin({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/simpro/invoiced");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isActive) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (isActive && refreshTrigger) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  if (!isActive) return null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-red-500 font-semibold text-sm">{error}</div>
        <button onClick={fetchData} className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, breakdown, grossMargin, period, fetchedAt } = data;
  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";
  const collectionRate = summary.totalInvoiced > 0
    ? ((summary.totalPaid / summary.totalInvoiced) * 100)
    : 0;
  const hasMarginData = grossMargin.jobsAnalysed > 0;
  const actualMargin = grossMargin.avgGrossMarginActual ?? 0;
  const estimateMargin = grossMargin.avgGrossMarginEstimate ?? 0;

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
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#059669" }}
          >
            Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.72rem] text-slate-400 font-medium">
            {period} · Updated {new Date(fetchedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchData}
            className="text-[0.72rem] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
          >
            ↻ Refresh
          </button>
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
            {period} Summary
          </div>
          <div className="flex gap-10">
            <div className="text-center">
              <div className="text-[0.72rem] text-slate-400 font-medium mb-0.5">Total Invoiced</div>
              <div className="text-[1.15rem] font-bold text-blue-400">{fmtDollar(summary.totalInvoiced)}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.72rem] text-slate-400 font-medium mb-0.5">Collected</div>
              <div className="text-[1.15rem] font-bold text-emerald-400">{fmtDollar(summary.totalPaid)}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.72rem] text-slate-400 font-medium mb-0.5">Outstanding</div>
              <div className="text-[1.15rem] font-bold text-amber-400">{fmtDollar(summary.totalOutstanding)}</div>
            </div>
            <div className="text-center">
              <div className="text-[0.72rem] text-slate-400 font-medium mb-0.5">Avg Margin (Actual)</div>
              <div className="text-[1.15rem] font-bold text-emerald-400">
                {hasMarginData ? safePct(grossMargin.avgGrossMarginActual) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Invoiced */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #3b82f6" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-blue-50 text-blue-600">
                <InvoiceIcon />
              </div>
            </div>
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Invoiced</div>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{fmtDollar(summary.totalInvoiced)}</div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {summary.invoiceCount} invoices · {fmtDollar(summary.totalExTax)} ex-tax
            </div>
          </div>

          {/* Paid */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #10b981" }}
          >
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Paid</div>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{fmtDollar(summary.totalPaid)}</div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {summary.paidCount} of {summary.invoiceCount} invoices
            </div>
          </div>

          {/* Outstanding */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #f59e0b" }}
          >
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Outstanding</div>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{fmtDollar(summary.totalOutstanding)}</div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {summary.unpaidCount} unpaid invoices
            </div>
          </div>

          {/* Collection Rate */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #8b5cf6" }}
          >
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Collection Rate</div>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{fmtPct(collectionRate)}</div>
            <div className="mt-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: Math.min(collectionRate, 100) + "%",
                    background: collectionRate >= 80 ? "#10b981" : collectionRate >= 50 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Gross Margin */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #10b981" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-emerald-50 text-emerald-600">
                <MarginIcon />
              </div>
              {hasMarginData && (
                <span
                  className={`text-[0.72rem] font-semibold px-2 py-0.5 rounded-xl ${
                    actualMargin >= 35
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {actualMargin >= 35 ? "Above" : "Below"} 35%
                </span>
              )}
            </div>
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Avg Gross Margin</div>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">
              {hasMarginData ? safePct(grossMargin.avgGrossMarginActual) : "—"}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {grossMargin.jobsAnalysed} jobs analysed
            </div>
          </div>
        </div>

        {/* GROSS MARGIN DETAIL CARDS */}
        {hasMarginData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-[10px] border border-gray-200 p-4 shadow-sm">
              <div className="text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wide mb-1">Actual Margin</div>
              <div className="text-[1.3rem] font-extrabold text-emerald-600">{safePct(grossMargin.avgGrossMarginActual)}</div>
            </div>
            <div className="bg-white rounded-[10px] border border-gray-200 p-4 shadow-sm">
              <div className="text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wide mb-1">Estimated Margin</div>
              <div className="text-[1.3rem] font-extrabold text-blue-600">{safePct(grossMargin.avgGrossMarginEstimate)}</div>
            </div>
            <div className="bg-white rounded-[10px] border border-gray-200 p-4 shadow-sm">
              <div className="text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wide mb-1">Gross Profit/Loss</div>
              <div className={`text-[1.3rem] font-extrabold ${(grossMargin.totalGrossProfitLoss ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {safeDollar(grossMargin.totalGrossProfitLoss)}
              </div>
            </div>
            <div className="bg-white rounded-[10px] border border-gray-200 p-4 shadow-sm">
              <div className="text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wide mb-1">Invoiced on Jobs</div>
              <div className="text-[1.3rem] font-extrabold text-slate-800">{safeDollar(grossMargin.totalInvoicedOnJobs)}</div>
            </div>
          </div>
        )}

        {/* CHARTS ROW — Paid/Unpaid Donut + Type Breakdown */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Payment Status</div>
            <PaidUnpaidDonut paid={summary.totalPaid} unpaid={summary.totalOutstanding} />
          </div>

          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.5] min-w-0">
            <BreakdownBars
              data={breakdown.byType}
              title="Invoices by Type"
              colorFn={typeColor}
              labelFn={typeLabel}
            />
          </div>
        </div>

        {/* CUSTOMER BREAKDOWN */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
          <BreakdownBars
            data={breakdown.byCustomer}
            title="Top Customers"
            colorFn={() => "#3b82f6"}
          />
        </div>

        {/* MARGIN VS ESTIMATE COMPARISON */}
        {hasMarginData && (
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
            <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Margin: Actual vs Estimate</div>
            <div className="flex items-center gap-6">
              {/* Actual bar */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.82rem] font-semibold text-slate-700">Actual</span>
                  <span className="text-[0.85rem] font-bold text-emerald-600">{safePct(grossMargin.avgGrossMarginActual)}</span>
                </div>
                <div className="h-8 bg-gray-100 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: Math.min((actualMargin / 60) * 100, 100) + "%",
                      background: actualMargin >= 35 ? "#10b981" : "#ef4444",
                      opacity: 0.85,
                    }}
                  />
                  {/* 35% target line */}
                  <div
                    className="absolute top-0 h-full w-[2px] bg-purple-600"
                    style={{ left: (35 / 60) * 100 + "%" }}
                  />
                </div>
              </div>
              {/* Estimate bar */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.82rem] font-semibold text-slate-700">Estimate</span>
                  <span className="text-[0.85rem] font-bold text-blue-600">{safePct(grossMargin.avgGrossMarginEstimate)}</span>
                </div>
                <div className="h-8 bg-gray-100 rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: Math.min((estimateMargin / 60) * 100, 100) + "%",
                      background: "#3b82f6",
                      opacity: 0.85,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-[2px] bg-purple-600"
                    style={{ left: (35 / 60) * 100 + "%" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2.5">
              <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-sm inline-block bg-purple-600" /> 35% target
              </span>
              <span className="text-[0.72rem] text-slate-400 font-medium">
                Variance: {fmtPct(actualMargin - estimateMargin)}
              </span>
            </div>
          </div>
        )}

        {/* COMING SOON */}
        <div className="bg-white rounded-[10px] border border-dashed border-gray-300 shadow-sm p-6 text-center">
          <div className="text-[0.85rem] font-semibold text-slate-400">
            Monthly Trend Chart · Cost of Works Breakdown · Category Margins
          </div>
          <div className="text-[0.75rem] text-slate-300 mt-1">
            Coming with cache layer — requires historical data accumulation
          </div>
        </div>
      </div>
    </>
  );
}
