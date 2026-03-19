"use client";

import { DashboardComponentProps } from "@/types";
import { useState, useEffect, useCallback } from "react";

// -- Types --------------------------------------------------------------------
type PanelType = "asset" | null;

interface AssetCategory {
  label: string;
  active: number;
  maintenance: number;
  decommissioned: number;
}

interface MaintenanceUrgency {
  overdue: number;
  dueWithin7: number;
  dueWithin30: number;
}

interface MaintenanceLogEntry {
  date: string;
  description: string;
  cost: number;
}

interface AssetRow {
  id: string;
  type: string;
  typeColor: string;
  typeBg: string;
  description: string;
  assignedTo: string;
  status: "Active" | "In Maintenance" | "Decommissioned";
  nextService: string;
  nextServiceStatus: "On Track" | "Due Soon" | "Overdue";
  compliance: "Valid" | "Expiring" | "Expired";
  complianceExpiry: string;
  odometer: number | null;
  maintenanceLog: MaintenanceLogEntry[];
  costOfOwnership: { fuel: number; maintenance: number; regoInsurance: number; total: number };
}

interface AssetData {
  totalAssets: number;
  activePercent: number;
  activeCount: number;
  inMaintenance: number;
  upcomingServices: number;
  complianceAlerts: number;
  categories: AssetCategory[];
  urgency: MaintenanceUrgency;
  assets: AssetRow[];
}

