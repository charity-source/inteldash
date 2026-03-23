import { NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

export const revalidate = 3600;

interface InvoiceListItem {
  ID: number;
  DateIssued: string;
  Total: { ExTax: number };
}

interface SimproJobListItem {
  ID: number;
  Name: string;
  Stage: string;
  Status: { ID: number; Name: string; Color?: string };
  Total: { ExTax: number; IncTax: number };
}

interface JobDetail {
  ID: number;
  Totals?: { InvoicedValue?: number };
}

const ACTIVE_JOB_STAGES = ["Progress", "Pending"];

function getStartDates(): { month: string; ytd: string; rolling12: string } {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Calendar year YTD (Jan 1)
  const ytd = `${now.getFullYear()}-01-01`;

  const r12 = new Date(now);
  r12.setMonth(r12.getMonth() - 12);
  const rolling12 = r12.toISOString().split("T")[0];

  return { month, ytd, rolling12 };
}

async function fetchJobDetails(jobIds: number[]): Promise<JobDetail[]> {
  const details = await Promise.all(
    jobIds.map((id) =>
      simproFetch(`/jobs/${id}`).catch((err: Error) => {
        console.error(`[ops-kpis] Failed to fetch job ${id}:`, err.message);
        return null;
      })
    )
  );
  return details.filter(Boolean) as JobDetail[];
}

export async function GET() {
  try {
    const dates = getStartDates();

    // Fetch invoices and pipeline jobs in parallel
    const [allInvoices, ...pipelineResults] = await Promise.all([
      simproFetch("/invoices/", { columns: "ID,DateIssued,Total" }) as Promise<InvoiceListItem[]>,
      ...ACTIVE_JOB_STAGES.map((stage) =>
        simproFetch("/jobs/", {
          columns: "ID,Name,Stage,Status,Total",
          Stage: stage,
        }) as Promise<SimproJobListItem[]>
      ),
    ]);

    // --- Section A: Invoiced totals for 3 periods ---
    const monthInvoices = allInvoices.filter((inv) => inv.DateIssued >= dates.month);
    const ytdInvoices = allInvoices.filter((inv) => inv.DateIssued >= dates.ytd);
    const rolling12Invoices = allInvoices.filter((inv) => inv.DateIssued >= dates.rolling12);

    const invoicedMonth = monthInvoices.reduce((sum, inv) => sum + (inv.Total?.ExTax ?? 0), 0);
    const invoicedYTD = ytdInvoices.reduce((sum, inv) => sum + (inv.Total?.ExTax ?? 0), 0);
    const invoicedRolling12 = rolling12Invoices.reduce((sum, inv) => sum + (inv.Total?.ExTax ?? 0), 0);

    // --- Section B: Pipeline value ---
    const allPipelineJobs = pipelineResults.flat();
    const jobIds = allPipelineJobs.map((j) => j.ID);
    const jobDetails = await fetchJobDetails(jobIds);

    const invoicedMap = new Map<number, number>();
    for (const detail of jobDetails) {
      invoicedMap.set(detail.ID, detail.Totals?.InvoicedValue ?? 0);
    }

    let totalPipelineValue = 0;
    const byStage: Record<string, { count: number; value: number }> = {};

    for (const job of allPipelineJobs) {
      const totalExTax = job.Total?.ExTax ?? 0;
      const totalIncTax = job.Total?.IncTax ?? 0;
      const invoicedValue = invoicedMap.get(job.ID) ?? 0;
      const remainingIncTax = Math.max(0, totalIncTax - invoicedValue);
      const amountRemaining =
        totalIncTax > 0
          ? Math.round(remainingIncTax * (totalExTax / totalIncTax) * 100) / 100
          : 0;

      totalPipelineValue += amountRemaining;

      const stage = job.Stage ?? "Unknown";
      if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
      byStage[stage].count++;
      byStage[stage].value += amountRemaining;
    }

    const response = NextResponse.json({
      fetchedAt: new Date().toISOString(),
      invoiced: {
        month: invoicedMonth,
        ytd: invoicedYTD,
        rolling12: invoicedRolling12,
      },
      pipeline: {
        totalValue: totalPipelineValue,
        jobCount: allPipelineJobs.length,
        byStage,
      },
    });
    response.headers.set(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=7200"
    );
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ops-kpis]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
