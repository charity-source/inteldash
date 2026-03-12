"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// -- Types ------------------------------------------------------------------
type TimePeriod = "Daily" | "Weekly" | "Monthly" | "YTD";
type PanelType = "invoiced" | "cost" | "profit" | "invoice" | null;

interface Invoice {
  number: string;
  date: string;
  client: string;
  description: string;
  invoiced: number;
  cost: number;
  margin: number;
  status: "Paid" | "Outstanding" | "Overdue";
}

interface CategoryMargin {
  label: string;
  margin: number;
  invoiced: number;
  cost: number;
}

interface MonthBar {
  label: string;
  invoiced: number;
  cost: number;
  margin: number;
  isCurrent: boolean;
}

interface MarginData {
  ytd: { invoiced: number; cost: number; grossProfit: number; margin: number };
  cards: {
    invoiced: number;
    invoicedChange: number;
    cost: number;
    costChange: number;
    grossProfit: number;
    profitChange: number;
    marginPct: number;
  };
  chart: MonthBar[];
  categories: CategoryMargin[];
  invoices: Invoice[];
  invoicePanel: {
    thisMonth: number;
    lastMonth: number;
    topClients: { label: string; value: number }[];
  };
  costPanel: {
    thisMonth: number;
    materials: number;
    labour: number;
    subcontractors: number;
    other: number;
  };
  profitPanel: {
    thisMonth: number;
    lastMonth: number;
    bestCategory: string;
    worstCategory: string;
  };
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

function fmtPct(v: number): string {
  return v.toFixed(1) + "%";
}

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

const CLIENTS = [
  "Westfield Corp",
  "Harbour Tower",
  "BridgePoint Homes",
  "Meridian Plaza",
  "Oakridge Estates",
  "Summit Retail Group",
  "Lakewood Residences",
  "Pinnacle Commercial",
];

const DESCRIPTIONS = [
  "Fire system upgrade - Level 3",
  "Emergency pipe repair",
  "Full bathroom renovation",
  "HVAC installation - Stage 2",
  "Water main replacement",
  "Commercial fit-out plumbing",
  "Residential maintenance contract",
  "Retrofit sprinkler system",
];

const CATEGORIES: { label: string; minMargin: number; maxMargin: number }[] = [
  { label: "Emergency", minMargin: 28, maxMargin: 42 },
  { label: "Maintenance", minMargin: 32, maxMargin: 45 },
  { label: "Residential", minMargin: 26, maxMargin: 38 },
  { label: "Commercial", minMargin: 30, maxMargin: 44 },
  { label: "Retrofit", minMargin: 24, maxMargin: 40 },
];

function generateData(): MarginData {
  const invoiced = rand(300000, 500000);
  const costRatio = (rand(55, 70)) / 100;
  const cost = Math.round(invoiced * costRatio);
  const grossProfit = invoiced - cost;
  const marginPct = Math.round((grossProfit / invoiced) * 1000) / 10;

  const ytdInvoiced = rand(2200000, 3500000);
  const ytdCostRatio = (rand(58, 67)) / 100;
  const ytdCost = Math.round(ytdInvoiced * ytdCostRatio);
  const ytdGrossProfit = ytdInvoiced - ytdCost;
  const ytdMargin = Math.round((ytdGrossProfit / ytdInvoiced) * 1000) / 10;

  // Chart data - 10 months
  const chart: MonthBar[] = MONTHS.map((label, i) => {
    const inv = rand(280000, 520000);
    const cr = (rand(55, 70)) / 100;
    const c = Math.round(inv * cr);
    const m = Math.round(((inv - c) / inv) * 1000) / 10;
    return { label, invoiced: inv, cost: c, margin: m, isCurrent: i === MONTHS.length - 1 };
  });
  chart[chart.length - 1].invoiced = invoiced;
  chart[chart.length - 1].cost = cost;
  chart[chart.length - 1].margin = marginPct;

  // Categories
  const categories: CategoryMargin[] = CATEGORIES.map((cat) => {
    const m = rand(cat.minMargin * 10, cat.maxMargin * 10) / 10;
    const catInv = rand(40000, 120000);
    const catCost = Math.round(catInv * (1 - m / 100));
    return { label: cat.label, margin: m, invoiced: catInv, cost: catCost };
  });

  // Invoices
  const today = new Date();
  const statuses: ("Paid" | "Outstanding" | "Overdue")[] = [
    "Paid", "Outstanding", "Paid", "Overdue", "Paid", "Outstanding", "Paid", "Outstanding",
  ];
  const invoices: Invoice[] = Array.from({ length: 8 }, (_, i) => {
    const inv = rand(8000, 85000);
    const cr2 = (rand(55, 72)) / 100;
    const c2 = Math.round(inv * cr2);
    const m2 = Math.round(((inv - c2) / inv) * 1000) / 10;
    const d = new Date(today);
    d.setDate(d.getDate() - rand(1, 28));
    return {
      number: `INV-${rand(2400, 2499)}`,
      date: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
      client: CLIENTS[i % CLIENTS.length],
      description: DESCRIPTIONS[i % DESCRIPTIONS.length],
      invoiced: inv,
      cost: c2,
      margin: m2,
      status: statuses[i],
    };
  });

  // Panels
  const materials = Math.round(cost * 0.35);
  const labour = Math.round(cost * 0.40);
  const subcontractors = Math.round(cost * 0.18);
  const other = cost - materials - labour - subcontractors;

  const sorted = [...categories].sort((a, b) => b.margin - a.margin);

  return {
    ytd: { invoiced: ytdInvoiced, cost: ytdCost, grossProfit: ytdGrossProfit, margin: ytdMargin },
    cards: {
      invoiced,
      invoicedChange: rand(3, 18),
      cost,
      costChange: rand(1, 12),
      grossProfit,
      profitChange: rand(5, 25),
      marginPct,
    },
    chart,
    categories,
    invoices,
    invoicePanel: {
      thisMonth: invoiced,
      lastMonth: rand(280000, 460000),
      topClients: [
        { label: "Westfield Corp", value: rand(60000, 140000) },
        { label: "Harbour Tower", value: rand(50000, 110000) },
        { label: "BridgePoint Homes", value: rand(30000, 70000) },
        { label: "Meridian Plaza", value: rand(20000, 60000) },
      ],
    },
    costPanel: {
      thisMonth: cost,
      materials,
      labour,
      subcontractors,
      other,
    },
    profitPanel: {
      thisMonth: grossProfit,
      lastMonth: rand(100000, 180000),
      bestCategory: sorted[0].label,
      worstCategory: sorted[sorted.length - 1].label,
    },
  };
}

// -- SVG Dual Bar Chart with Margin Line ------------------------------------
function InvoicedCostChart({
  data,
  onBarClick,
}: {
  data: MonthBar[];
  onBarClick: (month: string) => void;
}) {
  const maxVal = Math.max(...data.flatMap((d) => [d.invoiced, d.cost]));
  const ceil = Math.ceil(maxVal / 100000) * 100000;
  const chartH = 180;
  const chartTop = 30;
  const chartLeft = 52;
  const chartRight = 620;
  const rightAxisX = 648;
  const barW = 18;
  const gap = (chartRight - chartLeft) / data.length;

  // Left Y axis grid lines (dollar values)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: chartTop + chartH * (1 - f),
    label: "$" + Math.round((ceil * f) / 1000) + "k",
  }));

  // Right Y axis labels (margin %)
  const marginTicks = [0, 10, 20, 30, 40, 50].map((v) => ({
    y: chartTop + chartH * (1 - v / 50),
    label: v + "%",
  }));

  // Margin line points
  const marginPoints = data.map((d, i) => {
    const x = chartLeft + i * gap + gap / 2;
    const y = chartTop + chartH * (1 - d.margin / 50);
    return { x, y };
  });
  const linePath = marginPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");

  // Target line at 35%
  const targetY = chartTop + chartH * (1 - 35 / 50);

  return (
    <svg viewBox="0 0 700 270" className="w-full h-auto">
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={chartLeft} y1={g.y} x2={chartRight} y2={g.y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray={i < gridLines.length - 1 ? "4" : undefined} />
          <text x={chartLeft - 8} y={g.y + 4} textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="600">{g.label}</text>
        </g>
      ))}

      {/* Right Y axis labels */}
      {marginTicks.map((t, i) => (
        <text key={i} x={rightAxisX} y={t.y + 4} textAnchor="start" fill="#94a3b8" fontSize="9" fontWeight="600">{t.label}</text>
      ))}
      <text x={rightAxisX + 8} y={chartTop - 12} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">Margin %</text>

      {/* 35% target dashed line */}
      <line x1={chartLeft} y1={targetY} x2={chartRight} y2={targetY} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
      <rect x={chartRight + 2} y={targetY - 8} width="36" height="16" rx="3" fill="#8b5cf6" opacity="0.12" />
      <text x={chartRight + 20} y={targetY + 4} textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="700">35%</text>

      {/* Bars */}
      {data.map((d, i) => {
        const cx = chartLeft + i * gap + gap / 2;
        const x1 = cx - barW - 1;
        const x2 = cx + 1;
        const iH = (d.invoiced / ceil) * chartH;
        const cH = (d.cost / ceil) * chartH;
        const iY = chartTop + chartH - iH;
        const cY = chartTop + chartH - cH;
        const bw = d.isCurrent ? barW + 2 : barW;
        return (
          <g key={d.label} className="cursor-pointer" onClick={() => onBarClick(d.label)}>
            {/* Invoiced bar (blue) */}
            <rect x={x1} y={iY} width={bw} height={iH} rx="3" fill={d.isCurrent ? "#2563eb" : "#3b82f6"} opacity={d.isCurrent ? 1 : 0.85} />
            {/* Cost bar (orange) */}
            <rect x={x2} y={cY} width={bw} height={cH} rx="3" fill={d.isCurrent ? "#d97706" : "#f59e0b"} opacity={d.isCurrent ? 1 : 0.85} />
            {/* Month label */}
            <text x={cx} y={chartTop + chartH + 20} textAnchor="middle" fill={d.isCurrent ? "#2563eb" : "#94a3b8"} fontSize="9" fontWeight={d.isCurrent ? "700" : "600"}>
              {d.label}
            </text>
            {d.isCurrent && <circle cx={cx} cy={chartTop + chartH + 28} r="2" fill="#2563eb" />}
          </g>
        );
      })}

      {/* Margin line overlay (green) */}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {marginPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#10b981" strokeWidth="2" />
      ))}

      {/* Legend */}
      <rect x={chartLeft} y={chartTop + chartH + 40} width="10" height="10" rx="2" fill="#3b82f6" />
      <text x={chartLeft + 14} y={chartTop + chartH + 49} fill="#64748b" fontSize="9" fontWeight="600">Invoiced</text>
      <rect x={chartLeft + 72} y={chartTop + chartH + 40} width="10" height="10" rx="2" fill="#f59e0b" />
      <text x={chartLeft + 86} y={chartTop + chartH + 49} fill="#64748b" fontSize="9" fontWeight="600">Cost of Works</text>
      <line x1={chartLeft + 172} y1={chartTop + chartH + 45} x2={chartLeft + 192} y2={chartTop + chartH + 45} stroke="#10b981" strokeWidth="2" />
      <circle cx={chartLeft + 182} cy={chartTop + chartH + 45} r="3" fill="white" stroke="#10b981" strokeWidth="1.5" />
      <text x={chartLeft + 198} y={chartTop + chartH + 49} fill="#64748b" fontSize="9" fontWeight="600">Margin %</text>
    </svg>
  );
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
function CostIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v6M6 7h4M6 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function ProfitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14L6 8L9 11L14 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  const [period, setPeriod] = useState<TimePeriod>("Monthly");
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [data, setData] = useState<MarginData | null>(null);
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

  // Regenerate on period change
  const handlePeriodChange = useCallback((p: TimePeriod) => {
    setPeriod(p);
    setData(generateData());
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  }, []);

  const openInvoice = useCallback((inv: Invoice) => {
    setSelectedInvoice(inv);
    setPanel("invoice");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedInvoice(null);
  }, []);

  const cardFlash = flash ? "animate-[cardFlash_0.4s_ease-out]" : "";

  if (!isActive) return null;

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const d = data;
  const belowTarget = d.categories.filter((c) => c.margin < 35);

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
          <h2 className="text-xl font-bold text-slate-800">Invoiced + Gross Margin</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.15)", color: "#7c3aed" }}
          >
            Mock Data
          </span>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-[3px] gap-0.5">
          {(["Daily", "Weekly", "Monthly", "YTD"] as TimePeriod[]).map((p) => (
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

        {/* YTD SUMMARY BANNER */}
        <div
          className="rounded-[10px] px-6 py-3.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
        >
          <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide">
            YTD Summary
          </div>
          <div className="flex gap-12">
            <YTDMetric label="YTD Invoiced" value={fmtDollar(d.ytd.invoiced, true)} color="#60a5fa" />
            <YTDMetric label="Cost of Works" value={fmtDollar(d.ytd.cost, true)} color="#fbbf24" />
            <YTDMetric label="Gross Profit" value={fmtDollar(d.ytd.grossProfit, true)} color="#34d399" />
            <YTDMetric label="Gross Margin %" value={fmtPct(d.ytd.margin)} color="#34d399" />
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            className={cardFlash}
            borderColor="#3b82f6"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={<InvoiceIcon />}
            label="Total Invoiced"
            value={fmtDollar(d.cards.invoiced)}
            change={d.cards.invoicedChange}
            changeUp
            sub="This month vs last month"
            onClick={() => setPanel("invoiced")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#f59e0b"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            icon={<CostIcon />}
            label="Cost of Works"
            value={fmtDollar(d.cards.cost)}
            change={d.cards.costChange}
            changeUp={false}
            sub={fmtPct(d.cards.cost / d.cards.invoiced * 100) + " of invoiced"}
            onClick={() => setPanel("cost")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#10b981"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            icon={<ProfitIcon />}
            label="Gross Profit"
            value={fmtDollar(d.cards.grossProfit)}
            change={d.cards.profitChange}
            changeUp
            sub="Revenue minus cost of works"
            onClick={() => setPanel("profit")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#8b5cf6"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            icon={<MarginIcon />}
            label="Gross Margin %"
            value={fmtPct(d.cards.marginPct)}
            change={0}
            changeUp={d.cards.marginPct >= 35}
            sub=""
            onClick={() => setPanel("profit")}
            targetIndicator={35}
            currentMargin={d.cards.marginPct}
          />
        </div>

        {/* CHARTS ROW */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Invoiced vs Cost of Works Chart */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.6] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Invoiced vs Cost of Works</div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Invoiced
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Cost of Works
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Margin %
                </span>
              </div>
            </div>
            <InvoicedCostChart data={d.chart} onBarClick={() => setPanel("invoiced")} />
          </div>

          {/* Margin by Category */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Margin by Category</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">Target: 35%</span>
            </div>
            <div className="flex flex-col gap-4">
              {d.categories.map((cat) => {
                const barColor = cat.margin >= 35 ? "#10b981" : cat.margin >= 30 ? "#f59e0b" : "#ef4444";
                const maxMargin = 50;
                const fillW = Math.min((cat.margin / maxMargin) * 100, 100);
                const targetPos = (35 / maxMargin) * 100;
                return (
                  <div key={cat.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.82rem] font-semibold text-slate-800">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.82rem] font-bold" style={{ color: barColor }}>
                          {fmtPct(cat.margin)}
                        </span>
                        <span className="text-[0.7rem] font-semibold text-slate-400">
                          {fmtDollar(cat.invoiced)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-sm overflow-visible">
                      <div
                        className="h-full rounded-sm transition-all"
                        style={{ width: fillW + "%", background: barColor }}
                      />
                      {/* 35% target marker */}
                      <div
                        className="absolute top-[-2px] h-[calc(100%+4px)] w-[2px] bg-slate-500"
                        style={{ left: targetPos + "%" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Alert for categories below target */}
            {belowTarget.length > 0 && (
              <div className="mt-4 px-3.5 py-2.5 bg-red-50 rounded-lg text-[0.82rem] font-semibold text-red-600 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {belowTarget.length} {belowTarget.length === 1 ? "category" : "categories"} below 35% target: {belowTarget.map((c) => c.label).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* RECENT INVOICES TABLE */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="text-[0.92rem] font-bold text-slate-800">Recent Invoices</div>
            <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Showing 8 of 96
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  {["Invoice #", "Date", "Client", "Description", "Invoiced", "Cost", "Margin %", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-[0.73rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2.5 bg-slate-50 border-b border-gray-200"
                      style={["Invoiced", "Cost", "Margin %"].includes(h) ? { textAlign: "right" } : undefined}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.invoices.map((inv, i) => {
                  const marginColor = inv.margin >= 35 ? "text-emerald-600" : inv.margin >= 30 ? "text-amber-600" : "text-red-600";
                  const statusStyles: Record<string, string> = {
                    Paid: "bg-emerald-50 text-emerald-600",
                    Outstanding: "bg-amber-50 text-amber-600",
                    Overdue: "bg-red-50 text-red-600",
                  };
                  return (
                    <tr
                      key={i}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => openInvoice(inv)}
                    >
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-blue-500">
                        {inv.number}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-500">
                        {inv.date}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-slate-800">
                        {inv.client}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-600">
                        {inv.description}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                        {fmtDollar(inv.invoiced)}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-semibold text-slate-500">
                        {fmtDollar(inv.cost)}
                      </td>
                      <td className={`text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold ${marginColor}`}>
                        {fmtPct(inv.margin)}
                      </td>
                      <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                        <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${statusStyles[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SCRIM */}
      <div
        className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
          panel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(15,23,42,0.5)" }}
        onClick={closePanel}
      />

      {/* PANELS */}
      <SlidePanel open={panel === "invoiced"} onClose={closePanel} title="Invoiced Breakdown" titleColor="#3b82f6">
        <PanelStatRow>
          <PanelStat label="This Month" value={fmtDollar(d.invoicePanel.thisMonth)} />
          <PanelStat label="Last Month" value={fmtDollar(d.invoicePanel.lastMonth)} small />
        </PanelStatRow>
        <PanelSectionTitle>Top Clients This Month</PanelSectionTitle>
        {d.invoicePanel.topClients.map((c) => (
          <PanelListItem key={c.label} label={c.label} value={fmtDollar(c.value)} />
        ))}
        <PanelSectionTitle className="mt-5">By Category</PanelSectionTitle>
        {d.categories.map((c) => (
          <PanelListItem key={c.label} label={c.label} value={fmtDollar(c.invoiced)} />
        ))}
        <PanelActions primary="View All Invoices" secondary="Export CSV" />
      </SlidePanel>

      <SlidePanel open={panel === "cost"} onClose={closePanel} title="Cost of Works Breakdown" titleColor="#d97706">
        <PanelStatRow>
          <PanelStat label="Total Cost" value={fmtDollar(d.costPanel.thisMonth)} />
          <PanelStat label="% of Invoiced" value={fmtPct(d.cards.cost / d.cards.invoiced * 100)} small />
        </PanelStatRow>
        <PanelSectionTitle>Cost Components</PanelSectionTitle>
        <PanelListItem label="Materials" value={fmtDollar(d.costPanel.materials)} />
        <PanelListItem label="Labour" value={fmtDollar(d.costPanel.labour)} />
        <PanelListItem label="Subcontractors" value={fmtDollar(d.costPanel.subcontractors)} />
        <PanelListItem label="Other" value={fmtDollar(d.costPanel.other)} />
        <PanelSectionTitle className="mt-5">By Category</PanelSectionTitle>
        {d.categories.map((c) => (
          <PanelListItem key={c.label} label={c.label} value={fmtDollar(c.cost)} />
        ))}
        <PanelActions primary="View Cost Details" secondary="Export CSV" />
      </SlidePanel>

      <SlidePanel open={panel === "profit"} onClose={closePanel} title="Gross Profit Analysis" titleColor="#059669">
        <PanelStatRow>
          <PanelStat label="This Month" value={fmtDollar(d.profitPanel.thisMonth)} />
          <PanelStat label="Last Month" value={fmtDollar(d.profitPanel.lastMonth)} small />
        </PanelStatRow>
        <PanelSectionTitle>Margin by Category</PanelSectionTitle>
        {d.categories.map((c) => {
          const color = c.margin >= 35 ? "#059669" : c.margin >= 30 ? "#d97706" : "#dc2626";
          return (
            <div key={c.label} className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">{c.label}</span>
              <span className="font-bold" style={{ color }}>{fmtPct(c.margin)}</span>
            </div>
          );
        })}
        <div className="mt-3.5 px-3.5 py-2.5 bg-emerald-50 rounded-lg text-[0.85rem] font-semibold text-emerald-600">
          Best: {d.profitPanel.bestCategory}
        </div>
        {belowTarget.length > 0 && (
          <div className="mt-2 px-3.5 py-2.5 bg-red-50 rounded-lg text-[0.85rem] font-semibold text-red-600">
            Needs attention: {d.profitPanel.worstCategory}
          </div>
        )}
        <PanelActions primary="View Full Report" secondary="Export CSV" />
      </SlidePanel>

      <SlidePanel open={panel === "invoice"} onClose={closePanel} title="Invoice Detail">
        {selectedInvoice && (
          <>
            <PanelStatRow>
              <PanelStat label="Invoice" value={selectedInvoice.number} />
              <PanelStat label="Date" value={selectedInvoice.date} small />
            </PanelStatRow>
            <PanelSectionTitle>Details</PanelSectionTitle>
            <PanelListItem label="Client" value={selectedInvoice.client} />
            <PanelListItem label="Description" value={selectedInvoice.description} />
            <PanelListItem label="Invoiced Amount" value={fmtDollar(selectedInvoice.invoiced)} />
            <PanelListItem label="Cost of Works" value={fmtDollar(selectedInvoice.cost)} />
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Gross Profit</span>
              <span className="font-bold text-emerald-600">
                {fmtDollar(selectedInvoice.invoiced - selectedInvoice.cost)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Margin</span>
              <span
                className="font-bold"
                style={{
                  color: selectedInvoice.margin >= 35 ? "#059669" : selectedInvoice.margin >= 30 ? "#d97706" : "#dc2626",
                }}
              >
                {fmtPct(selectedInvoice.margin)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Status</span>
              <span
                className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${
                  selectedInvoice.status === "Paid"
                    ? "bg-emerald-50 text-emerald-600"
                    : selectedInvoice.status === "Outstanding"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {selectedInvoice.status}
              </span>
            </div>
            {selectedInvoice.margin < 35 && (
              <div className="mt-3.5 px-3.5 py-2.5 bg-amber-50 rounded-lg text-[0.85rem] font-semibold text-amber-600">
                Margin below 35% target - review cost allocation
              </div>
            )}
            <PanelActions primary="View in Xero" secondary="Download PDF" />
          </>
        )}
      </SlidePanel>
    </>
  );
}

// -- Sub-components ---------------------------------------------------------

function YTDMetric({ label, value, color }: { label: string; value: string; color: string }) {
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
  change,
  changeUp,
  sub,
  onClick,
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
  change: number;
  changeUp: boolean;
  sub: string;
  onClick: () => void;
  className?: string;
  targetIndicator?: number;
  currentMargin?: number;
}) {
  const isMarginCard = targetIndicator !== undefined && currentMargin !== undefined;
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm cursor-pointer
        transition-all hover:shadow-lg hover:-translate-y-0.5 ${className ?? ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        {isMarginCard ? (
          <span
            className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
              currentMargin >= targetIndicator ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {currentMargin >= targetIndicator ? "Above" : "Below"} {targetIndicator}%
          </span>
        ) : (
          <span
            className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
              changeUp ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            {changeUp ? "\u25B2" : "\u25BC"} {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{value}</div>
      {sub && <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">{sub}</div>}
      {isMarginCard && (
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
      <span className="absolute bottom-2 right-3 text-[0.65rem] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Click for breakdown &rarr;
      </span>
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
      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2">
        {primary}
      </button>
      {secondary && (
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-transparent text-slate-500 border border-gray-200 hover:text-blue-500 hover:border-blue-500 transition-colors">
          {secondary}
        </button>
      )}
    </div>
  );
}
