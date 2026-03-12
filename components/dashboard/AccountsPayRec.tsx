"use client";

import { DashboardComponentProps } from "@/types";
import { CreditCard } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────
type PanelType = "debtor" | "supplier" | null;

interface AgingBucket {
  label: string;
  color: string;
  pct: number;
  value: number;
  count: number;
}

interface Debtor {
  client: string;
  amount: number;
  status: "Follow Up" | "At Risk" | "Collections";
  aging: { current: number; thirty: number; sixty: number; ninety: number };
  contact: string;
  email: string;
  lastPayment: string;
}

interface Supplier {
  supplier: string;
  amountDue: number;
  daysUntilDue: number;
  aging: { current: number; thirty: number; sixty: number; ninety: number };
  contact: string;
  email: string;
  lastPayment: string;
}

interface APARData {
  totalAR: number;
  arChange: number;
  totalAP: number;
  apChange: number;
  netWorkingCapital: number;
  cashFlowHealthy: boolean;
  dso: number;
  dpo: number;
  arAging: AgingBucket[];
  apAging: AgingBucket[];
  debtors: Debtor[];
  suppliers: Supplier[];
}

// ── Helpers ─────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function fmtDollar(v: number): string {
  const abs = Math.abs(v);
  const s = "$" + abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v < 0 ? "−" + s : s;
}

function fmtDollarK(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const s = "$" + (abs / 1000).toFixed(1) + "K";
    return v < 0 ? "−" + s : s;
  }
  return fmtDollar(v);
}

const CLIENT_NAMES = [
  "Westfield Corp",
  "Harbour Tower Pty Ltd",
  "BridgePoint Homes",
  "Lendlease Projects",
  "Mirvac Group",
];

const CLIENT_STATUSES: ("Follow Up" | "At Risk" | "Collections")[] = [
  "Follow Up",
  "At Risk",
  "Collections",
  "Follow Up",
  "At Risk",
];

const SUPPLIER_NAMES = [
  "Reece Plumbing",
  "Bunnings Trade",
  "Dulux Commercial",
  "Hilti Australia",
  "Boral Building Products",
];

const CONTACT_NAMES = [
  "Sarah Mitchell",
  "James Cooper",
  "Linda Tran",
  "Mark Henderson",
  "Priya Sharma",
];

const CONTACT_EMAILS = [
  "accounts@westfield.com.au",
  "ap@harbourtower.com.au",
  "invoices@bridgepoint.com.au",
  "pay@lendlease.com.au",
  "finance@mirvac.com.au",
];

const SUPPLIER_EMAILS = [
  "trade@reece.com.au",
  "accounts@bunnings.com.au",
  "commercial@dulux.com.au",
  "invoices@hilti.com.au",
  "payments@boral.com.au",
];

