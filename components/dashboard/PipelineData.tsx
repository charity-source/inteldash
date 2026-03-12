"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// -- Types ------------------------------------------------------------------
type PanelType = "deal" | null;

interface FunnelStage {
  label: string;
  color: string;
  deals: number;
  value: number;
  probability: number;
}

interface WinLossWeek {
  label: string;
  won: number;
  lost: number;
  isLast: boolean;
}

interface VelocityStage {
  label: string;
  avgDays: number;
}

interface Deal {
  id: string;
  client: string;
  description: string;
  stage: string;
  stageColor: string;
  value: number;
  daysInStage: number;
  assignedTo: string;
}

interface PipelineDataSet {
  kpis: {
    pipelineValue: number;
    pipelineChange: number;
    activeDeals: number;
    activeDealsChange: number;
    forecastedRevenue: number;
    forecastedChange: number;
    winRate: number;
    winRateChange: number;
    avgDealSize: number;
    avgDealChange: number;
  };
  funnel: FunnelStage[];
  winLoss: WinLossWeek[];
  velocity: VelocityStage[];
  deals: Deal[];
}

// -- Helpers ----------------------------------------------------------------
function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function fmtDollar(v: number, compact?: boolean): string {
  if (compact && Math.abs(v) >= 1_000_000) {
    return "$" + (v / 1_000_000).toFixed(1) + "M";
  }
  const abs = Math.abs(v);
  const s = "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v < 0 ? "-" + s : s;
}

// -- Constants --------------------------------------------------------------
const FUNNEL_STAGES: { label: string; color: string; probability: number }[] = [
  { label: "Lead", color: "#c4b5fd", probability: 0.1 },
  { label: "Qualified", color: "#a78bfa", probability: 0.25 },
  { label: "Proposal", color: "#8b5cf6", probability: 0.5 },
  { label: "Negotiation", color: "#7c3aed", probability: 0.7 },
  { label: "Approved", color: "#6d28d9", probability: 0.9 },
  { label: "Scheduled", color: "#5b21b6", probability: 0.95 },
];

const VELOCITY_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Approved"];

const DEAL_TEMPLATES: { client: string; description: string; assignedTo: string }[] = [
  { client: "Westfield Corp", description: "Westfield Commercial Fit-out", assignedTo: "James M." },
  { client: "BridgePoint Homes", description: "44 Bridge Rd Residential", assignedTo: "Sarah K." },
  { client: "Harbour Tower Pty Ltd", description: "Harbour Tower L12", assignedTo: "Daniel R." },
  { client: "Metro Health Group", description: "Metro Clinic HVAC Overhaul", assignedTo: "James M." },
  { client: "Greenfield Estates", description: "Greenfield 3-Unit Renovation", assignedTo: "Liam T." },
  { client: "UrbanEdge Developments", description: "UrbanEdge Office Refit", assignedTo: "Sarah K." },
  { client: "Coastal Living Co", description: "Coastal Penthouse Restoration", assignedTo: "Daniel R." },
  { client: "Summit Retail Group", description: "Summit Mall Shopfront Rebuild", assignedTo: "Liam T." },
];

const STAGE_OPTIONS: { label: string; color: string }[] = [
  { label: "Lead", color: "#c4b5fd" },
  { label: "Qualified", color: "#a78bfa" },
  { label: "Proposal", color: "#8b5cf6" },
  { label: "Negotiation", color: "#7c3aed" },
  { label: "Approved", color: "#6d28d9" },
  { label: "Scheduled", color: "#5b21b6" },
];

