import { NextResponse } from "next/server";
import {
  listSheetTabs,
  fetchSummaryTable,
  fetchWeeklyDetails,
  getRecentWeeklyTabs,
} from "@/lib/google-sheets";

export const revalidate = 300; // ISR: cache for 5 minutes

export async function GET() {
  try {
    // 1. Get all tab names to find weekly detail tabs
    const allTabs = await listSheetTabs();
    const weeklyTabs = getRecentWeeklyTabs(allTabs, 12);

    // 2. Fetch summary table and weekly details in parallel
    const [summary, weeklyDetails] = await Promise.all([
      fetchSummaryTable(),
      fetchWeeklyDetails(weeklyTabs),
    ]);

    // 3. Assemble response matching TechData interface
    const data = {
      summary,
      weeklyDetails,
      lastUpdated: new Date().toISOString(),
      weekCount: summary.length,
      tabsLoaded: weeklyDetails.length,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[technician] Google Sheets error:", message);
    return NextResponse.json(
      { error: "Failed to fetch technician recovery data", detail: message },
      { status: 500 }
    );
  }
}
