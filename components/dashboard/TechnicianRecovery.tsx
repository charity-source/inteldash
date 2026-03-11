"use client";

import { DashboardComponentProps } from "@/types";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface TechRates {
  [key: string]: number | null;
}

interface SummaryWeek {
  weekEnding: string;
  groupRate: number | null;
  technicians: TechRates;
}

interface WeeklyTech {
  name: string;
  actual: number;
  costed: number;
  recovery: number | null;
}

interface WeeklyDetail {
  tabName: string;
  technicians: WeeklyTech[];
  group: { actual: number; costed: number; recovery: number | null } | null;
}

interface TechData {
  summary: SummaryWeek[];
  weeklyDetails: WeeklyDetail[];
  lastUpdated: string | null;
  weekCount: number;
  tabsLoaded: number;
}

/* ── Constants ─────────────────────────────────────────── */

const TECHS = ["Roja", "Vishwa", "Wenxiao", "Louise", "Quoc"] as const;
const FULL_NAMES: Record<string, string> = {
  Roja: "Roja Prajapati",
  Vishwa: "Vishwa Nandan",
  Wenxiao: "Wenxiao Cai",
  Louise: "Louise Squires",
  Quoc: "Quoc Diep",
};

/* ── Helpers ───────────────────────────────────────────── */

function rateColor(r: number | null): string {
  if (r === null) return "#9ca3af";
  if (r >= 1.0) return "#16a34a";
  if (r >= 0.9) return "#d97706";
  return "#dc2626";
}