// -- Data Generation --------------------------------------------------------
function generateData(): PipelineDataSet {
  const pipelineValue = rand(450000, 800000);
  const activeDeals = rand(15, 35);
  const winRate = rand(55, 80);
  const avgDealSize = rand(15000, 35000);

  // Funnel stages - decreasing deal counts
  let remaining = activeDeals + rand(10, 20);
  const funnel: FunnelStage[] = FUNNEL_STAGES.map((s, i) => {
    const deals = i === 0 ? remaining : Math.max(1, Math.round(remaining * (0.55 + Math.random() * 0.2)));
    remaining = deals;
    const value = deals * rand(12000, 40000);
    return { label: s.label, color: s.color, deals, value, probability: s.probability };
  });

  // Forecasted revenue = sum of (stage value * probability)
  const forecastedRevenue = Math.round(
    funnel.reduce((sum, s) => sum + s.value * s.probability, 0)
  );

  // Win/Loss trend - 12 weeks
  const winLoss: WinLossWeek[] = Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    won: rand(2, 10),
    lost: rand(1, 6),
    isLast: i === 11,
  }));

  // Velocity per stage
  const velocity: VelocityStage[] = VELOCITY_STAGES.map((label) => ({
    label,
    avgDays: rand(2, 12),
  }));

  // Active deals table
  const deals: Deal[] = DEAL_TEMPLATES.map((t, i) => {
    const stageIdx = rand(0, STAGE_OPTIONS.length - 1);
    const stage = STAGE_OPTIONS[stageIdx];
    return {
      id: `PL-${String(2600 + i).padStart(4, "0")}`,
      client: t.client,
      description: t.description,
      stage: stage.label,
      stageColor: stage.color,
      value: rand(15000, 120000),
      daysInStage: rand(1, 14),
      assignedTo: t.assignedTo,
    };
  });

  return {
    kpis: {
      pipelineValue,
      pipelineChange: rand(3, 18),
      activeDeals,
      activeDealsChange: rand(-5, 12),
      forecastedRevenue,
      forecastedChange: rand(2, 15),
      winRate,
      winRateChange: rand(-3, 8),
      avgDealSize,
      avgDealChange: rand(-4, 10),
    },
    funnel,
    winLoss,
    velocity,
    deals,
  };
}

