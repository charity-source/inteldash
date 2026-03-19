"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────
interface StageData {
  count: number;
  value: number;
}

interface ApiResponse {
  period: string;
  periodStart: string;
  fetchedAt: string;
  summary: {
    totalItems: number;
    totalValue: number;
    jobs: { count: number; value: number };
    quotes: { count: number; value: number };
  };
  breakdown: {
    jobsByStage: Record<string, StageData>;
    quotesByStage: Record<string, StageData>;
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

// Stage colors — consistent across all views
const STAGE_COLORS: Record<string, string> = {
  Progress: "#3b82f6",
  Pending: "#f59e0b",
  Estimated: "#8b5cf6",
  Complete: "#10b981",
  Invoiced: "#0d9488",
  Archived: "#94a3b8",
  Approved: "#3b82f6",
  Unknown: "#cbd5e1",
};

function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? "#94a3b8";
}

// ── SVG Donut Chart ─────────────────────────────────────────────────────
function DonutChart({ data, title }: { data: Record<string, StageData>; title: string }) {
  const entries = Object.entries(data).filter(([, v]) => v.count > 0);
  const total = entries.reduce((s, [, v]) => s + v.count, 0);
  const totalValue = entries.reduce((s, [, v]) => s + v.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
        No {title.toLowerCase()} data
      </div>
    );
  }

  const cx = 100, cy = 100, r = 70, innerR = 48;
  let startAngle = -90;

  const arcs = entries.map(([label, val]) => {
    const pct = val.count / total;
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
    return { label, ...val, path, color: stageColor(label) };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-44 h-44">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.path} fill={arc.color} stroke="white" strokeWidth="2" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize="22" fontWeight="800">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
          Total
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
        {arcs.map((arc) => {
          const pct = ((arc.count / total) * 100).toFixed(1);
          return (
            <div key={arc.label} className="flex items-center gap-1.5 text-[0.82rem]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: arc.color }} />
              <span className="font-semibold text-slate-700">{arc.label}</span>
              <span className="text-slate-400 font-medium">{arc.count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
      <div className="text-[0.82rem] font-bold text-slate-500 mt-2">
        {fmtDollar(totalValue)} total value
      </div>
    </div>
  );
}

// ── Stage Breakdown Table ───────────────────────────────────────────────
function StageTable({ data, label }: { data: Record<string, StageData>; label: string }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b.value - a.value);
  const maxVal = Math.max(...entries.map(([, v]) => v.value), 1);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      {entries.map(([stage, val]) => (
        <div key={stage} className="flex items-center gap-3">
          <div className="w-20 text-[0.82rem] font-semibold text-slate-700 shrink-0">{stage}</div>
          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${Math.max((val.value / maxVal) * 100, 2)}%`,
                background: stageColor(stage),
                opacity: 0.8,
              }}
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-slate-700">
              {val.count} items
            </span>
          </div>
          <div className="w-24 text-right text-[0.85rem] font-bold text-slate-800 shrink-0">
            {fmtDollar(val.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function NewWorksVolume({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/simpro/new-works");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-red-500 font-semibold text-sm">{error}</div>
        <button
          onClick={fetchData}
          className="text-sm font-semibold text-teal-600 hover:text-teal-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, breakdown, period, fetchedAt } = data;
  const avgValue = summary.totalItems > 0 ? summary.totalValue / summary.totalItems : 0;
  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  return (
    <>
      <style>{`
        @keyframes cardFlash {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white px-3 md:px-5 py-4 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <h2 className="text-xl font-bold text-slate-800">New Works Volume</h2>
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
            className="text-[0.72rem] font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 rounded border border-teal-200 hover:border-teal-300 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-3 md:p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          {/* Total New Works */}
          <div
            className={`col-span-2 md:col-span-1 bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #0d9488" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Total New Works
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {summary.totalItems}
            </div>
            <div className="text-[0.92rem] font-bold text-teal-600 mt-1">
              {fmtDollar(summary.totalValue)}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">{period}</div>
          </div>

          {/* Jobs */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #3b82f6" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Jobs
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {summary.jobs.count}
            </div>
            <div className="text-[0.92rem] font-bold text-blue-600 mt-1">
              {fmtDollar(summary.jobs.value)}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {summary.totalItems > 0 ? ((summary.jobs.count / summary.totalItems) * 100).toFixed(0) : 0}% of total
            </div>
          </div>

          {/* Quotes */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #8b5cf6" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Quotes
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {summary.quotes.count}
            </div>
            <div className="text-[0.92rem] font-bold text-purple-600 mt-1">
              {fmtDollar(summary.quotes.value)}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">
              {summary.totalItems > 0 ? ((summary.quotes.count / summary.totalItems) * 100).toFixed(0) : 0}% of total
            </div>
          </div>

          {/* Avg Value */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #f59e0b" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Avg Value
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {fmtDollar(avgValue)}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1.5 font-medium">Per item</div>
          </div>

          {/* Jobs / Quotes Ratio */}
          <div
            className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #10b981" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Job : Quote Ratio
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {summary.quotes.count > 0
                ? (summary.jobs.count / summary.quotes.count).toFixed(2)
                : "—"}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1.5 font-medium">Jobs per quote</div>
          </div>
        </div>

        {/* CHARTS ROW — Job Stages + Quote Stages */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Jobs by Stage</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">{period}</span>
            </div>
            <DonutChart data={breakdown.jobsByStage} title="Jobs" />
          </div>

          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Quotes by Stage</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">{period}</span>
            </div>
            <DonutChart data={breakdown.quotesByStage} title="Quotes" />
          </div>
        </div>

        {/* STAGE BREAKDOWN BARS */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <StageTable data={breakdown.jobsByStage} label="Job Stage Breakdown" />
          </div>
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <StageTable data={breakdown.quotesByStage} label="Quote Stage Breakdown" />
          </div>
        </div>

        {/* COMING SOON — placeholders for features that need cache layer */}
        <div className="bg-white rounded-[10px] border border-dashed border-gray-300 shadow-sm p-6 text-center">
          <div className="text-[0.85rem] font-semibold text-slate-400">
            Weekly Trend · Customer Breakdown · Work Order Table
          </div>
          <div className="text-[0.75rem] text-slate-300 mt-1">
            Coming with cache layer — requires detail endpoint data
          </div>
        </div>
      </div>
    </>
  );
}