// ── Data Generator ──────────────────────────────────────────────────────
function generateData(): APARData {
  const totalAR = rand(350000, 600000);
  const totalAP = rand(200000, 400000);
  const arChange = rand(3, 18);
  const apChange = rand(2, 14);
  const netWorkingCapital = totalAR - totalAP;
  const cashFlowHealthy = netWorkingCapital > 100000;
  const dso = rand(25, 50);
  const dpo = rand(20, 40);

  // AR aging buckets
  const arCurrentPct = 45;
  const arThirtyPct = 25;
  const arSixtyPct = 18;
  const arNinetyPct = 100 - arCurrentPct - arThirtyPct - arSixtyPct;
  const arAging: AgingBucket[] = [
    { label: "Current", color: "#22c55e", pct: arCurrentPct, value: Math.round(totalAR * arCurrentPct / 100), count: rand(12, 28) },
    { label: "30 Days", color: "#f59e0b", pct: arThirtyPct, value: Math.round(totalAR * arThirtyPct / 100), count: rand(6, 14) },
    { label: "60 Days", color: "#f97316", pct: arSixtyPct, value: Math.round(totalAR * arSixtyPct / 100), count: rand(3, 8) },
    { label: "90+ Days", color: "#ef4444", pct: arNinetyPct, value: Math.round(totalAR * arNinetyPct / 100), count: rand(1, 5) },
  ];

  // AP aging buckets
  const apCurrentPct = rand(40, 55);
  const apThirtyPct = rand(20, 30);
  const apSixtyPct = rand(10, 20);
  const apNinetyPct = 100 - apCurrentPct - apThirtyPct - apSixtyPct;
  const apAging: AgingBucket[] = [
    { label: "Current", color: "#22c55e", pct: apCurrentPct, value: Math.round(totalAP * apCurrentPct / 100), count: rand(8, 20) },
    { label: "30 Days", color: "#f59e0b", pct: apThirtyPct, value: Math.round(totalAP * apThirtyPct / 100), count: rand(4, 10) },
    { label: "60 Days", color: "#f97316", pct: apSixtyPct, value: Math.round(totalAP * apSixtyPct / 100), count: rand(2, 6) },
    { label: "90+ Days", color: "#ef4444", pct: apNinetyPct, value: Math.round(totalAP * apNinetyPct / 100), count: rand(1, 3) },
  ];

  // Top overdue debtors
  const debtors: Debtor[] = CLIENT_NAMES.map((client, i) => {
    const amount = rand(18000, 120000);
    const current = Math.round(amount * 0.3);
    const thirty = Math.round(amount * 0.3);
    const sixty = Math.round(amount * 0.25);
    const ninety = amount - current - thirty - sixty;
    const d = new Date();
    d.setDate(d.getDate() - rand(15, 90));
    return {
      client,
      amount,
      status: CLIENT_STATUSES[i],
      aging: { current, thirty, sixty, ninety },
      contact: CONTACT_NAMES[i],
      email: CONTACT_EMAILS[i],
      lastPayment: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
    };
  });

  // Top suppliers
  const suppliers: Supplier[] = SUPPLIER_NAMES.map((supplier, i) => {
    const amountDue = rand(8000, 85000);
    const daysUntilDue = rand(1, 28);
    const current = Math.round(amountDue * 0.4);
    const thirty = Math.round(amountDue * 0.3);
    const sixty = Math.round(amountDue * 0.2);
    const ninety = amountDue - current - thirty - sixty;
    const d = new Date();
    d.setDate(d.getDate() - rand(10, 60));
    return {
      supplier,
      amountDue,
      daysUntilDue,
      aging: { current, thirty, sixty, ninety },
      contact: CONTACT_NAMES[i],
      email: SUPPLIER_EMAILS[i],
      lastPayment: d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
    };
  });

  return {
    totalAR,
    arChange,
    totalAP,
    apChange,
    netWorkingCapital,
    cashFlowHealthy,
    dso,
    dpo,
    arAging,
    apAging,
    debtors,
    suppliers,
  };
}

// ── SlidePanel ──────────────────────────────────────────────────────────
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

// ── Panel Sub-components ────────────────────────────────────────────────
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

