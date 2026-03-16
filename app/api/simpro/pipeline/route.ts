import { NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

interface SimproListItem {
  ID: number;
  Name: string;
  Stage: string;
  Status: { ID: number; Name: string; Color?: string };
  DateIssued: string;
  Total: { ExTax: number; Tax: number; IncTax: number };
}

// Active stages — adjust if simPRO uses different names
const ACTIVE_JOB_STAGES = ["Progress", "Pending"];
const ACTIVE_QUOTE_STAGES = ["Pending", "Approved"];

function groupByStage(items: SimproListItem[]) {
  const map: Record<string, { count: number; value: number; items: { ID: number; Name: string; value: number }[] }> = {};
  for (const item of items) {
    const stage = item.Stage ?? "Unknown";
    if (!map[stage]) map[stage] = { count: 0, value: 0, items: [] };
    map[stage].count++;
    const val = item.Total?.IncTax ?? 0;
    map[stage].value += val;
    map[stage].items.push({ ID: item.ID, Name: item.Name, value: val });
  }
  // Sort items within each stage by value descending
  for (const stage of Object.values(map)) {
    stage.items.sort((a, b) => b.value - a.value);
  }
  return map;
}

export async function GET() {
  try {
    const listColumns = "ID,Name,Stage,Status,DateIssued,Total";

    // Fetch each active stage in parallel
    const jobFetches = ACTIVE_JOB_STAGES.map((stage) =>
      simproFetch("/jobs/", { columns: listColumns, Stage: stage })
    );
    const quoteFetches = ACTIVE_QUOTE_STAGES.map((stage) =>
      simproFetch("/quotes/", { columns: listColumns, Stage: stage })
    );

    const results = await Promise.all([...jobFetches, ...quoteFetches]);

    // Split results back into jobs vs quotes
    const allJobs: SimproListItem[] = results
      .slice(0, ACTIVE_JOB_STAGES.length)
      .flat();
    const allQuotes: SimproListItem[] = results
      .slice(ACTIVE_JOB_STAGES.length)
      .flat();

    const jobTotal = allJobs.reduce((sum, j) => sum + (j.Total?.IncTax ?? 0), 0);
    const quoteTotal = allQuotes.reduce((sum, q) => sum + (q.Total?.IncTax ?? 0), 0);

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      summary: {
        totalPipelineValue: jobTotal + quoteTotal,
        jobs: { count: allJobs.length, value: jobTotal },
        quotes: { count: allQuotes.length, value: quoteTotal },
      },
      pipeline: {
        jobs: groupByStage(allJobs),
        quotes: groupByStage(allQuotes),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pipeline]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