// -- Helpers ------------------------------------------------------------------
function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function fmtDollar(v: number): string {
  return "$" + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const ASSET_TYPES: { type: string; color: string; bg: string }[] = [
  { type: "Vehicles", color: "#2563eb", bg: "bg-blue-50 text-blue-700" },
  { type: "Tools", color: "#7c3aed", bg: "bg-purple-50 text-purple-700" },
  { type: "Plant", color: "#ea580c", bg: "bg-orange-50 text-orange-700" },
  { type: "IT", color: "#0d9488", bg: "bg-teal-50 text-teal-700" },
  { type: "Safety", color: "#4f46e5", bg: "bg-indigo-50 text-indigo-700" },
];

const ASSET_TEMPLATES: { id: string; type: string; desc: string; assignedTo: string }[] = [
  { id: "AST-101", type: "Vehicles", desc: "Ford Ranger XLT \u2014 FLT-042", assignedTo: "Jake Morrison" },
  { id: "AST-204", type: "Tools", desc: "Hilti TE 60 Rotary Hammer", assignedTo: "Marcus Chen" },
  { id: "AST-087", type: "Plant", desc: "CAT 305.5E Mini Excavator", assignedTo: "Site Team Alpha" },
  { id: "AST-312", type: "IT", desc: "Dell Latitude 5540", assignedTo: "Sarah O'Brien" },
  { id: "AST-156", type: "Safety", desc: "First Aid Kit \u2014 Level 2", assignedTo: "Warehouse B" },
  { id: "AST-118", type: "Vehicles", desc: "Toyota HiAce LWB \u2014 FLT-019", assignedTo: "Dan Kowalski" },
  { id: "AST-245", type: "Tools", desc: "Makita 18V Circular Saw Kit", assignedTo: "Tom Nguyen" },
  { id: "AST-063", type: "Plant", desc: "Wacker Neuson DPU 6555 Plate Compactor", assignedTo: "Site Team Bravo" },
  { id: "AST-330", type: "IT", desc: "iPhone 15 Pro \u2014 Field Unit", assignedTo: "Emily Watson" },
  { id: "AST-178", type: "Safety", desc: "MSA G1 SCBA Breathing Apparatus", assignedTo: "Safety Officer" },
];

const MAINT_LOG_DESCS = [
  "Scheduled service \u2014 oil change & filter",
  "Brake pad replacement (front)",
  "Calibration & safety inspection",
  "Battery replacement",
  "Hydraulic hose repair",
  "Annual compliance check",
  "Electrical fault diagnosis",
  "Tyre rotation & alignment",
  "Software update & config",
  "Fire extinguisher recharge",
];

const ASSIGNED_NAMES = [
  "Jake Morrison", "Marcus Chen", "Sarah O'Brien", "Dan Kowalski",
  "Tom Nguyen", "Emily Watson", "Lisa Park", "Raj Patel",
];

const STATUSES: ("Active" | "In Maintenance" | "Decommissioned")[] = ["Active", "Active", "Active", "Active", "Active", "Active", "In Maintenance", "In Maintenance", "Decommissioned", "Active"];

const COMPLIANCE_VALS: ("Valid" | "Expiring" | "Expired")[] = ["Valid", "Valid", "Valid", "Valid", "Valid", "Expiring", "Expiring", "Expired", "Valid", "Valid"];

const SERVICE_STATUSES: ("On Track" | "Due Soon" | "Overdue")[] = ["On Track", "On Track", "On Track", "Due Soon", "Overdue", "On Track", "Due Soon", "On Track", "On Track", "Overdue"];

const CATEGORY_LABELS = ["Vehicles", "Tools / Power Equipment", "Heavy Plant", "IT Equipment", "Safety Equipment"];

function generateData(): AssetData {
  const totalAssets = rand(70, 100);
  const activePercent = rand(85, 95);
  const activeCount = Math.round((activePercent / 100) * totalAssets);
  const inMaintenance = rand(5, 10);
  const upcomingServices = rand(8, 18);
  const complianceAlerts = rand(2, 6);

  // Fleet health by category
  const categories: AssetCategory[] = CATEGORY_LABELS.map((label) => {
    const active = rand(10, 25);
    const maintenance = rand(1, 5);
    const decommissioned = rand(0, 3);
    return { label, active, maintenance, decommissioned };
  });

  // Maintenance urgency
  const overdue = rand(1, 5);
  const dueWithin7 = rand(3, 8);
  const dueWithin30 = rand(5, 14);
  const urgency: MaintenanceUrgency = { overdue, dueWithin7, dueWithin30 };

  // Asset rows
  const today = new Date();
  const assets: AssetRow[] = ASSET_TEMPLATES.map((tmpl, i) => {
    const typeInfo = ASSET_TYPES.find((t) => t.type === tmpl.type)!;
    const serviceDate = new Date(today);
    serviceDate.setDate(serviceDate.getDate() + rand(-10, 45));
    const serviceDateStr = serviceDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

    const complianceDate = new Date(today);
    complianceDate.setDate(complianceDate.getDate() + rand(-15, 180));
    const complianceDateStr = complianceDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

    const isVehicle = tmpl.type === "Vehicles";

    // maintenance log
    const logEntries: MaintenanceLogEntry[] = Array.from({ length: 3 }, (_, j) => {
      const logDate = new Date(today);
      logDate.setDate(logDate.getDate() - rand(15 + j * 30, 30 + j * 60));
      return {
        date: logDate.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
        description: MAINT_LOG_DESCS[rand(0, MAINT_LOG_DESCS.length - 1)],
        cost: rand(80, 2800),
      };
    });

    const fuel = isVehicle ? rand(800, 3200) : 0;
    const maint = rand(200, 1800);
    const rego = isVehicle ? rand(400, 1200) : rand(0, 300);
    const total = fuel + maint + rego;

    return {
      id: tmpl.id,
      type: tmpl.type,
      typeColor: typeInfo.color,
      typeBg: typeInfo.bg,
      description: tmpl.desc,
      assignedTo: tmpl.assignedTo,
      status: STATUSES[i],
      nextService: serviceDateStr,
      nextServiceStatus: SERVICE_STATUSES[i],
      compliance: COMPLIANCE_VALS[i],
      complianceExpiry: complianceDateStr,
      odometer: isVehicle ? rand(18000, 145000) : null,
      maintenanceLog: logEntries,
      costOfOwnership: { fuel, maintenance: maint, regoInsurance: rego, total },
    };
  });

  return {
    totalAssets,
    activePercent,
    activeCount,
    inMaintenance,
    upcomingServices,
    complianceAlerts,
    categories,
    urgency,
    assets,
  };
}

// -- SVG Stacked Bar Chart ----------------------------------------------------
function FleetHealthChart({ data }: { data: AssetCategory[] }) {
  const maxVal = Math.max(...data.map((d) => d.active + d.maintenance + d.decommissioned));
  const ceil = Math.ceil(maxVal / 5) * 5;
  const chartH = 180;
  const chartTop = 30;
  const chartLeft = 52;
  const chartRight = 660;
  const barW = 48;
  const gap = (chartRight - chartLeft) / data.length;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: chartTop + chartH * (1 - f),
    label: String(Math.round(ceil * f)),
  }));

  return (
    <svg viewBox="0 0 700 280" className="w-full h-auto">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={chartLeft} y1={g.y} x2={chartRight} y2={g.y}
            stroke="#e2e8f0" strokeWidth="0.5"
            strokeDasharray={i < gridLines.length - 1 ? "4" : undefined}
          />
          <text x={chartLeft - 8} y={g.y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
            {g.label}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const total = d.active + d.maintenance + d.decommissioned;
        const x = chartLeft + i * gap + (gap - barW) / 2;

        const activeH = (d.active / ceil) * chartH;
        const maintH = (d.maintenance / ceil) * chartH;
        const decommH = (d.decommissioned / ceil) * chartH;

        const decommY = chartTop + chartH - decommH;
        const maintY = decommY - maintH;
        const activeY = maintY - activeH;

        return (
          <g key={d.label}>
            {/* Total label above */}
            <text x={x + barW / 2} y={activeY - 8} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">
              {total}
            </text>
            {/* Active segment */}
            {d.active > 0 && (
              <>
                <rect x={x} y={activeY} width={barW} height={activeH} rx="3" fill="#22c55e" opacity="0.85" />
                {activeH > 14 && (
                  <text x={x + barW / 2} y={activeY + activeH / 2 + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                    {d.active}
                  </text>
                )}
              </>
            )}
            {/* Maintenance segment */}
            {d.maintenance > 0 && (
              <>
                <rect x={x} y={maintY} width={barW} height={maintH} fill="#f59e0b" opacity="0.85" />
                {maintH > 14 && (
                  <text x={x + barW / 2} y={maintY + maintH / 2 + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                    {d.maintenance}
                  </text>
                )}
              </>
            )}
            {/* Decommissioned segment */}
            {d.decommissioned > 0 && (
              <>
                <rect x={x} y={decommY} width={barW} height={decommH} rx="0 0 3 3" fill="#94a3b8" opacity="0.7" />
                {decommH > 14 && (
                  <text x={x + barW / 2} y={decommY + decommH / 2 + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                    {d.decommissioned}
                  </text>
                )}
              </>
            )}
            {/* X-axis label */}
            <text x={x + barW / 2} y={chartTop + chartH + 18} textAnchor="middle" fill="#64748b" fontSize="9.5" fontWeight="600">
              {d.label.length > 14 ? d.label.slice(0, 12) + "\u2026" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// -- Main Component -----------------------------------------------------------
export default function AssetDataDashboard({ refreshTrigger, isActive }: DashboardComponentProps) {
  const [panel, setPanel] = useState<PanelType>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [data, setData] = useState<AssetData | null>(null);
  const [flash, setFlash] = useState(false);

  // Generate data client-side only
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

  const openAsset = useCallback((asset: AssetRow) => {
    setSelectedAsset(asset);
    setPanel("asset");
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedAsset(null);
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
  const urgencyTotal = d.urgency.overdue + d.urgency.dueWithin7 + d.urgency.dueWithin30;

  return (
    <>
      <style>{`
        @keyframes cardFlash {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* COMPONENT HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white px-3 md:px-5 py-4 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <h2 className="text-xl font-bold text-slate-800">Asset Data</h2>
          <span
            className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full border"
            style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)", color: "#d97706" }}
          >
            Mock Data
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-3 md:p-6 max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <KPICard
            className={`col-span-2 md:col-span-1 ${cardFlash}`}
            borderColor="#3b82f6"
            label="Total Assets"
            value={String(d.totalAssets)}
            sub="Registered in system"
          />
          <KPICard
            className={cardFlash}
            borderColor="#22c55e"
            label="Active / In-Service"
            value={`${d.activeCount} (${d.activePercent}%)`}
            sub="Currently operational"
          />
          <KPICard
            className={cardFlash}
            borderColor="#f59e0b"
            label="In Maintenance"
            value={String(d.inMaintenance)}
            sub="Awaiting repair / service"
          />
          <KPICard
            className={cardFlash}
            borderColor="#8b5cf6"
            label="Upcoming Services"
            value={String(d.upcomingServices)}
            sub="Within 30-day window"
          />
          <KPICard
            className={cardFlash}
            borderColor="#ef4444"
            label="Compliance Alerts"
            value={String(d.complianceAlerts)}
            sub="Expired / expiring certs"
          />
        </div>

        {/* CHARTS ROW */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Fleet Health by Category */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-[1.6] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[0.92rem] font-bold text-slate-800">Fleet Health by Category</div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Active
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Maintenance
                </span>
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" /> Decommissioned
                </span>
              </div>
            </div>
            <FleetHealthChart data={d.categories} />
          </div>

          {/* Maintenance Urgency */}
          <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm p-5 lg:flex-1 min-w-0">
            <div className="text-[0.92rem] font-bold text-slate-800 mb-4">Maintenance Urgency</div>

            {/* Mini cards */}
            <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-4">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-[0.72rem] font-semibold text-red-500 uppercase tracking-wide">Overdue</div>
                <div className="text-xl font-extrabold text-red-600">{d.urgency.overdue}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-[0.72rem] font-semibold text-amber-500 uppercase tracking-wide">Due 7 Days</div>
                <div className="text-xl font-extrabold text-amber-600">{d.urgency.dueWithin7}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-[0.72rem] font-semibold text-green-500 uppercase tracking-wide">Due 30 Days</div>
                <div className="text-xl font-extrabold text-green-600">{d.urgency.dueWithin30}</div>
              </div>
            </div>

            {/* Horizontal stacked bar */}
            <div className="h-7 rounded-lg overflow-hidden flex mb-4">
              {d.urgency.overdue > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[0.7rem] font-bold text-white"
                  style={{ width: `${(d.urgency.overdue / urgencyTotal) * 100}%`, background: "#ef4444" }}
                >
                  {d.urgency.overdue}
                </div>
              )}
              {d.urgency.dueWithin7 > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[0.7rem] font-bold text-white"
                  style={{ width: `${(d.urgency.dueWithin7 / urgencyTotal) * 100}%`, background: "#f59e0b" }}
                >
                  {d.urgency.dueWithin7}
                </div>
              )}
              {d.urgency.dueWithin30 > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[0.7rem] font-bold text-white"
                  style={{ width: `${(d.urgency.dueWithin30 / urgencyTotal) * 100}%`, background: "#22c55e" }}
                >
                  {d.urgency.dueWithin30}
                </div>
              )}
            </div>

            {/* Alert box for overdue */}
            {d.urgency.overdue > 0 && (
              <div className="border-2 border-red-300 bg-red-50 rounded-lg px-4 py-3 flex items-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1L17 16H1L9 1Z" stroke="#dc2626" strokeWidth="1.5" fill="none" />
                  <path d="M9 7V10M9 12.5V13" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[0.85rem] font-semibold text-red-700">
                  {d.urgency.overdue} asset{d.urgency.overdue > 1 ? "s" : ""} overdue for maintenance
                </span>
              </div>
            )}

            {/* Breakdown list */}
            <div className="mt-4 flex flex-col gap-2.5">
              <UrgencyRow label="Overdue" count={d.urgency.overdue} color="#ef4444" total={urgencyTotal} />
              <UrgencyRow label="Due Within 7 Days" count={d.urgency.dueWithin7} color="#f59e0b" total={urgencyTotal} />
              <UrgencyRow label="Due Within 30 Days" count={d.urgency.dueWithin30} color="#22c55e" total={urgencyTotal} />
            </div>
          </div>
        </div>

        {/* ASSET INVENTORY TABLE */}
        <div className="bg-white rounded-[10px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="text-[0.92rem] font-bold text-slate-800">Asset Inventory</div>
            <span className="text-[0.72rem] font-semibold text-slate-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              Showing 10 of {d.totalAssets}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  {["Asset ID", "Type", "Description", "Assigned To", "Status", "Next Service", "Compliance"].map((h) => (
                    <th
                      key={h}
                      className="text-[0.73rem] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-2.5 bg-slate-50 border-b border-gray-200"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.assets.map((asset, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => openAsset(asset)}
                  >
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-mono font-semibold text-slate-700">
                      {asset.id}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <span className={`text-[0.72rem] font-semibold px-2 py-0.5 rounded ${asset.typeBg}`}>
                        {asset.type}
                      </span>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 font-semibold text-slate-800">
                      {asset.description}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200 text-slate-500">
                      {asset.assignedTo}
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{asset.nextService}</span>
                        <ServiceStatusDot status={asset.nextServiceStatus} />
                      </div>
                    </td>
                    <td className="text-[0.85rem] px-4 py-3 border-b border-gray-200">
                      <ComplianceBadge compliance={asset.compliance} />
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

      {/* -- SLIDE PANEL -- */}
      <SlidePanel open={panel === "asset"} onClose={closePanel} title="Asset Detail" titleColor="#2563eb">
        {selectedAsset && (
          <>
            {/* Asset Info */}
            <PanelSectionTitle>Asset Information</PanelSectionTitle>
            <PanelListItem label="Asset ID" value={selectedAsset.id} />
            <PanelListItem label="Type" value={selectedAsset.type} />
            <PanelListItem label="Description" value={selectedAsset.description} />
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={selectedAsset.status} />
            </div>
            <PanelListItem label="Assigned To" value={selectedAsset.assignedTo} />
            {selectedAsset.odometer !== null && (
              <PanelListItem label="Odometer" value={selectedAsset.odometer.toLocaleString() + " km"} />
            )}

            {/* Service */}
            <PanelSectionTitle className="mt-5">Service Schedule</PanelSectionTitle>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Next Service</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedAsset.nextService}</span>
                <ServiceStatusDot status={selectedAsset.nextServiceStatus} />
              </div>
            </div>
            <PanelListItem label="Service Status" value={selectedAsset.nextServiceStatus} />

            {/* Compliance */}
            <PanelSectionTitle className="mt-5">Compliance</PanelSectionTitle>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 text-[0.88rem]">
              <span className="text-slate-500">Status</span>
              <ComplianceBadge compliance={selectedAsset.compliance} />
            </div>
            <PanelListItem label="Expiry Date" value={selectedAsset.complianceExpiry} />

            {/* Maintenance Log */}
            <PanelSectionTitle className="mt-5">Recent Maintenance Log</PanelSectionTitle>
            <div className="flex flex-col gap-2.5">
              {selectedAsset.maintenanceLog.map((entry, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.78rem] font-semibold text-slate-700">{entry.date}</span>
                    <span className="text-[0.78rem] font-bold text-slate-800">{fmtDollar(entry.cost)}</span>
                  </div>
                  <div className="text-[0.82rem] text-slate-500">{entry.description}</div>
                </div>
              ))}
            </div>

            {/* Cost of Ownership YTD */}
            <PanelSectionTitle className="mt-5">Cost of Ownership (YTD)</PanelSectionTitle>
            {selectedAsset.costOfOwnership.fuel > 0 && (
              <PanelListItem label="Fuel" value={fmtDollar(selectedAsset.costOfOwnership.fuel)} />
            )}
            <PanelListItem label="Maintenance" value={fmtDollar(selectedAsset.costOfOwnership.maintenance)} />
            <PanelListItem label="Rego / Insurance" value={fmtDollar(selectedAsset.costOfOwnership.regoInsurance)} />
            <div className="flex items-center justify-between py-2.5 mt-1 text-[0.92rem]">
              <span className="font-bold text-slate-800">Total YTD</span>
              <span className="font-extrabold text-slate-900">{fmtDollar(selectedAsset.costOfOwnership.total)}</span>
            </div>

            <PanelActions primary="View Full History" secondary="Export PDF" />
          </>
        )}
      </SlidePanel>
    </>
  );
}

// -- Sub-components -----------------------------------------------------------

function KPICard({
  borderColor,
  label,
  value,
  sub,
  className,
}: {
  borderColor: string;
  label: string;
  value: string;
  sub: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-[10px] border border-gray-200 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${className ?? ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="text-[0.78rem] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-[1.6rem] font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[0.82rem] text-slate-400 mt-1.5 font-medium">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "Active" | "In Maintenance" | "Decommissioned" }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-600",
    "In Maintenance": "bg-amber-50 text-amber-600",
    Decommissioned: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${styles[status]}`}>
      {status}
    </span>
  );
}

function ComplianceBadge({ compliance }: { compliance: "Valid" | "Expiring" | "Expired" }) {
  const styles = {
    Valid: "bg-emerald-50 text-emerald-600",
    Expiring: "bg-amber-50 text-amber-600",
    Expired: "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-[0.72rem] font-semibold px-2.5 py-0.5 rounded-xl ${styles[compliance]}`}>
      {compliance}
    </span>
  );
}

function ServiceStatusDot({ status }: { status: "On Track" | "Due Soon" | "Overdue" }) {
  const colors = { "On Track": "#22c55e", "Due Soon": "#f59e0b", Overdue: "#ef4444" };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: colors[status] }}
      title={status}
    />
  );
}

function UrgencyRow({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
          <span className="text-[0.82rem] font-semibold text-slate-700">{label}</span>
        </div>
        <div>
          <span className="text-[0.82rem] font-bold text-slate-800">{count}</span>
          <span className="text-[0.7rem] font-semibold text-slate-400 ml-1">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm" style={{ width: pct + "%", background: color }} />
      </div>
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