// ── Aging Segmented Bar ─────────────────────────────────────────────────
function AgingBar({ buckets }: { buckets: AgingBucket[] }) {
  return (
    <div>
      <div className="flex h-6 rounded-lg overflow-hidden">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-center text-[0.65rem] font-bold text-white"
            style={{ width: b.pct + "%", background: b.color, minWidth: b.pct > 5 ? undefined : "20px" }}
          >
            {b.pct >= 10 && b.pct + "%"}
          </div>
        ))}
      </div>
      <div className="flex mt-1.5">
        {buckets.map((b) => (
          <div key={b.label} className="text-center" style={{ width: b.pct + "%" }}>
            <div className="text-[0.68rem] font-semibold text-slate-500">{b.label}</div>
            <div className="text-[0.72rem] font-bold text-slate-700">{fmtDollarK(b.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Bucket Card ────────────────────────────────────────────────────
function BucketCard({ bucket }: { bucket: AgingBucket }) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
      style={{ borderLeft: `3px solid ${bucket.color}` }}
    >
      <div className="text-[0.7rem] font-semibold text-slate-400 uppercase tracking-wide mb-1">{bucket.label}</div>
      <div className="text-[1rem] font-extrabold text-slate-800">{fmtDollar(bucket.value)}</div>
      <div className="text-[0.72rem] font-medium text-slate-500">{bucket.count} invoices</div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "Follow Up" | "At Risk" | "Collections" }) {
  const styles = {
    "Follow Up": "bg-blue-50 text-blue-600",
    "At Risk": "bg-amber-50 text-amber-600",
    "Collections": "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${styles[status]}`}>
      {status}
    </span>
  );
}

// ── Days Until Due Badge ────────────────────────────────────────────────
function DaysBadge({ days }: { days: number }) {
  let cls = "bg-emerald-50 text-emerald-600";
  if (days < 7) cls = "bg-red-50 text-red-600";
  else if (days <= 14) cls = "bg-amber-50 text-amber-600";
  return (
    <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${cls}`}>
      {days}d
    </span>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────
function KPICard({
  borderColor,
  label,
  value,
  change,
  changeUp,
  sub,
  className,
}: {
  borderColor: string;
  label: string;
  value: string;
  change?: number;
  changeUp?: boolean;
  sub: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${className ?? ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-slate-50 text-slate-600">
          <CreditCard className="w-4 h-4" />
        </div>
        {change !== undefined && (
          <span
            className={`text-[0.75rem] font-semibold px-2 py-0.5 rounded-xl ${
              changeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {changeUp ? "▲" : "▼"} {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.8rem] font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[0.85rem] text-slate-500 mt-1.5 font-medium">{sub}</div>
    </div>
  );
}

// ── Callout Card ────────────────────────────────────────────────────────
function CalloutCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[10px] border border-gray-200 p-4 shadow-sm text-center"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="text-[2rem] font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[0.78rem] font-semibold text-slate-500 mt-1.5">{label}</div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function AccountsPayRec({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [data, setData] = useState<APARData | null>(null);
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

  const openDebtor = useCallback((debtor: Debtor) => {
    setSelectedDebtor(debtor);
    setSelectedSupplier(null);
    setPanel("debtor");
  }, []);

  const openSupplier = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedDebtor(null);
    setPanel("supplier");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedDebtor(null);
    setSelectedSupplier(null);
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
  const nwcPositive = d.netWorkingCapital >= 0;

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
          <h2 className="text-xl font-bold text-slate-800">Accounts Payable / Receivable</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.15)", color: "#d97706" }}
          >
            Mock Data
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            className={cardFlash}
            borderColor="#3b82f6"
            label="Total AR"
            value={fmtDollar(d.totalAR)}
            change={d.arChange}
            changeUp={true}
            sub="Outstanding receivables"
          />
          <KPICard
            className={cardFlash}
            borderColor="#f59e0b"
            label="Total AP"
            value={fmtDollar(d.totalAP)}
            change={d.apChange}
            changeUp={false}
            sub="Outstanding payables"
          />
          <KPICard
            className={cardFlash}
            borderColor={nwcPositive ? "#22c55e" : "#ef4444"}
            label="Net Working Capital"
            value={fmtDollar(d.netWorkingCapital)}
            sub={nwcPositive ? "Positive — AR exceeds AP" : "Negative — AP exceeds AR"}
          />
          <KPICard
            className={cardFlash}
            borderColor="#8b5cf6"
            label="Cash Flow"
            value={d.cashFlowHealthy ? "Healthy" : "Tight"}
            sub={d.cashFlowHealthy ? "Strong collection position" : "Collections need attention"}
          />
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* LEFT COLUMN — ACCOUNTS RECEIVABLE */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
              <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Accounts Receivable</div>

              {/* DSO Callout */}
              <CalloutCard value={d.dso + " days"} label="Days Sales Outstanding" color="#3b82f6" />

              {/* AR Aging Bar */}
              <div className="mt-5 mb-4">
                <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide mb-2">AR Aging</div>
                <AgingBar buckets={d.arAging} />
              </div>

              {/* Mini Aging Bucket Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                {d.arAging.map((bucket) => (
                  <BucketCard key={bucket.label} bucket={bucket} />
                ))}
              </div>

              {/* Top Overdue Debtors Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-gray-200">
                  <div className="text-[0.82rem] font-bold text-slate-800">Top Overdue Debtors</div>
                  <span className="text-[0.7rem] font-semibold text-slate-400">{d.debtors.length} accounts</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Client", "Amount", "Status"].map((h) => (
                        <th
                          key={h}
                          className="text-[0.72rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2 bg-white border-b border-gray-200"
                          style={h === "Amount" ? { textAlign: "right" } : undefined}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.debtors.map((debtor, i) => (
                      <tr
                        key={i}
                        className="cursor-pointer transition-colors hover:bg-blue-50"
                        onClick={() => openDebtor(debtor)}
                      >
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-blue-500">
                          {debtor.client}
                        </td>
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                          {fmtDollar(debtor.amount)}
                        </td>
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                          <StatusBadge status={debtor.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — ACCOUNTS PAYABLE */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5">
              <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Accounts Payable</div>

              {/* DPO Callout */}
              <CalloutCard value={d.dpo + " days"} label="Days Payable Outstanding" color="#f59e0b" />

              {/* AP Aging Bar */}
              <div className="mt-5 mb-4">
                <div className="text-[0.78rem] font-semibold text-slate-400 uppercase tracking-wide mb-2">AP Aging</div>
                <AgingBar buckets={d.apAging} />
              </div>

              {/* Mini Aging Bucket Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                {d.apAging.map((bucket) => (
                  <BucketCard key={bucket.label} bucket={bucket} />
                ))}
              </div>

              {/* Top Suppliers Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-gray-200">
                  <div className="text-[0.82rem] font-bold text-slate-800">Top Suppliers</div>
                  <span className="text-[0.7rem] font-semibold text-slate-400">{d.suppliers.length} accounts</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Supplier", "Amount Due", "Days Until Due"].map((h) => (
                        <th
                          key={h}
                          className="text-[0.72rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2 bg-white border-b border-gray-200"
                          style={h === "Amount Due" || h === "Days Until Due" ? { textAlign: "right" } : undefined}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.suppliers.map((supplier, i) => (
                      <tr
                        key={i}
                        className="cursor-pointer transition-colors hover:bg-amber-50"
                        onClick={() => openSupplier(supplier)}
                      >
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-amber-600">
                          {supplier.supplier}
                        </td>
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right font-bold text-slate-800">
                          {fmtDollar(supplier.amountDue)}
                        </td>
                        <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-right">
                          <DaysBadge days={supplier.daysUntilDue} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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

      {/* ── DEBTOR DETAIL PANEL ── */}
      <SlidePanel open={panel === "debtor"} onClose={closePanel} title="Debtor Detail" titleColor="#3b82f6">
        {selectedDebtor && (
          <>
            <PanelStatRow>
              <PanelStat label="Total Outstanding" value={fmtDollar(selectedDebtor.amount)} valueColor="#3b82f6" />
              <PanelStat label="Status" value={selectedDebtor.status} small />
            </PanelStatRow>
            <PanelSectionTitle>Client Information</PanelSectionTitle>
            <PanelListItem label="Client" value={selectedDebtor.client} />
            <PanelListItem label="Contact" value={selectedDebtor.contact} />
            <PanelListItem label="Email" value={selectedDebtor.email} />
            <PanelListItem label="Last Payment" value={selectedDebtor.lastPayment} />
            <PanelSectionTitle className="mt-5">Aging Breakdown</PanelSectionTitle>
            <PanelListItem label="Current" value={fmtDollar(selectedDebtor.aging.current)} valueColor="#22c55e" />
            <PanelListItem label="30 Days" value={fmtDollar(selectedDebtor.aging.thirty)} valueColor="#f59e0b" />
            <PanelListItem label="60 Days" value={fmtDollar(selectedDebtor.aging.sixty)} valueColor="#f97316" />
            <PanelListItem label="90+ Days" value={fmtDollar(selectedDebtor.aging.ninety)} valueColor="#ef4444" />
            <PanelActions primary="View in Xero" secondary="Send Reminder" />
          </>
        )}
      </SlidePanel>

      {/* ── SUPPLIER DETAIL PANEL ── */}
      <SlidePanel open={panel === "supplier"} onClose={closePanel} title="Supplier Detail" titleColor="#d97706">
        {selectedSupplier && (
          <>
            <PanelStatRow>
              <PanelStat label="Amount Due" value={fmtDollar(selectedSupplier.amountDue)} valueColor="#d97706" />
              <PanelStat label="Due In" value={selectedSupplier.daysUntilDue + " days"} small />
            </PanelStatRow>
            <PanelSectionTitle>Supplier Information</PanelSectionTitle>
            <PanelListItem label="Supplier" value={selectedSupplier.supplier} />
            <PanelListItem label="Contact" value={selectedSupplier.contact} />
            <PanelListItem label="Email" value={selectedSupplier.email} />
            <PanelListItem label="Last Payment" value={selectedSupplier.lastPayment} />
            <PanelSectionTitle className="mt-5">Aging Breakdown</PanelSectionTitle>
            <PanelListItem label="Current" value={fmtDollar(selectedSupplier.aging.current)} valueColor="#22c55e" />
            <PanelListItem label="30 Days" value={fmtDollar(selectedSupplier.aging.thirty)} valueColor="#f59e0b" />
            <PanelListItem label="60 Days" value={fmtDollar(selectedSupplier.aging.sixty)} valueColor="#f97316" />
            <PanelListItem label="90+ Days" value={fmtDollar(selectedSupplier.aging.ninety)} valueColor="#ef4444" />
            <PanelActions primary="View in Xero" secondary="Schedule Payment" />
          </>
        )}
      </SlidePanel>
    </>
  );
}
