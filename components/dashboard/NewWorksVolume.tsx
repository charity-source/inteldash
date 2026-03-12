"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────
type PanelType = "workorder" | null;

interface WorkOrder {
  id: string;
  date: string;
  type: string;
  description: string;
  value: number;
  source: string;
  status: string;
  address: string;
  clientName: string;
  contactPhone: string;
  assignedTech: string;
  notes: string;
}

interface WeekBar {
  label: string;
  count: number;
  isLast: boolean;
}

interface CategorySlice {
  label: string;
  color: string;
  count: number;
}

interface SourceItem {
  label: string;
  color: string;
  count: number;
  pct: number;
}

interface KPICard {
  label: string;
  count: number;
  value: number;
  change: number;
  sub: string;
}

interface NewWorksData {
  kpis: KPICard[];
  avgWorkValue: number;
  weeklyTrend: WeekBar[];
  categories: CategorySlice[];
  sources: SourceItem[];
  workOrders: WorkOrder[];
}

// ── Helpers ─────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function fmtDollar(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return "$" + (v / 1_000_000).toFixed(1) + "M";
  }
  if (Math.abs(v) >= 1_000) {
    return "$" + (v / 1_000).toFixed(1) + "K";
  }
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDollarFull(v: number): string {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ── Mock Data Constants ─────────────────────────────────────────────────
const WORK_TYPES = ["Commercial", "Residential", "Maintenance", "Emergency"];

const WORK_DESCRIPTIONS: { desc: string; addr: string; type: string; client: string }[] = [
  { desc: "Water damage restoration", addr: "15 Kent St", type: "Commercial", client: "Westfield Management" },
  { desc: "Fire damage assessment", addr: "Unit 4/22 Collins Ave", type: "Residential", client: "Sarah Mitchell" },
  { desc: "Mould remediation", addr: "8 Park Rd", type: "Residential", client: "James O'Brien" },
  { desc: "Storm damage repair", addr: "Level 3, 90 Queen St", type: "Commercial", client: "CBD Holdings Pty Ltd" },
  { desc: "Flood cleanup & drying", addr: "42 Riverside Dve", type: "Emergency", client: "Michael Chen" },
  { desc: "Ceiling leak investigation", addr: "Unit 12/5 Harbour View", type: "Maintenance", client: "Harbour Body Corp" },
  { desc: "Smoke damage cleaning", addr: "17 Greenfield Cres", type: "Residential", client: "Emma Watson" },
  { desc: "Structural drying program", addr: "200 George St, L8", type: "Commercial", client: "AMP Capital" },
  { desc: "Emergency water extraction", addr: "3/88 Victoria Pde", type: "Emergency", client: "David Park" },
  { desc: "Asbestos inspection & report", addr: "44 Bridge Rd", type: "Maintenance", client: "Bridge Rd Strata" },
];

const TECHNICIANS = ["Tom Barrett", "Leah Nguyen", "Chris Holt", "Priya Sharma", "Jake Wilson"];
const SOURCES = ["Direct", "Referral", "Repeat Client", "Online"];
const STATUSES = ["New", "In Progress", "Scheduled", "Completed"];

function generateData(): NewWorksData {
  // KPI cards
  const todayCount = rand(2, 8);
  const todayValue = rand(5000, 25000);
  const weekCount = rand(12, 30);
  const weekValue = rand(35000, 95000);
  const monthCount = rand(45, 120);
  const monthValue = rand(130000, 380000);
  const ytdCount = rand(400, 900);
  const ytdValue = rand(1200000, 2800000);

  const kpis: KPICard[] = [
    { label: "Today", count: todayCount, value: todayValue, change: rand(-15, 25), sub: "vs yesterday" },
    { label: "This Week", count: weekCount, value: weekValue, change: rand(-10, 20), sub: "vs last week" },
    { label: "This Month", count: monthCount, value: monthValue, change: rand(-8, 18), sub: "vs last month" },
    { label: "Year to Date", count: ytdCount, value: ytdValue, change: rand(-5, 15), sub: "vs last year" },
  ];

  const avgWorkValue = rand(2800, 8500);

  // Weekly trend — 12 weeks
  const weeklyTrend: WeekBar[] = Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    count: rand(8, 35),
    isLast: i === 11,
  }));

  // Category breakdown
  const commCount = rand(20, 45);
  const resiCount = rand(15, 35);
  const maintCount = rand(10, 25);
  const emerCount = rand(5, 15);
  const categories: CategorySlice[] = [
    { label: "Commercial", color: "#3b82f6", count: commCount },
    { label: "Residential", color: "#10b981", count: resiCount },
    { label: "Maintenance", color: "#f59e0b", count: maintCount },
    { label: "Emergency", color: "#ef4444", count: emerCount },
  ];

  // Source breakdown
  const directPct = rand(40, 50);
  const referralPct = rand(20, 30);
  const repeatPct = rand(15, 25);
  const onlinePct = 100 - directPct - referralPct - repeatPct;
  const totalForSource = monthCount;
  const sourceColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
  const sourcePcts = [directPct, referralPct, repeatPct, onlinePct];
  const sources: SourceItem[] = SOURCES.map((s, i) => ({
    label: s,
    color: sourceColors[i],
    count: Math.round((sourcePcts[i] / 100) * totalForSource),
    pct: sourcePcts[i],
  }));

  // Work orders — 10 rows
  const today = new Date();
  const workOrders: WorkOrder[] = WORK_DESCRIPTIONS.map((wo, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - rand(0, 14));
    return {
      id: `WO-${rand(1000, 9999)}`,
      date: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
      type: wo.type,
      description: `${wo.desc} — ${wo.addr}`,
      value: rand(800, 18000),
      source: SOURCES[rand(0, 3)],
      status: STATUSES[rand(0, 3)],
      address: wo.addr,
      clientName: wo.client,
      contactPhone: `04${rand(10, 99)} ${rand(100, 999)} ${rand(100, 999)}`,
      assignedTech: TECHNICIANS[rand(0, 4)],
      notes: `Scope confirmed. ${wo.type === "Emergency" ? "Priority dispatch required." : "Standard scheduling applies."}`,
    };
  });

  return { kpis, avgWorkValue, weeklyTrend, categories, sources, workOrders };
}