// -- SVG Win/Loss Chart -----------------------------------------------------
function WinLossChart({ data }: { data: WinLossWeek[] }) {
  const maxVal = 15;
  const chartH = 160;
  const chartTop = 20;
  const chartLeft = 36;
  const chartRight = 650;
  const gap = (chartRight - chartLeft) / data.length;
  const barW = 20;

  const gridLines = [0, 5, 10, 15].map((v) => ({
    y: chartTop + chartH - (v / maxVal) * chartH,
    label: String(v),
  }));

  return (
    <svg viewBox="0 0 680 230" className="w-full h-auto">
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={chartLeft}
            y1={g.y}
            x2={chartRight}
            y2={g.y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray={i > 0 ? "4" : undefined}
          />
          <text x={chartLeft - 6} y={g.y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
            {g.label}
          </text>
        </g>
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const x = chartLeft + i * gap + gap / 2 - barW / 2;
        const wonH = (d.won / maxVal) * chartH;
        const lostH = (d.lost / maxVal) * chartH;
        const wonY = chartTop + chartH - wonH;
        const lostY = wonY - lostH;
        const bw = d.isLast ? barW + 2 : barW;
        const xAdj = d.isLast ? x - 1 : x;
        return (
          <g key={d.label}>
            {/* Won (green, bottom) */}
            <rect
              x={xAdj}
              y={wonY}
              width={bw}
              height={wonH}
              rx="3"
              fill={d.isLast ? "#16a34a" : "#22c55e"}
              opacity={d.isLast ? 1 : 0.85}
            />
            {/* Lost (red, stacked on top) */}
            <rect
              x={xAdj}
              y={lostY}
              width={bw}
              height={lostH}
              rx="3"
              fill={d.isLast ? "#dc2626" : "#ef4444"}
              opacity={d.isLast ? 1 : 0.7}
            />
            {/* Label */}
            <text
              x={xAdj + bw / 2}
              y={chartTop + chartH + 18}
              textAnchor="middle"
              fill={d.isLast ? "#7c3aed" : "#94a3b8"}
              fontSize="10"
              fontWeight={d.isLast ? "700" : "600"}
            >
              {d.label}
            </text>
            {d.isLast && (
              <circle cx={xAdj + bw / 2} cy={chartTop + chartH + 26} r="2.5" fill="#7c3aed" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// -- Icons (inline SVG) -----------------------------------------------------
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
function ForecastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14L6 8L9 11L14 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WinRateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// -- Main Component ---------------------------------------------------------
export default function PipelineData({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [data, setData] = useState<PipelineDataSet | null>(null);
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

  const openDeal = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setPanel("deal");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedDeal(null);
  }, []);

  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  if (!isActive) return null;

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  const d = data;

  // Check for velocity alerts
  const hasVelocityAlert = d.velocity.some((v) => v.avgDays > 7);

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
          <h2 className="text-xl font-bold text-slate-800">Pipeline Data</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.15)", color: "#7c3aed" }}
          >
            Mock Data
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            className={cardFlash}
            borderColor="#7c3aed"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            icon={<PipelineIcon />}
            label="Pipeline Value"
            value={fmtDollar(d.kpis.pipelineValue)}
            change={d.kpis.pipelineChange}
            changeUp={d.kpis.pipelineChange >= 0}
            sub="Total open pipeline"
          />
          <MetricCard
            className={cardFlash}
            borderColor="#3b82f6"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={<DealsIcon />}
            label="Active Deals"
            value={String(d.kpis.activeDeals)}
            change={Math.abs(d.kpis.activeDealsChange)}
            changeUp={d.kpis.activeDealsChange >= 0}
            sub="Currently in pipeline"
          />
          <MetricCard
            className={cardFlash}
            borderColor="#10b981"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            icon={<ForecastIcon />}
            label="Forecasted Revenue"
            value={fmtDollar(d.kpis.forecastedRevenue)}
            change={d.kpis.forecastedChange}
            changeUp={d.kpis.forecastedChange >= 0}
            sub="Weighted by stage"
          />
          <MetricCard
            className={cardFlash}
            borderColor="#f59e0b"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            icon={<WinRateIcon />}
            label="Win Rate"
            value={d.kpis.winRate + "%"}
            change={Math.abs(d.kpis.winRateChange)}
            changeUp={d.kpis.winRateChange >= 0}
            sub="Last 90 days"
          />
          <MetricCard
            className={cardFlash}
            borderColor="#8b5cf6"
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            icon={<AvgDealIcon />}
            label="Avg Deal Size"
            value={fmtDollar(d.kpis.avgDealSize)}
            change={Math.abs(d.kpis.avgDealChange)}
            changeUp={d.kpis.avgDealChange >= 0}
            sub="Across all stages"
          />
        </div>

        {/* FUNNEL + WIN/LOSS ROW */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Pipeline Funnel */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Pipeline Funnel</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">
                {d.funnel.reduce((s, f) => s + f.deals, 0)} total opportunities
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {d.funnel.map((stage, i) => {
                const maxValue = d.funnel[0].value;
                const barPct = Math.max(8, (stage.value / maxValue) * 100);
                const prevStage = i > 0 ? d.funnel[i - 1] : null;
                const conversionPct = prevStage
                  ? Math.round((stage.deals / prevStage.deals) * 100)
                  : null;
                return (
                  <div key={stage.label}>
                    {/* Conversion indicator between stages */}
                    {conversionPct !== null && (
                      <div className="flex items-center gap-1.5 ml-2 mb-1">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 2V8M3 6L5 8L7 6" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[0.68rem] font-semibold text-slate-400">
                          {conversionPct}% conversion
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-[80px] text-[0.8rem] font-semibold text-slate-700 shrink-0">
                        {stage.label}
                      </div>
                      <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-300"
                          style={{ width: barPct + "%", background: stage.color }}
                        />
                      </div>
                      <div className="w-[50px] text-right text-[0.78rem] font-bold text-slate-700 shrink-0">
                        {stage.deals} deals
                      </div>
                      <div className="w-[80px] text-right text-[0.78rem] font-semibold text-slate-500 shrink-0">
                        {fmtDollar(stage.value)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Win/Loss Trend */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Win / Loss Trend</div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Won
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Lost
                </span>
              </div>
            </div>
            <WinLossChart data={d.winLoss} />
          </div>
        </div>

        {/* DEAL VELOCITY */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[0.92rem] font-bold text-slate-800">Deal Velocity</div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> &lt;5 days
              </span>
              <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> 5-7 days
              </span>
              <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> &gt;7 days
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {d.velocity.map((v) => {
              const maxDays = 14;
              const barPct = Math.min(100, (v.avgDays / maxDays) * 100);
              const color = v.avgDays < 5 ? "#10b981" : v.avgDays <= 7 ? "#f59e0b" : "#ef4444";
              return (
                <div key={v.label} className="flex items-center gap-3">
                  <div className="w-[90px] text-[0.82rem] font-semibold text-slate-700 shrink-0">
                    {v.label}
                  </div>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: barPct + "%", background: color }}
                    />
                  </div>
                  <div className="w-[70px] text-right text-[0.82rem] font-bold shrink-0" style={{ color }}>
                    {v.avgDays} days
                  </div>
                </div>
              );
            })}
          </div>
          {hasVelocityAlert && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M8 1L15 14H1L8 1Z" stroke="#dc2626" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 6V9M8 11V11.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[0.82rem] font-semibold text-red-700">
                Velocity alert: {d.velocity.filter((v) => v.avgDays > 7).length} stage(s) exceeding 7-day threshold. Review stalled deals to improve flow.
              </span>
            </div>
          )}
        </div>

        {/* ACTIVE DEALS TABLE */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="text-[0.92rem] font-bold text-slate-800">Active Deals</div>
            <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Showing {d.deals.length} of {d.kpis.activeDeals}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 850 }}>
              <thead>
                <tr>
                  {["Deal ID", "Client", "Description", "Stage", "Value", "Days in Stage", "Assigned To"].map((h) => (
                    <th
                      key={h}
                      className="text-[0.73rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2.5 bg-slate-50 border-b border-gray-200"
                      style={h === "Value" || h === "Days in Stage" ? { textAlign: "right" } : undefined}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.deals.map((deal, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => openDeal(deal)}
                  >
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-mono text-slate-500">
                      {deal.id}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-slate-800">
                      {deal.client}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-purple-600">
                      {deal.description}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span
                        className="text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl text-white"
                        style={{ background: deal.stageColor }}
                      >
                        {deal.stage}
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                      {fmtDollar(deal.value)}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right">
                      <span
                        className={`font-bold ${
                          deal.daysInStage > 7
                            ? "text-red-600"
                            : deal.daysInStage > 5
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {deal.daysInStage}d
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-500">
                      {deal.assignedTo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* -- SCRIM -- */}
      <div
        className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
          panel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(15,23,42,0.5)" }}
        onClick={closePanel}
      />

      {/* -- DEAL PANEL -- */}
      <SlidePanel open={panel === "deal"} onClose={closePanel} title="Deal Detail" titleColor="#7c3aed">
        {selectedDeal && (
          <>
            <PanelStatRow>
              <PanelStat label="Deal Value" value={fmtDollar(selectedDeal.value)} />
              <PanelStat label="Days in Stage" value={selectedDeal.daysInStage + " days"} small />
            </PanelStatRow>
            <PanelSectionTitle>Details</PanelSectionTitle>
            <PanelListItem label="Deal ID" value={selectedDeal.id} />
            <PanelListItem label="Client" value={selectedDeal.client} />
            <PanelListItem label="Description" value={selectedDeal.description} />
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Stage</span>
              <span
                className="text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl text-white"
                style={{ background: selectedDeal.stageColor }}
              >
                {selectedDeal.stage}
              </span>
            </div>
            <PanelListItem label="Assigned To" value={selectedDeal.assignedTo} />
            <PanelListItem label="Value" value={fmtDollar(selectedDeal.value)} />
            <PanelSectionTitle className="mt-5">Stage History</PanelSectionTitle>
            <PanelListItem label="Lead" value="Day 1-3" />
            <PanelListItem label="Qualified" value="Day 3-6" />
            {["Proposal", "Negotiation", "Approved", "Scheduled"].indexOf(selectedDeal.stage) >= 0 && (
              <PanelListItem label={selectedDeal.stage} value={`Day 6-${6 + selectedDeal.daysInStage} (current)`} />
            )}
            <PanelActions primary="View Full Deal" secondary="Export PDF" />
          </>
        )}
      </SlidePanel>
    </>
  );
}

// -- Sub-components ---------------------------------------------------------

function MetricCard({
  borderColor,
  iconBg,
  iconColor,
  icon,
  label,
  value,
  change,
  changeUp,
  sub,
  className,
}: {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number;
  changeUp: boolean;
  sub: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm
        transition-all hover:shadow-lg hover:-translate-y-0.5 ${className ?? ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <span
          className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
            changeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          {changeUp ? "\u25B2" : "\u25BC"} {change.toFixed(1)}%
        </span>
      </div>
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">{sub}</div>
    </div>
  );
}

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
        <div className="text-base font-bold" style={titleColor ? { color: titleColor } : undefined}>{title}</div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-slate-500 text-lg hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function PanelStatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 mb-5">{children}</div>;
}

function PanelStat({
  label,
  value,
  small,
  valueColor,
}: {
  label: string;
  value: string;
  small?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 bg-gray-100 rounded-lg p-3.5">
      <div className="text-[0.78rem] text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div
        className={`font-extrabold text-slate-800 ${small ? "text-base" : "text-[1.15rem]"}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
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

function PanelListItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}

function PanelActions({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="mt-4">
      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors mr-2">
        {primary}
      </button>
      {secondary && (
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-transparent text-slate-500 border border-gray-200 hover:text-purple-600 hover:border-purple-600 transition-colors">
          {secondary}
        </button>
      )}
    </div>
  );
}
