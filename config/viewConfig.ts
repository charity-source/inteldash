export type DashboardRole = "IDV0" | "IDV1" | "IDVT";

export const VALID_ROLES: readonly string[] = ["IDV0", "IDV1", "IDVT"] as const;

export interface TabConfig {
  id: string;
  label: string;
  href: string;
}

export const ALL_TABS: TabConfig[] = [
  { id: "finance", label: "Finance Dashboard", href: "/finance" },
  { id: "pipeline", label: "Pipeline Data", href: "/pipeline" },
  { id: "invoiced", label: "Invoiced + Gross Margin", href: "/invoiced" },
  { id: "accounts", label: "Accounts Pay/Rec", href: "/accounts" },
  { id: "new-works", label: "New Works Volume", href: "/new-works" },
  { id: "technician", label: "Technician Recovery", href: "/technician" },
  { id: "assets", label: "Asset Data", href: "/assets" },
  { id: "ops-kpis", label: "Operations Management KPIs", href: "/ops-kpis" },
];

export const ROLE_TABS: Record<DashboardRole, string[]> = {
  IDV0: [
    "finance",
    "pipeline",
    "invoiced",
    "accounts",
    "new-works",
    "technician",
    "assets",
    "ops-kpis",
  ],
  IDV1: ["pipeline", "new-works", "assets"],
  IDVT: ["technician"],
};

export function getTabsForRole(role: DashboardRole): TabConfig[] {
  const allowedIds = ROLE_TABS[role];
  return ALL_TABS.filter((tab) => allowedIds.includes(tab.id));
}

export function isValidRole(role: string): role is DashboardRole {
  return VALID_ROLES.includes(role);
}
