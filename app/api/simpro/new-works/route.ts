import { NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

export const revalidate = 300; // Cache response for 5 minutes
interface SimproListItem {
  ID: number;
  Name: string;
  Stage: string;
  Status: { ID: number; Name: string; Color?: string };
  DateIssued: string;
  Total: { ExTax: number; Tax: number; IncTax: number };
}

function getMonthStart(): { start: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const label = now.toLocaleString("en-AU", { month: "long", year: "numeric" });
  return { start, label };
}

function groupByStage(items: SimproListItem[]) {
  const map: Record<string, { count: number; value: number }> = {};
  for (const item of items) {
    const stage = item.Stage ?? "Unknown";
    if (!map[stage]) map[stage] = { count: 0, value: 0 };
    map[stage].count++;
    map[stage].value += item.Total?.IncTax ?? 0;
  }
  return map;
}

export async function GET() {
  try {
    const { start, label } = getMonthStart();

    const listColumns = "ID,Name,Stage,Status,DateIssued,Total";

    // simPRO ignores `if` filter — fetch all, filter client-side
    const [allJobs, allQuotes] = await Promise.all([
      simproFetch("/jobs/", { columns: listColumns }),
      simproFetch("/quotes/", { columns: listColumns }),
    ]);
    const jobs = allJobs.filter((j: SimproListItem) => j.DateIssued >= start);
    const quotes = allQuotes.filter((q: SimproListItem) => q.DateIssued >= start);

    const jobCount = jobs.length;
    const quoteCount = quotes.length;
    const jobValue = jobs.reduce((sum: number, j: SimproListItem) => sum + (j.Total?.IncTax ?? 0), 0);
    const quoteValue = quotes.reduce((sum: number, q: SimproListItem) => sum + (q.Total?.IncTax ?? 0), 0);

    const response = NextResponse.json({
      period: label,
      periodStart: start,
      fetchedAt: new Date().toISOString(),
      summary: {
        totalItems: jobCount + quoteCount,
        totalValue: jobValue + quoteValue,
        jobs: { count: jobCount, value: jobValue },
        quotes: { count: quoteCount, value: quoteValue },
      },
      breakdown: {
        jobsByStage: groupByStage(jobs),
        quotesByStage: groupByStage(quotes),
      },
    });
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[new-works]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
