import { NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

export const revalidate = 300; // Cache response for 5 minutes

interface SimproJobListItem {
  ID: number;
  Name: string;
  Stage: string;
  Status: { ID: number; Name: string; Color?: string };
  DateIssued: string;
  Total: { ExTax: number; Tax: number; IncTax: number };
}

interface JobDetail {
  ID: number;
  Totals?: {
    InvoicedValue?: number;
    InvoicePercentage?: number;
  };
}

// Active job stages in simPRO (valid values: Pending, Progress, Complete, Invoiced, Archived)
const ACTIVE_JOB_STAGES = ["Progress", "Pending"];

// Fetch all job details in parallel (cached upstream, so safe to fire all at once)
async function fetchJobDetails(jobIds: number[]): Promise<JobDetail[]> {
  const details = await Promise.all(
    jobIds.map((id) =>
      simproFetch(`/jobs/${id}`).catch((err: Error) => {
        console.error(`[pipeline] Failed to fetch job ${id}:`, err.message);
        return null;
      })
    )
  );
  return details.filter(Boolean) as JobDetail[];
}

export async function GET() {
  try {
    const listColumns = "ID,Name,Stage,Status,DateIssued,Total";

    // Fetch each active stage in parallel (jobs only, no quotes)
    const results = await Promise.all(
      ACTIVE_JOB_STAGES.map((stage) =>
        simproFetch("/jobs/", { columns: listColumns, Stage: stage })
      )
    );

    const allJobs: SimproJobListItem[] = results.flat();

    // Fetch detail for each job to get InvoicedValue
    const jobIds = allJobs.map((j) => j.ID);
    const jobDetails = await fetchJobDetails(jobIds);
    const invoicedMap = new Map<number, number>();
    for (const detail of jobDetails) {
      invoicedMap.set(detail.ID, detail.Totals?.InvoicedValue ?? 0);
    }

    // Build pipeline grouped by stage with amountRemaining
    const pipeline: Record<string, {
      count: number;
      value: number;
      items: { ID: number; Name: string; totalIncTax: number; invoicedValue: number; amountRemaining: number }[];
    }> = {};

    for (const job of allJobs) {
      const stage = job.Stage ?? "Unknown";
      if (!pipeline[stage]) pipeline[stage] = { count: 0, value: 0, items: [] };

      const totalIncTax = job.Total?.IncTax ?? 0;
      const invoicedValue = invoicedMap.get(job.ID) ?? 0;
      const amountRemaining = Math.max(0, totalIncTax - invoicedValue);

      pipeline[stage].count++;
      pipeline[stage].value += amountRemaining;
      pipeline[stage].items.push({
        ID: job.ID,
        Name: job.Name,
        totalIncTax,
        invoicedValue,
        amountRemaining,
      });
    }

    // Sort items within each stage by amountRemaining descending
    for (const stage of Object.values(pipeline)) {
      stage.items.sort((a, b) => b.amountRemaining - a.amountRemaining);
    }

    // Summary
    const pipelineValue = Object.values(pipeline).reduce((s, v) => s + v.value, 0);
    const activeJobCount = allJobs.length;
    const avgJobValue = activeJobCount > 0 ? Math.round(pipelineValue / activeJobCount) : 0;

    const response = NextResponse.json({
      fetchedAt: new Date().toISOString(),
      summary: {
        pipelineValue,
        activeJobCount,
        avgJobValue,
      },
      pipeline,
    });
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pipeline]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