// ── SVG Bar Chart — Weekly Volume Trend ─────────────────────────────────
function WeeklyVolumeChart({ data }: { data: WeekBar[] }) {
  const maxVal = Math.max(...data.map((d) => d.count));
  const ceil = Math.ceil(maxVal / 5) * 5;
  const chartH = 180;
  const chartTop = 30;
  const chartLeft = 42;
  const chartRight = 660;
  const gap = (chartRight - chartLeft) / data.length;
  const barW = gap * 0.55;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: chartTop + chartH * (1 - f),
    label: String(Math.round(ceil * f)),
  }));

  return (
    <svg viewBox="0 0 680 250" className="w-full h-auto">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={chartLeft}
            y1={g.y}
            x2={chartRight}
            y2={g.y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray={i < gridLines.length - 1 ? "4" : undefined}
          />
          <text x={chartLeft - 8} y={g.y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
            {g.label}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = chartLeft + i * gap + (gap - barW) / 2;
        const h = (d.count / ceil) * chartH;
        const y = chartTop + chartH - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="4"
              fill={d.isLast ? "#0d9488" : "#14b8a6"}
              opacity={d.isLast ? 1 : 0.75}
            />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontWeight="700"
            >
              {d.count}
            </text>
            <text
              x={x + barW / 2}
              y={chartTop + chartH + 20}
              textAnchor="middle"
              fill={d.isLast ? "#0d9488" : "#94a3b8"}
              fontSize="10"
              fontWeight={d.isLast ? "700" : "600"}
            >
              {d.label}
            </text>
            {d.isLast && (
              <circle cx={x + barW / 2} cy={chartTop + chartH + 28} r="2.5" fill="#0d9488" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Donut Chart — Category Breakdown ────────────────────────────────
function CategoryDonutChart({ data }: { data: CategorySlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const cx = 100;
  const cy = 100;
  const r = 70;
  const innerR = 48;

  // Build arc paths
  let startAngle = -90;
  const arcs = data.map((slice) => {
    const pct = slice.count / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const rad1 = (startAngle * Math.PI) / 180;
    const rad2 = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(rad1);
    const y1 = cy + r * Math.sin(rad1);
    const x2 = cx + r * Math.cos(rad2);
    const y2 = cy + r * Math.sin(rad2);

    const ix1 = cx + innerR * Math.cos(rad2);
    const iy1 = cy + innerR * Math.sin(rad2);
    const ix2 = cx + innerR * Math.cos(rad1);
    const iy2 = cy + innerR * Math.sin(rad1);

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
      <svg viewBox="0 0 200 200" className="w-48 h-48">
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
        {data.map((slice) => {
          const pct = total > 0 ? ((slice.count / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={slice.label} className="flex items-center gap-1.5 text-[0.82rem]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: slice.color }} />
              <span className="font-semibold text-slate-700">{slice.label}</span>
              <span className="text-slate-400 font-medium">{slice.count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status & Type Badge Colors ──────────────────────────────────────────
function statusBadge(status: string) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-600";
    case "In Progress":
      return "bg-amber-50 text-amber-600";
    case "Scheduled":
      return "bg-purple-50 text-purple-600";
    case "Completed":
      return "bg-emerald-50 text-emerald-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "Commercial":
      return "bg-blue-50 text-blue-600";
    case "Residential":
      return "bg-emerald-50 text-emerald-600";
    case "Maintenance":
      return "bg-amber-50 text-amber-600";
    case "Emergency":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

// ── Main Component ──────────────────────────────────────────────────────
export default function NewWorksVolume({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [data, setData] = useState<NewWorksData | null>(null);
  const [flash, setFlash] = useState(false);

  // Generate data client-side only (avoids hydration mismatch from Math.random)
  useEffect(() => {
    setData(generateData());
  }, []);

  // Regenerate on refreshTrigger change
  useEffect(() => {
    if (!isActive) return;
    setData(generateData());
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, isActive]);

  const openWorkOrder = useCallback((wo: WorkOrder) => {
    setSelectedWO(wo);
    setPanel("workorder");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedWO(null);
  }, []);

  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  if (!isActive) return null;

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const d = data;

  return (
    <>
      <style>{`
        @keyframes cardFlash {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* COMPONENT HEADER */}
      <div className="flex items-center justify-between bg-white px-5 py-4 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <h2 className="text-xl font-bold text-slate-800">New Works Volume</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(0,170,200,0.08)", borderColor: "rgba(0,170,200,0.15)", color: "#0891b2" }}
          >
            Mock Data
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS — 4 + 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {d.kpis.map((kpi) => {
            const isUp = kpi.change >= 0;
            return (
              <div
                key={kpi.label}
                className={`group relative bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm
                  transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
                style={{ borderLeft: "4px solid #0d9488" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
                    {kpi.label}
                  </span>
                  <span
                    className={`text-[0.72rem] font-semibold px-2 py-0.5 rounded-xl ${
                      isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {isUp ? "\u25B2" : "\u25BC"} {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                </div>
                <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{kpi.count}</div>
                <div className="text-[0.92rem] font-bold text-teal-600 mt-1">{fmtDollar(kpi.value)}</div>
                <div className="text-[0.78rem] text-slate-400 mt-1 font-medium">{kpi.sub}</div>
              </div>
            );
          })}

          {/* Average Work Value card */}
          <div
            className={`group relative bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm
              transition-all hover:shadow-lg hover:-translate-y-0.5 ${cardFlash}`}
            style={{ borderLeft: "4px solid #8b5cf6" }}
          >
            <span className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide">
              Avg Work Value
            </span>
            <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none mt-2">
              {fmtDollar(d.avgWorkValue)}
            </div>
            <div className="text-[0.78rem] text-slate-400 mt-1.5 font-medium">Per work order</div>
          </div>
        </div>

        {/* CHARTS ROW — Weekly Trend + Category Donut */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Weekly Volume Trend */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.6] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Weekly Volume Trend</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">Last 12 Weeks</span>
            </div>
            <WeeklyVolumeChart data={d.weeklyTrend} />
          </div>

          {/* Category Breakdown Donut */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Category Breakdown</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">This Month</span>
            </div>
            <CategoryDonutChart data={d.categories} />
          </div>
        </div>

        {/* SOURCE BREAKDOWN */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
          <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Source Breakdown</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {d.sources.map((src) => (
              <div key={src.label} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.85rem] font-semibold text-slate-700">{src.label}</span>
                  <span className="text-[0.82rem] font-bold text-slate-800">{src.count}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: src.pct + "%", background: src.color }}
                  />
                </div>
                <div className="text-[0.75rem] font-semibold text-right" style={{ color: src.color }}>
                  {src.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT WORK ORDERS TABLE */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="text-[0.92rem] font-bold text-slate-800">Recent Work Orders</div>
            <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Showing {d.workOrders.length} of {d.kpis[2].count}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  {["Work Order", "Date", "Type", "Description", "Value", "Source", "Status"].map((h) => (
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
                {d.workOrders.map((wo, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => openWorkOrder(wo)}
                  >
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-bold text-teal-600">
                      {wo.id}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-500">
                      {wo.date}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${typeBadge(wo.type)}`}>
                        {wo.type}
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-slate-700 max-w-[260px] truncate">
                      {wo.description}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                      {fmtDollarFull(wo.value)}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span className="text-[0.72rem] font-semibold text-slate-500 bg-gray-100 px-2 py-0.5 rounded">
                        {wo.source}
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${statusBadge(wo.status)}`}>
                        {wo.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SCRIM ── */}
      <div
        className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
          panel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(15,23,42,0.5)" }}
        onClick={closePanel}
      />

      {/* ── WORK ORDER DETAIL PANEL ── */}
      <SlidePanel open={panel === "workorder"} onClose={closePanel} title="Work Order Detail" titleColor="#0d9488">
        {selectedWO && (
          <>
            <PanelStatRow>
              <PanelStat label="Work Order" value={selectedWO.id} />
              <PanelStat label="Value" value={fmtDollarFull(selectedWO.value)} />
            </PanelStatRow>

            <div className="flex gap-2 mb-5">
              <span className={`text-[0.78rem] font-semibold px-3 py-1 rounded-xl ${typeBadge(selectedWO.type)}`}>
                {selectedWO.type}
              </span>
              <span className={`text-[0.78rem] font-semibold px-3 py-1 rounded-xl ${statusBadge(selectedWO.status)}`}>
                {selectedWO.status}
              </span>
            </div>

            <PanelSectionTitle>Details</PanelSectionTitle>
            <PanelListItem label="Description" value={selectedWO.description} />
            <PanelListItem label="Date Created" value={selectedWO.date} />
            <PanelListItem label="Address" value={selectedWO.address} />
            <PanelListItem label="Source" value={selectedWO.source} />

            <PanelSectionTitle className="mt-5">Client Information</PanelSectionTitle>
            <PanelListItem label="Client Name" value={selectedWO.clientName} />
            <PanelListItem label="Contact" value={selectedWO.contactPhone} />

            <PanelSectionTitle className="mt-5">Assignment</PanelSectionTitle>
            <PanelListItem label="Assigned Technician" value={selectedWO.assignedTech} />

            <PanelSectionTitle className="mt-5">Notes</PanelSectionTitle>
            <div className="text-[0.88rem] text-slate-600 bg-gray-50 rounded-lg p-3.5 mt-1">
              {selectedWO.notes}
            </div>

            <PanelActions primary="Open in Job System" secondary="Print Work Order" />
          </>
        )}
      </SlidePanel>
    </>
  );
}

// ── Sub-components (inline, matching Finance pattern) ───────────────────

function SlidePanel({
  open,
  onClose,
  title,
  titleColor,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed top-0 bottom-0 w-[500px] max-w-[92vw] bg-white border-l border-gray-200 z-[210] flex flex-col transition-all duration-[350ms]"
      style={{
        right: open ? 0 : -520,
        boxShadow: open ? "-4px 0 20px rgba(0,0,0,0.15)" : "none",
        transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div className="text-base font-bold" style={titleColor ? { color: titleColor } : undefined}>
          {title}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-slate-500 text-lg hover:bg-gray-200 transition-colors"
        >
          &#x2715;
        </button>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function PanelStatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 mb-5">{children}</div>;
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-lg p-3.5">
      <div className="text-[0.78rem] text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.15rem] font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

function PanelSectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide mb-2.5 mt-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function PanelListItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function PanelActions({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="mt-5">
      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors mr-2">
        {primary}
      </button>
      {secondary && (
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-transparent text-slate-500 border border-gray-200 hover:text-teal-600 hover:border-teal-600 transition-colors">
          {secondary}
        </button>
      )}
    </div>
  );
}
