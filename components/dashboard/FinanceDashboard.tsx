"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────
type TimePeriod = "Daily" | "Weekly" | "Monthly" | "YTD";
type PanelType = "revenue" | "expenses" | "cash" | "transaction" | null;

interface Transaction {
  date: string;
  description: string;
  category: string;
  type: "Income" | "Expense";
  amount: number;
  xeroRef: string;
  client: string;
  account: string;
}

interface ExpenseCategory {
  label: string;
  color: string;
  pct: number;
  value: number;
}

interface MonthBar {
  label: string;
  revenue: number;
  expenses: number;
  isCurrent: boolean;
}

interface FinanceData {
  ytd: { revenue: number; expenses: number; profit: number; margin: number };
  cards: {
    revenue: number;
    revenueChange: number;
    expenses: number;
    expensesChange: number;
    profit: number;
    profitChange: number;
    profitMargin: number;
    cash: number;
    cashChange: number;
  };
  expenseBreakdown: ExpenseCategory[];
  chart: MonthBar[];
  transactions: Transaction[];
  revenuePanel: {
    thisMonth: number;
    lastMonth: number;
    sources: { label: string; value: number }[];
    topClients: { label: string; value: number }[];
  };
  expensePanel: {
    thisMonth: number;
    budget: number;
    categories: { label: string; color: string; value: number }[];
    underBudget: number;
  };
  cashPanel: {
    total: number;
    thirtyDaysAgo: number;
    accounts: { label: string; value: number }[];
    outflows: { label: string; value: number }[];
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function fmtDollar(v: number, compact?: boolean): string {
  if (compact && Math.abs(v) >= 1_000_000) {
    return "$" + (v / 1_000_000).toFixed(1) + "M";
  }
  const abs = Math.abs(v);
  const s =
    abs >= 1_000_000
      ? "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v < 0 ? "−" + s : s;
}

function fmtDollarSigned(v: number): string {
  const abs = Math.abs(v);
  const s = "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v >= 0 ? "+" + s : "−" + s;
}

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const EXPENSE_CATS: { label: string; color: string; pct: number }[] = [
  { label: "Wages / Labour", color: "#3b82f6", pct: 41.9 },
  { label: "Materials / Supplies", color: "#8b5cf6", pct: 21.0 },
  { label: "Subcontractors", color: "#10b981", pct: 14.0 },
  { label: "Vehicle / Fleet", color: "#f59e0b", pct: 10.0 },
  { label: "Overheads", color: "#ec4899", pct: 9.0 },
  { label: "Marketing", color: "#6366f1", pct: 4.1 },
];

const TX_DESCS: { desc: string; cat: string; type: "Income" | "Expense"; client: string }[] = [
  { desc: "Payment — Westfield Commercial Fit-out", cat: "Project Income", type: "Income", client: "Westfield Corp" },
  { desc: "Reece Plumbing — Materials Order #4891", cat: "Materials", type: "Expense", client: "Reece Plumbing" },
  { desc: "Fortnightly Payroll — Week 10", cat: "Wages", type: "Expense", client: "Internal" },
  { desc: "Service Call — 44 Bridge Rd Residential", cat: "Project Income", type: "Income", client: "Residential" },
  { desc: "BP Fleet Card — Fuel March Wk1", cat: "Vehicle", type: "Expense", client: "BP Fleet" },
  { desc: "UrbanEdge Sub — Electrical Rough-in", cat: "Subcontractor", type: "Expense", client: "UrbanEdge Electrical" },
  { desc: "Progress Claim — Harbour Tower L12", cat: "Project Income", type: "Income", client: "Harbour Tower Pty Ltd" },
  { desc: "Google Ads — March Campaign", cat: "Marketing", type: "Expense", client: "Google" },
];

const ACCOUNTS = ["Operating Account", "Trust Account", "Savings / Reserve"];

function generateData(): FinanceData {
  const revenue = rand(280000, 400000);
  const expenses = rand(200000, 300000);
  const profit = revenue - expenses;
  const margin = Math.round((profit / revenue) * 1000) / 10;

  const ytdRevenue = rand(2400000, 3200000);
  const ytdExpenses = rand(1800000, 2400000);
  const ytdProfit = ytdRevenue - ytdExpenses;
  const ytdMargin = Math.round((ytdProfit / ytdRevenue) * 1000) / 10;

  // Expense breakdown that sums to total
  const expenseBreakdown: ExpenseCategory[] = EXPENSE_CATS.map((c) => {
    const val = Math.round((c.pct / 100) * expenses);
    return { label: c.label, color: c.color, pct: c.pct, value: val };
  });

  // Chart data
  const chart: MonthBar[] = MONTHS.map((label, i) => ({
    label,
    revenue: rand(220000, 380000),
    expenses: rand(180000, 290000),
    isCurrent: i === MONTHS.length - 1,
  }));
  // Override last month with current card data
  chart[chart.length - 1].revenue = revenue;
  chart[chart.length - 1].expenses = expenses;

  // Transactions
  const today = new Date();
  const transactions: Transaction[] = TX_DESCS.map((tx, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const amount = tx.type === "Income" ? rand(2000, 130000) : -rand(1500, 60000);
    return {
      date: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
      description: tx.desc,
      category: tx.cat,
      type: tx.type,
      amount,
      xeroRef: `#INV-2026-${String(rand(100, 999)).padStart(4, "0")}`,
      client: tx.client,
      account: ACCOUNTS[rand(0, 2)],
    };
  });

  // Revenue panel sources
  const projIncome = Math.round(revenue * 0.82);
  const serviceCalls = Math.round(revenue * 0.12);
  const maintenance = Math.round(revenue * 0.05);
  const other = revenue - projIncome - serviceCalls - maintenance;

  const budget = rand(260000, 280000);

  // Cash panel
  const cashTotal = rand(450000, 600000);
  const operating = Math.round(cashTotal * 0.6);
  const trust = Math.round(cashTotal * 0.28);
  const savings = cashTotal - operating - trust;

  return {
    ytd: { revenue: ytdRevenue, expenses: ytdExpenses, profit: ytdProfit, margin: ytdMargin },
    cards: {
      revenue,
      revenueChange: rand(5, 18),
      expenses,
      expensesChange: rand(1, 8),
      profit,
      profitChange: rand(15, 45),
      profitMargin: margin,
      cash: cashTotal,
      cashChange: rand(2, 10),
    },
    expenseBreakdown,
    chart,
    transactions,
    revenuePanel: {
      thisMonth: revenue,
      lastMonth: rand(260000, 340000),
      sources: [
        { label: "Project Income", value: projIncome },
        { label: "Service Calls", value: serviceCalls },
        { label: "Maintenance Contracts", value: maintenance },
        { label: "Other", value: other },
      ],
      topClients: [
        { label: "Westfield Corp", value: rand(80000, 140000) },
        { label: "Harbour Tower Pty Ltd", value: rand(60000, 100000) },
        { label: "BridgePoint Homes", value: rand(30000, 60000) },
        { label: "Residential (various)", value: rand(50000, 100000) },
      ],
    },
    expensePanel: {
      thisMonth: expenses,
      budget,
      categories: expenseBreakdown.map((e) => ({ label: e.label, color: e.color, value: e.value })),
      underBudget: Math.max(0, budget - expenses),
    },
    cashPanel: {
      total: cashTotal,
      thirtyDaysAgo: rand(400000, 520000),
      accounts: [
        { label: "Operating Account", value: operating },
        { label: "Trust Account", value: trust },
        { label: "Savings / Reserve", value: savings },
      ],
      outflows: [
        { label: "Payroll — Week 11", value: -rand(45000, 58000) },
        { label: "Supplier Payments", value: -rand(15000, 30000) },
        { label: "Insurance Premium", value: -rand(3000, 6000) },
      ],
    },
  };
}

// ── SVG Bar Chart ───────────────────────────────────────────────────────
function RevenueExpensesChart({
  data,
  onBarClick,
}: {
  data: MonthBar[];
  onBarClick: (month: string) => void;
}) {
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]));
  const ceil = Math.ceil(maxVal / 100000) * 100000;
  const chartH = 180;
  const chartTop = 30;
  const chartLeft = 52;
  const chartRight = 660;
  const barW = 22;
  const gap = (chartRight - chartLeft) / data.length;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: chartTop + chartH * (1 - f),
    label: "$" + Math.round((ceil * f) / 1000) + "k",
  }));

  return (
    <svg viewBox="0 0 680 260" className="w-full h-auto">
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
        const x = chartLeft + i * gap + gap / 2 - barW - 1;
        const rH = (d.revenue / ceil) * chartH;
        const eH = (d.expenses / ceil) * chartH;
        const rY = chartTop + chartH - rH;
        const eY = chartTop + chartH - eH;
        const bw = d.isCurrent ? barW + 2 : barW;
        return (
          <g
            key={d.label}
            className="cursor-pointer"
            onClick={() => onBarClick(d.label)}
          >
            <rect
              x={x}
              y={rY}
              width={bw}
              height={rH}
              rx="4"
              fill={d.isCurrent ? "#2563eb" : "#3b82f6"}
              opacity={d.isCurrent ? 1 : 0.85}
            />
            <rect
              x={x + bw + 2}
              y={eY}
              width={bw}
              height={eH}
              rx="4"
              fill={d.isCurrent ? "#dc2626" : "#ef4444"}
              opacity={d.isCurrent ? 1 : 0.85}
            />
            <text
              x={x + bw + 1}
              y={chartTop + chartH + 22}
              textAnchor="middle"
              fill={d.isCurrent ? "#2563eb" : "#94a3b8"}
              fontSize="10"
              fontWeight={d.isCurrent ? "700" : "600"}
            >
              {d.label}
            </text>
            {d.isCurrent && (
              <circle cx={x + bw + 1} cy={chartTop + chartH + 30} r="2.5" fill="#2563eb" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Icons (inline SVG) ──────────────────────────────────────────────────
function RevenueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14L6 8L9 11L14 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ExpenseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2L6 8L9 5L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProfitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M8 5V11M6 7L8 5L10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function FinanceDashboard({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [period, setPeriod] = useState<TimePeriod>("Monthly");
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [data, setData] = useState<FinanceData | null>(null);
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

  // Regenerate on period change (mock data just changes)
  const handlePeriodChange = useCallback((p: TimePeriod) => {
    setPeriod(p);
    setData(generateData());
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  }, []);

  const openTransaction = useCallback((tx: Transaction) => {
    setSelectedTx(tx);
    setPanel("transaction");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedTx(null);
  }, []);

  const cardFlash = flash
    ? "animate-[cardFlash_0.4s_ease-out]"
    : "";

  if (!isActive) return null;

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
          <h2 className="text-xl font-bold text-slate-800">Finance Dashboard</h2>
          <span className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(0,170,200,0.08)", borderColor: "rgba(0,170,200,0.15)", color: "#0891b2" }}>
            Xero Data (Mock)
          </span>
        </div>
        <div className="flex flex-wrap bg-gray-100 rounded-lg p-[3px] gap-0.5">
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

        {/* YTD BANNER */}
        <div className="rounded-[10px] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
          <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide">
            Year-to-Date Summary
          </div>
          <div className="grid grid-cols-2 md:flex gap-4 md:gap-12">
            <YTDMetric label="Revenue" value={fmtDollar(d.ytd.revenue, true)} color="#60a5fa" />
            <YTDMetric label="Expenses" value={fmtDollar(d.ytd.expenses, true)} color="#f87171" />
            <YTDMetric label="Profit" value={fmtDollar(d.ytd.profit, true)} color="#34d399" />
            <YTDMetric label="Margin" value={d.ytd.margin.toFixed(1) + "%"} color="#34d399" />
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            className={cardFlash}
            borderColor="#3b82f6"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={<RevenueIcon />}
            label="Revenue"
            value={fmtDollar(d.cards.revenue)}
            change={d.cards.revenueChange}
            changeUp
            sub="This month vs last month"
            onClick={() => setPanel("revenue")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#ef4444"
            iconBg="bg-red-50"
            iconColor="text-red-600"
            icon={<ExpenseIcon />}
            label="Expenses"
            value={fmtDollar(d.cards.expenses)}
            change={d.cards.expensesChange}
            changeUp={false}
            sub="This month vs last month"
            onClick={() => setPanel("expenses")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#10b981"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            icon={<ProfitIcon />}
            label="Net Profit"
            value={fmtDollar(d.cards.profit)}
            change={d.cards.profitChange}
            changeUp
            sub={d.cards.profitMargin.toFixed(1) + "% margin"}
            onClick={() => setPanel("revenue")}
          />
          <MetricCard
            className={cardFlash}
            borderColor="#8b5cf6"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            icon={<CashIcon />}
            label="Cash Position"
            value={fmtDollar(d.cards.cash)}
            change={d.cards.cashChange}
            changeUp
            sub="Across all accounts"
            onClick={() => setPanel("cash")}
          />
        </div>

        {/* CHARTS ROW */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Revenue vs Expenses */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.6] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Revenue vs Expenses</div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Expenses
                </span>
              </div>
            </div>
            <RevenueExpensesChart data={d.chart} onBarClick={() => setPanel("revenue")} />
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Expense Breakdown</div>
              <span className="text-[0.72rem] font-semibold text-slate-400">This Month</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {d.expenseBreakdown.map((cat) => {
                const maxPct = d.expenseBreakdown[0].pct;
                const barW = (cat.pct / maxPct) * 100;
                return (
                  <div key={cat.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: cat.color }} />
                        <span className="text-[0.82rem] font-semibold text-slate-800">{cat.label}</span>
                      </div>
                      <div>
                        <span className="text-[0.82rem] font-bold">{fmtDollar(cat.value)}</span>
                        <span className="text-[0.7rem] font-semibold text-slate-400 ml-1">{cat.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: barW + "%", background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="text-[0.92rem] font-bold text-slate-800">Recent Transactions</div>
            <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Showing 8 of 142
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  {["Date", "Description", "Category", "Type", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="text-[0.73rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2.5 bg-slate-50 border-b border-gray-200"
                      style={h === "Amount" ? { textAlign: "right" } : undefined}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.transactions.map((tx, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => openTransaction(tx)}
                  >
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-500">
                      {tx.date}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-blue-500">
                      {tx.description}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span className="text-[0.72rem] font-semibold text-slate-500 bg-gray-100 px-2 py-0.5 rounded">
                        {tx.category}
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span
                        className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${
                          tx.type === "Income"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold ${
                        tx.amount >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {fmtDollarSigned(tx.amount)}
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

      {/* ── PANELS ── */}
      <SlidePanel open={panel === "revenue"} onClose={closePanel} title="Revenue Breakdown" titleColor="#3b82f6">
        <PanelStatRow>
          <PanelStat label="This Month" value={fmtDollar(d.revenuePanel.thisMonth)} />
          <PanelStat label="Last Month" value={fmtDollar(d.revenuePanel.lastMonth)} small />
        </PanelStatRow>
        <PanelSectionTitle>By Source</PanelSectionTitle>
        {d.revenuePanel.sources.map((s) => (
          <PanelListItem key={s.label} label={s.label} value={fmtDollar(s.value)} />
        ))}
        <PanelSectionTitle className="mt-5">Top Clients This Month</PanelSectionTitle>
        {d.revenuePanel.topClients.map((c) => (
          <PanelListItem key={c.label} label={c.label} value={fmtDollar(c.value)} />
        ))}
        <PanelActions primary="View in Xero" secondary="Export CSV" />
      </SlidePanel>

      <SlidePanel open={panel === "expenses"} onClose={closePanel} title="Expense Breakdown" titleColor="#dc2626">
        <PanelStatRow>
          <PanelStat label="This Month" value={fmtDollar(d.expensePanel.thisMonth)} />
          <PanelStat label="Budget" value={fmtDollar(d.expensePanel.budget)} small />
        </PanelStatRow>
        <PanelSectionTitle>By Category</PanelSectionTitle>
        {d.expensePanel.categories.map((c) => (
          <div key={c.label} className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="font-bold">{fmtDollar(c.value)}</span>
          </div>
        ))}
        {d.expensePanel.underBudget > 0 && (
          <div className="mt-3.5 px-3.5 py-2.5 bg-emerald-50 rounded-lg text-[0.85rem] font-semibold text-emerald-600">
            {fmtDollar(d.expensePanel.underBudget)} under budget this month ✓
          </div>
        )}
        <PanelActions primary="View in Xero" secondary="Export CSV" />
      </SlidePanel>

      <SlidePanel open={panel === "cash"} onClose={closePanel} title="Cash Position" titleColor="#7c3aed">
        <PanelStatRow>
          <PanelStat label="Total Cash" value={fmtDollar(d.cashPanel.total)} />
          <PanelStat label="30 Days Ago" value={fmtDollar(d.cashPanel.thirtyDaysAgo)} small />
        </PanelStatRow>
        <PanelSectionTitle>Account Balances</PanelSectionTitle>
        {d.cashPanel.accounts.map((a) => (
          <PanelListItem key={a.label} label={a.label} value={fmtDollar(a.value)} />
        ))}
        <PanelSectionTitle className="mt-5">Upcoming Outflows (7 days)</PanelSectionTitle>
        {d.cashPanel.outflows.map((o) => (
          <PanelListItem key={o.label} label={o.label} value={fmtDollar(o.value)} valueColor="#dc2626" />
        ))}
        <PanelActions primary="View in Xero" />
      </SlidePanel>

      <SlidePanel open={panel === "transaction"} onClose={closePanel} title="Transaction Detail">
        {selectedTx && (
          <>
            <PanelStatRow>
              <PanelStat
                label="Amount"
                value={fmtDollarSigned(selectedTx.amount)}
                valueColor={selectedTx.amount >= 0 ? "#059669" : "#dc2626"}
              />
              <PanelStat label="Date" value={selectedTx.date} small />
            </PanelStatRow>
            <PanelSectionTitle>Details</PanelSectionTitle>
            <PanelListItem label="Description" value={selectedTx.description} />
            <PanelListItem label="Category" value={selectedTx.category} />
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Type</span>
              <span
                className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${
                  selectedTx.type === "Income"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {selectedTx.type}
              </span>
            </div>
            <PanelListItem label="Xero Ref" value={selectedTx.xeroRef} />
            <PanelListItem label="Client" value={selectedTx.client} />
            <PanelListItem label="Account" value={selectedTx.account} />
            <PanelActions primary="View in Xero" secondary="Download Receipt" />
          </>
        )}
      </SlidePanel>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

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
}) {
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
        <span
          className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
            changeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          ▲ {change.toFixed(1)}%
        </span>
      </div>
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">{sub}</div>
      <span className="absolute bottom-2 right-3 text-[0.65rem] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Click for breakdown →
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