function rateBg(r: number | null): string {
  if (r === null) return "bg-gray-100 text-gray-500";
  if (r >= 1.0) return "bg-green-50 text-green-700";
  if (r >= 0.9) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function statusLabel(r: number | null): string {
  if (r === null || r === 0) return "Inactive";
  if (r >= 1.0) return "Above Target";
  if (r >= 0.9) return "Near Target";
  return "Below Target";
}

function fmtDollar(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(r: number | null): string {
  if (r === null) return "—";
  return (r * 100).toFixed(1) + "%";
}

/* ── Gauge SVG ─────────────────────────────────────────── */

function GaugeSVG({ rate }: { rate: number | null }) {
  const pct = rate !== null ? rate * 100 : 0;
  const color = rateColor(rate);
  const angle = Math.min(Math.max((pct / 150) * 180, 0), 180);
  const rad = ((angle - 180) * Math.PI) / 180;
  const cx = 70, cy = 65, r = 50;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const large = angle > 90 ? 1 : 0;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

  return (
    <svg width="100" height="65" viewBox="0 0 140 90">
      <path d={bgPath} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <text x="70" y="70" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
        {pct.toFixed(1)}%
      </text>
      <text x="70" y="85" textAnchor="middle" fontSize="9" fill="#9ca3af">
        Recovery
      </text>
    </svg>
  );
}

/* ── Bar Chart SVG ─────────────────────────────────────── */

function BarChartSVG({
  weekData,
  onSelect,
}: {
  weekData: SummaryWeek;
  onSelect: (name: string) => void;
}) {
  const active = TECHS.filter(
    (t) => weekData.technicians[t] !== null && weekData.technicians[t]! > 0
  );
  if (active.length === 0) {
    return <p className="py-5 text-center text-sm text-gray-400">No active technicians this week</p>;
  }

  const W = 1200, padL = 100, padR = 80, padT = 10, padB = 25;
  const barH = Math.min(20, 120 / active.length - 4);
  const maxRate = Math.max(1.5, ...active.map((t) => weekData.technicians[t] || 0));
  const chartW = W - padL - padR;
  const H = active.length * (barH + 5) + padT + padB + 10;

  const targetX = padL + (1.0 / maxRate) * chartW;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible" style={{ maxHeight: "120px" }}>
      {/* 100% target line */}
      <line
        x1={targetX} y1={padT} x2={targetX} y2={active.length * (barH + 5) + padT}
        stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,3"
      />
      <text
        x={targetX} y={active.length * (barH + 5) + padT + 14}
        textAnchor="middle" fontSize="10" fill="#9ca3af"
      >
        100%
      </text>

      {active.map((t, i) => {
        const rate = weekData.technicians[t]!;
        const pct = rate * 100;
        const barW = (rate / maxRate) * chartW;
        const yy = padT + i * (barH + 5);
        const color = rateColor(rate);

        return (
          <g key={t} onClick={() => onSelect(t)} className="cursor-pointer" style={{ opacity: 0.85 }}>
            <text x={padL - 8} y={yy + barH / 2 + 4} textAnchor="end" fontSize="11" fill="#374151">
              {t}
            </text>
            <rect x={padL} y={yy} width={Math.max(barW, 2)} height={barH} rx="3" fill={color}>
              <title>{FULL_NAMES[t]}: {pct.toFixed(1)}%</title>
            </rect>
            <text x={padL + barW + 8} y={yy + barH / 2 + 4} fontSize="10" fontWeight="600" fill={color}>
              {pct.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Trend Line Chart SVG ──────────────────────────────── */

function TrendChartSVG({
  summary,
  dataKey,
}: {
  summary: SummaryWeek[];
  dataKey: string; // 'groupRate' or tech short name
}) {
  const data = summary
    .map((w, i) => ({
      x: i,
      y: dataKey === "groupRate" ? w.groupRate : w.technicians?.[dataKey] ?? null,
      label: w.weekEnding,
    }))
    .filter((d) => d.y !== null) as { x: number; y: number; label: string }[];

  if (data.length < 2) {
    return <p className="py-5 text-center text-sm text-gray-400">Not enough data for trend</p>;
  }

  const W = 1200, H = 260, padL = 60, padR = 30, padT = 15, padB = 45;
  const minY = Math.min(0.7, ...data.map((d) => d.y));
  const maxY = Math.max(1.3, ...data.map((d) => d.y));
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const sx = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const sy = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * chartH;

  const gridLines: number[] = [];
  for (let v = Math.ceil(minY * 10) / 10; v <= maxY; v += 0.1) gridLines.push(v);

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(d.y).toFixed(1)}`).join("");

  const targetY = sy(1.0);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible" style={{ maxHeight: "180px" }}>
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padL - 6} y={sy(v) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* 100% target dashed */}
      <line
        x1={padL} y1={targetY} x2={W - padR} y2={targetY}
        stroke="#d97706" strokeWidth="1.5" strokeDasharray="6,4"
      />
      <text x={W - padR + 4} y={targetY + 3} fontSize="9" fill="#d97706">100%</text>

      {/* Line */}
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(i).toFixed(1)} cy={sy(d.y).toFixed(1)} r="3" fill="#2563eb">
          <title>{d.label}: {(d.y * 100).toFixed(1)}%</title>
        </circle>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) =>
        i % 4 === 0 || i === data.length - 1 ? (
          <text
            key={`lbl-${i}`}
            x={sx(i).toFixed(1)} y={H - 8}
            textAnchor="middle" fontSize="9" fill="#9ca3af"
            transform={`rotate(-30,${sx(i).toFixed(1)},${H - 8})`}
          >
            {d.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ── Summary Card ──────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="text-[0.6rem] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold" style={{ color: color || "#1f2937" }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[0.6rem] text-gray-400">{sub}</div>}
    </div>
  );
}

/* ── Detail Panel ──────────────────────────────────────── */

function DetailPanel({
  techName,
  weeklyDetails,
}: {
  techName: string;
  weeklyDetails: WeeklyDetail[];
}) {
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <h3 className="mb-2 text-xs font-semibold text-gray-900">
        {FULL_NAMES[techName]} — Weekly Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-[0.55rem] uppercase tracking-wide text-gray-400">
              <th className="px-2 py-2">Week</th>
              <th className="px-2 py-2">Actual</th>
              <th className="px-2 py-2">Costed</th>
              <th className="px-2 py-2">Recovery</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDetails.map((wd) => {
              const td = wd.technicians.find((d) =>
                d.name.toLowerCase().startsWith(techName.toLowerCase())
              );
              if (!td) return null;
              return (
                <tr key={wd.tabName} className="border-b border-gray-100">
                  <td className="px-2 py-2 text-gray-600">{wd.tabName}</td>
                  <td className="px-2 py-2">{fmtDollar(td.actual)}</td>
                  <td className="px-2 py-2">{fmtDollar(td.costed)}</td>
                  <td className="px-2 py-2 font-semibold" style={{ color: rateColor(td.recovery) }}>
                    {fmtPct(td.recovery)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function TechnicianRecovery({
  refreshTrigger,
  isActive,
}: DashboardComponentProps) {
  const [data, setData] = useState<TechData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/technician");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json: TechData = await res.json();
      if (!json.summary || json.summary.length === 0) {
        throw new Error("No data available from Google Sheets");
      }
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    fetchData();
  }, [refreshTrigger, isActive, fetchData]);

  // Auto-refresh every 65s
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchData, 65000);
    return () => clearInterval(interval);
  }, [isActive, fetchData]);

  /* ── Loading state ── */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-16">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Connecting to Google Sheets...</span>
      </div>
    );
  }

  /* ── Error state ── */
  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-red-700">Failed to load data</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  /* ── Derived data ── */
  const s = data.summary;
  const latest = s[s.length - 1];
  const latestDetail = data.weeklyDetails?.[0] ?? null;

  const activeTechs = TECHS.filter(
    (t) => latest.technicians[t] !== null && latest.technicians[t]! > 0
  );
  const groupRate = latest.groupRate;
  const totalActual = latestDetail?.group?.actual ?? 0;
  const totalCosted = latestDetail?.group?.costed ?? 0;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-gray-900">Technician Recovery</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[0.55rem] font-semibold text-green-600">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] text-gray-400">
            {data.lastUpdated
              ? "Updated: " + new Date(data.lastUpdated).toLocaleTimeString()
              : "—"}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-[0.6rem] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`inline h-3 w-3 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Top cards: Gauge + 4 summary cards ── */}
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <GaugeSVG rate={groupRate} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Total Actual Cost" value={fmtDollar(totalActual)} sub="Latest week payroll" />
          <SummaryCard label="Total Costed Revenue" value={fmtDollar(totalCosted)} sub="Latest week billed" />
          <SummaryCard
            label="Group Recovery"
            value={fmtPct(groupRate)}
            sub={latest.weekEnding}
            color={rateColor(groupRate)}
          />
          <SummaryCard
            label="Active Technicians"
            value={`${activeTechs.length} / ${TECHS.length}`}
            sub={activeTechs.join(", ")}
          />
        </div>
      </div>

      {/* ── Bar chart: latest week recovery per tech ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-gray-700">
          Recovery Rate by Technician — {latest.weekEnding}
        </h3>
        <div className="overflow-x-auto">
          <BarChartSVG weekData={latest} onSelect={setSelectedTech} />
        </div>
      </div>

      {/* ── Group trend ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-gray-700">Group Recovery Trend</h3>
        <div className="overflow-x-auto">
          <TrendChartSVG summary={s} dataKey="groupRate" />
        </div>
      </div>

      {/* ── Per-tech trend (shown when selected) ── */}
      {selectedTech && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {FULL_NAMES[selectedTech]} Recovery Trend
            </h3>
            <button
              onClick={() => setSelectedTech(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <TrendChartSVG summary={s} dataKey={selectedTech} />
          </div>
        </div>
      )}

      {/* ── Detail table ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-gray-700">Technician Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left text-[0.55rem] uppercase tracking-wide text-gray-400">
                <th className="px-2.5 py-1.5">Technician</th>
                <th className="px-2.5 py-1.5">Recovery %</th>
                <th className="px-2.5 py-1.5">Actual Cost</th>
                <th className="px-2.5 py-1.5">Costed Revenue</th>
                <th className="px-2.5 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {TECHS.map((t) => {
                const rate = latest.technicians[t];
                let actual = "—", costed = "—";
                if (latestDetail) {
                  const td = latestDetail.technicians.find((d) =>
                    d.name.toLowerCase().startsWith(t.toLowerCase())
                  );
                  if (td) {
                    actual = fmtDollar(td.actual);
                    costed = fmtDollar(td.costed);
                  }
                }
                return (
                  <tr
                    key={t}
                    onClick={() => setSelectedTech(t)}
                    className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      selectedTech === t ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-2.5 py-2 font-medium text-gray-900">{FULL_NAMES[t]}</td>
                    <td className="px-2.5 py-2 font-semibold" style={{ color: rateColor(rate) }}>
                      {fmtPct(rate)}
                    </td>
                    <td className="px-2.5 py-2 text-gray-600">{actual}</td>
                    <td className="px-2.5 py-2 text-gray-600">{costed}</td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold ${rateBg(rate)}`}>
                        {statusLabel(rate)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel for selected tech */}
        {selectedTech && data.weeklyDetails && data.weeklyDetails.length > 0 && (
          <DetailPanel techName={selectedTech} weeklyDetails={data.weeklyDetails} />
        )}
      </div>
    </div>
  );
}
