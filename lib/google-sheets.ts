import { google, sheets_v4 } from "googleapis";

/* ── Types ─────────────────────────────────────────────── */

interface TechRates {
  [key: string]: number | null;
}

export interface SummaryWeek {
  weekEnding: string;
  groupRate: number | null;
  technicians: TechRates;
}

export interface WeeklyTech {
  name: string;
  actual: number;
  costed: number;
  recovery: number | null;
}

export interface WeeklyDetail {
  tabName: string;
  technicians: WeeklyTech[];
  group: { actual: number; costed: number; recovery: number | null } | null;
}

/* ── Config ────────────────────────────────────────────── */

const TECH_NAMES = ["Roja", "Vishwa", "Wenxiao", "Louise", "Quoc"];

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SA_KEY = process.env.GOOGLE_PRIVATE_KEY;

/* ── Auth singleton ────────────────────────────────────── */

let _sheets: sheets_v4.Sheets | null = null;

function getSheets(): sheets_v4.Sheets {
  if (_sheets) return _sheets;

  if (!SA_EMAIL || !SA_KEY || !SHEET_ID) {
    throw new Error(
      "Missing Google Sheets env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID"
    );
  }

  const auth = new google.auth.JWT({
    email: SA_EMAIL,
    key: SA_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  _sheets = google.sheets({ version: "v4", auth });
  return _sheets;
}

/* ── Parsing helpers ───────────────────────────────────── */

function parsePercent(val: string | undefined): number | null {
  if (!val || val.trim() === "" || val === "-" || val === "#DIV/0!") return null;
  const cleaned = val.replace("%", "").replace(",", "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // If the value had a % sign or is > 2, it's a percentage like 121.94 → divide by 100
  // If it's already a decimal ratio (e.g. 1.2194), keep as-is
  if (val.includes("%") || Math.abs(num) > 2) return num / 100;
  return num;
}

function parseDollar(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/* ── Tab name utilities ────────────────────────────────── */

const WEEKLY_TAB_RE = /^\d{6}-\d{6}$/;

function parseTabEndDate(tabName: string): Date {
  const endPart = tabName.split("-")[1]; // e.g., "180326"
  const day = parseInt(endPart.substring(0, 2), 10);
  const month = parseInt(endPart.substring(2, 4), 10) - 1; // 0-indexed
  const year = 2000 + parseInt(endPart.substring(4, 6), 10);
  return new Date(year, month, day);
}

/* ── Public API ────────────────────────────────────────── */

export async function listSheetTabs(): Promise<string[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID!,
    fields: "sheets.properties.title",
  });
  return (res.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean);
}

export async function fetchSummaryTable(): Promise<SummaryWeek[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: "'Summary Table'!A1:G200",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  // Row 0 is header: w/e, Group, Roja, Vishwa, Wenxiao, Louise, Quoc
  const results: SummaryWeek[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const weekEnding = row[0]?.trim();
    if (!weekEnding) continue;

    const groupRate = parsePercent(row[1]);
    const technicians: TechRates = {};
    for (let t = 0; t < TECH_NAMES.length; t++) {
      technicians[TECH_NAMES[t]] = parsePercent(row[2 + t]);
    }

    results.push({ weekEnding, groupRate, technicians });
  }

  return results;
}

export async function fetchWeeklyDetails(tabNames: string[]): Promise<WeeklyDetail[]> {
  if (tabNames.length === 0) return [];

  const sheets = getSheets();
  const ranges = tabNames.map((name) => `'${name}'!A1:D7`);

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID!,
    ranges,
  });

  return (res.data.valueRanges || []).map((vr, i) => {
    return parseDetailTab(tabNames[i], vr.values || []);
  });
}

function parseDetailTab(tabName: string, rows: string[][]): WeeklyDetail {
  const technicians: WeeklyTech[] = [];
  let group: { actual: number; costed: number; recovery: number | null } | null = null;

  // Row 0: header (blank, Actual, Costed, Recovery)
  // Rows 1-5: per technician
  // Row 6: Group totals
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[0]?.trim();
    if (!name) continue;

    const actual = parseDollar(row[1]);
    const costed = parseDollar(row[2]);
    const recovery = parsePercent(row[3]);

    if (name.toLowerCase() === "group") {
      group = { actual, costed, recovery };
    } else {
      technicians.push({ name, actual, costed, recovery });
    }
  }

  return { tabName, technicians, group };
}

export function getRecentWeeklyTabs(allTabs: string[], count: number = 12): string[] {
  return allTabs
    .filter((name) => WEEKLY_TAB_RE.test(name))
    .sort((a, b) => parseTabEndDate(b).getTime() - parseTabEndDate(a).getTime())
    .slice(0, count);
}
