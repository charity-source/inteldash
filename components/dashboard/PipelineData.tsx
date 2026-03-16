"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────
interface StageItem {
  ID: number;
  Name: string;
  value: number;
}

interface StageData {
  count: number;
  value: number;
  items: StageItem[];
}

interface ApiResponse {
  fetchedAt: string;
  summary: {
    totalPipelineValue: number;
    jobs: { count: number; value: number };
    quotes: { count: number; value: number };
  };
  pipeline: {
    jobs: Record<string, StageData>;
    quotes: Record<string, StageData>;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────
function fmtDollar(v: number): string {
  if (Math.abs(v) >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return "$" + (v / 1_000).toFixed(1) + "K";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDollarFull(v: number): string {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// Stage colors
const STAGE_COLORS: Record<string, string> = {
  Progress: "#3b82f6",
  Pending: "#f59e0b",
  Estimated: "#8b5cf6",
  Complete: "#10b981",
  Invoiced: "#0d9488",
  Archived: "#94a3b8",
  Approved: "#6d28d9",
  Unknown: "#cbd5e1",
};

function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? "#94a3b8";
}

// ── Funnel Chart ────────────────────────────────────────────────────────
function FunnelChart({
  data,
  title,
  totalLabel,
}: {
  data: Record<string, StageData>;
  title: string;
  totalLabel: string;
}) {
  const entries = Object.entries(data)
    .filter(([, v]) => v.count > 0)
    .sort(([, a], [, b]) => b.value - a.value);

  const maxValue = entries.length > 0 ? Math.max(...entries.map(([, v]) => v.value), 1) : 1;
  const totalCount = entries.reduce((s, [, v]) => s + v.count, 0);
  const totalValue = entries.reduce((s, [, v]) => s + v.value, 0);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
        No {title.toLowerCase()} data
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[0.92rem] font-bold text-slate-800">{title}</div>
        <span className="text-[0.72rem] font-semibold text-slate-400">
          {totalCount} {totalLabel} · {fmtDollar(totalValue)}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {entries.map(([stage, val]) => {
          const barPct = Math.max(8, (val.value / maxValue) * 100);
          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-[80px] text-[0.82rem] font-semibold text-slate-700 shrink-0">{stage}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{ width: barPct + "%", background: stageColor(stage), opacity: 0.85 }}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-slate-700">
                  {val.count} items
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

// ── Items Table ─────────────────────────────────────────────────────────
function ItemsTable({
  pipeline,
  type,
}: {
  pipeline: Record<string, StageData>;
  type: "Jobs" | "Quotes";
}) {
  // Flatten all items with their stage
  const allItems = Object.entries(pipeline).flatMap(([stage, data]) =>
    data.items.map((item) => ({ ...item, stage }))
  );

  // Sort by value descending, show top 15
  const sorted = allItems.sort((a, b) => b.value - a.value).slice(0, 15);

  if (sorted.length === 0) return null;

  return (
    <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="text-[0.92rem] font-bold text-slate-800">Top {type} by Value</div>
        <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
          Showing {sorted.length} of {allItems.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              {["ID", "Name", "Stage", "Value"].map((h) => (
                <th
                  key={h}
                  className="text-[0.73rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2.5 bg-slate-50 border-b border-gray-200"
                  style={h === "Value" ? { textAlign: "right" } : undefined}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={`${item.stage}-${item.ID}`} className="transition-colors hover:bg-slate-50">
                <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-mono text-slate-500">
                  {item.ID}
                </td>
                <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-slate-800 max-w-[300px] truncate">
                  {item.Name}
                </td>
                <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                  <span
                    className="text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl text-white"
                    style={{ background: stageColor(item.stage) }}
                  >
                    {item.stage}
                  </span>
                </td>
                <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                  {fmtDollarFull(item.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────────
function PipelineDonut({
  jobs,
  quotes,
}: {
  jobs: { count: number; value: number };
  quotes: { count: number; value: number };
}) {
  const total = jobs.count + quotes.count;
  const cx = 100, cy = 100, r = 70, innerR = 48;

  if (total === 0) return null;

  const slices = [
    { label: "Jobs", count: jobs.count, value: jobs.value, color: "#3b82f6" },
    { label: "Quotes", count: quotes.count, value: quotes.value, color: "#8b5cf6" },
  ].filter((s) => s.count > 0);

  let startAngle = -90;
  const arcs = slices.map((slice) => {
    const pct = slice.count / total;
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

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-40 h-40">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.path} fill={arc.color} stroke="white" strokeWidth="2" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize="22" fontWeight="800">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
          Active
        </text>
      </svg>
      <div className="flex gap-5 mt-3">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[0.82rem]">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
            <span className="font-semibold text-slate-700">{s.label}</span>
            <span className="text-slate-400 font-medium">
              {s.count} ({((s.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────
function PipelineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14L10 8V13L6 13V8L2 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DealsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7H11M5 10H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AvgDealIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V11M6 7L8 5L10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function PipelineData({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/simpro/pipeline");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-red-500 font-semibold text-sm">{error}</div>
        <button onClick={fetchData} className="text-sm font-semibold text-purple-600 hover:text-purple-700 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, pipeline, fetchedAt } = data;
  const totalItems = summary.jobs.count + summary.quotes.count;
  const avgValue = totalItems > 0 ? summary.totalPipelineValue / totalItems : 0;
  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  // Count stages
  const jobStageCount = Object.keys(pipeline.jobs).filter((k) => pipeline.jobs[k].count > 0).length;
  const quoteStageCount = Object.keys(pipeline.quotes).filter((k) => pipeline.quotes[k].count > 0).length;

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
          <h2 className="text-xl font-bold text-slate-800">Pipeline Data</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#059669" }}
          >
            Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.72rem] text-slate-400 font-medium">
            Updated {new Date(fetchedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchData}
            className="text-[0.72rem] font-semibold text-purple-600 hover:text-purple-700 px-2 py-1 rounded border border-purple-200 hover:border-purple-300 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Pipeline Value */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #7c3aed" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-purple-50 text-purple-600">
                <PipelineIcon />
              </div>
            </div>
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Pipeline Value</div>
            <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">
              {fmtDollar(summary.totalPipelineValue)}
            </div>
            <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">Total open pipeline</div>
          </div>

          {/* Active Items */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #3b82f6" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-blue-50 text-blue-600">
                <DealsIcon />
              </div>
            </div>
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Active Items</div>
            <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{totalItems}</div>
            <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">
              {summary.jobs.count} jobs · {summary.quotes.count} quotes
            </div>
          </div>

          {/* Jobs Value */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #3b82f6" }}
          >
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Jobs Value</div>
            <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">
              {fmtDollar(summary.jobs.value)}
            </div>
            <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">
              {summary.jobs.count} jobs across {jobStageCount} stages
            </div>
          </div>

          {/* Quotes Value */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #8b5cf6" }}
          >
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Quotes Value</div>
            <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">
              {fmtDollar(summary.quotes.value)}
            </div>
            <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">
              {summary.quotes.count} quotes across {quoteStageCount} stages
            </div>
          </div>

          {/* Avg Item Value */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #f59e0b" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-amber-50 text-amber-600">
                <AvgDealIcon />
              </div>
            </div>
            <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">Avg Item Value</div>
            <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{fmtDollar(avgValue)}</div>
            <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">Across all stages</div>
          </div>
        </div>

        {/* SPLIT OVERVIEW — Donut + Summary */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Pipeline Split</div>
            <PipelineDonut jobs={summary.jobs} quotes={summary.quotes} />
          </div>

          {/* Quick stage summary */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.5] min-w-0">
            <div className="text-[0.92rem] font-bold text-slate-800 mb-4">All Stages Overview</div>
            <div className="space-y-2">
              {/* Merge job + quote stages into a combined view */}
              {(() => {
                const combined: Record<string, { jobs: number; jobVal: number; quotes: number; quoteVal: number }> = {};
                for (const [stage, val] of Object.entries(pipeline.jobs)) {
                  if (!combined[stage]) combined[stage] = { jobs: 0, jobVal: 0, quotes: 0, quoteVal: 0 };
                  combined[stage].jobs = val.count;
                  combined[stage].jobVal = val.value;
                }
                for (const [stage, val] of Object.entries(pipeline.quotes)) {
                  if (!combined[stage]) combined[stage] = { jobs: 0, jobVal: 0, quotes: 0, quoteVal: 0 };
                  combined[stage].quotes = val.count;
                  combined[stage].quoteVal = val.value;
                }
                const entries = Object.entries(combined).sort(
                  ([, a], [, b]) => b.jobVal + b.quoteVal - (a.jobVal + a.quoteVal)
                );
                const maxVal = Math.max(...entries.map(([, v]) => v.jobVal + v.quoteVal), 1);

                return entries.map(([stage, val]) => {
                  const total = val.jobVal + val.quoteVal;
                  const totalCount = val.jobs + val.quotes;
                  const jobPct = total > 0 ? (val.jobVal / maxVal) * 100 : 0;
                  const quotePct = total > 0 ? (val.quoteVal / maxVal) * 100 : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="w-[80px] text-[0.82rem] font-semibold text-slate-700 shrink-0">{stage}</div>
                      <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden flex">
                        {jobPct > 0 && (
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: jobPct + "%", background: "#3b82f6", opacity: 0.8 }}
                          />
                        )}
                        {quotePct > 0 && (
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: quotePct + "%", background: "#8b5cf6", opacity: 0.8 }}
                          />
                        )}
                      </div>
                      <div className="w-[50px] text-right text-[0.78rem] font-bold text-slate-600 shrink-0">
                        {totalCount}
                      </div>
                      <div className="w-[85px] text-right text-[0.85rem] font-bold text-slate-800 shrink-0">
                        {fmtDollar(total)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#3b82f6" }} /> Jobs
              </span>
              <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#8b5cf6" }} /> Quotes
              </span>
            </div>
          </div>
        </div>

        {/* FUNNEL BREAKDOWNS */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <FunnelChart data={pipeline.jobs} title="Jobs Pipeline" totalLabel="jobs" />
          </div>
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <FunnelChart data={pipeline.quotes} title="Quotes Pipeline" totalLabel="quotes" />
          </div>
        </div>

        {/* ITEMS TABLES */}
        <ItemsTable pipeline={pipeline.jobs} type="Jobs" />
        <ItemsTable pipeline={pipeline.quotes} type="Quotes" />

        {/* COMING SOON */}
        <div className="bg-white rounded-[10px] border border-dashed border-gray-300 shadow-sm p-6 text-center">
          <div className="text-[0.85rem] font-semibold text-slate-400">
            Win/Loss Trend · Deal Velocity · Forecasted Revenue
          </div>
          <div className="text-[0.75rem] text-slate-300 mt-1">
            Coming with cache layer — requires historical tracking
          </div>
        </div>
      </div>
    </>
  );
}
