import { NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

export const revalidate = 300; // Cache response for 5 minutes

interface InvoiceListItem {
  ID: number;
  Type: string;
  DateIssued: string;
  Total: {
    ExTax: number;
    IncTax: number;
    Tax: number;
    BalanceDue: number;
  };
  IsPaid: boolean;
  DatePaid: string;
  Customer: { ID: number; CompanyName: string };
}

interface JobDetail {
  ID: number;
  Name: string;
  Totals?: {
    GrossMargin?: { Actual: number; Estimate: number };
    GrossProfitLoss?: number;
    InvoicedValue?: number;
    InvoicePercentage?: number;
  };
}

function getMonthStart(): { start: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const label = now.toLocaleString("en-AU", { month: "long", year: "numeric" });
  return { start, label };
}

// Fetch all job details in parallel (cached upstream, so safe to fire all at once)
async function fetchJobDetails(jobIds: number[]): Promise<JobDetail[]> {
  const details = await Promise.all(
    jobIds.map((id) =>
      simproFetch(`/jobs/${id}`).catch((err: Error) => {
        console.error(`[invoiced] Failed to fetch job ${id}:`, err.message);
        return null;
      })
    )
  );
  return details.filter(Boolean) as JobDetail[];
}

export async function GET() {
  try {
    const { start, label } = getMonthStart();

    const invoiceColumns = "ID,Type,DateIssued,Total,IsPaid,DatePaid,Customer";
    const dateFilter = `DateIssued gt ${start}`;

    const invoices: InvoiceListItem[] = await simproFetch("/invoices/", {
      columns: invoiceColumns,
      if: dateFilter,
    });

    // --- Invoice totals ---
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.Total?.IncTax ?? 0), 0);
    const totalExTax = invoices.reduce((sum, inv) => sum + (inv.Total?.ExTax ?? 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.Total?.BalanceDue ?? 0), 0);
    const paidInvoices = invoices.filter((inv) => inv.IsPaid);
    const unpaidInvoices = invoices.filter((inv) => !inv.IsPaid);
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.Total?.IncTax ?? 0), 0);

    // --- By type breakdown ---
    const byType: Record<string, { count: number; value: number }> = {};
    for (const inv of invoices) {
      const t = inv.Type ?? "Unknown";
      if (!byType[t]) byType[t] = { count: 0, value: 0 };
      byType[t].count++;
      byType[t].value += inv.Total?.IncTax ?? 0;
    }

    // --- By customer breakdown (top 20) ---
    const byCustomer: Record<string, { count: number; value: number }> = {};
    for (const inv of invoices) {
      const name = inv.Customer?.CompanyName ?? "Unknown";
      if (!byCustomer[name]) byCustomer[name] = { count: 0, value: 0 };
      byCustomer[name].count++;
      byCustomer[name].value += inv.Total?.IncTax ?? 0;
    }
    const topCustomers = Object.entries(byCustomer)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 20)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {} as Record<string, { count: number; value: number }>);

    // --- Gross margin from linked jobs (capped at 20 for speed) ---
    const jobsThisMonth = await simproFetch("/jobs/", {
      columns: "ID,Name,Stage,DateIssued,Total",
      if: dateFilter,
    });

    const jobIds: number[] = jobsThisMonth
      .filter((j: { Stage: string }) => j.Stage === "Progress" || j.Stage === "Complete" || j.Stage === "Invoiced")
      .map((j: { ID: number }) => j.ID)
      .slice(0, 20);

    let marginData = {
      jobsAnalysed: 0,
      avgGrossMarginActual: 0,
      avgGrossMarginEstimate: 0,
      totalGrossProfitLoss: 0,
      totalInvoicedOnJobs: 0,
    };

    if (jobIds.length > 0) {
      const jobDetails = await fetchJobDetails(jobIds);
      const withMargin = jobDetails.filter((j) => j.Totals?.GrossMargin);

      if (withMargin.length > 0) {
        const sumActual = withMargin.reduce((s, j) => s + (j.Totals?.GrossMargin?.Actual ?? 0), 0);
        const sumEstimate = withMargin.reduce((s, j) => s + (j.Totals?.GrossMargin?.Estimate ?? 0), 0);
        const sumProfit = withMargin.reduce((s, j) => s + (j.Totals?.GrossProfitLoss ?? 0), 0);
        const sumInvoiced = withMargin.reduce((s, j) => s + (j.Totals?.InvoicedValue ?? 0), 0);

        marginData = {
          jobsAnalysed: withMargin.length,
          avgGrossMarginActual: Math.round((sumActual / withMargin.length) * 100) / 100,
          avgGrossMarginEstimate: Math.round((sumEstimate / withMargin.length) * 100) / 100,
          totalGrossProfitLoss: Math.round(sumProfit * 100) / 100,
          totalInvoicedOnJobs: Math.round(sumInvoiced * 100) / 100,
        };
      }
    }

    const response = NextResponse.json({
      period: label,
      periodStart: start,
      fetchedAt: new Date().toISOString(),
      summary: {
        invoiceCount: invoices.length,
        totalInvoiced,
        totalExTax,
        totalPaid,
        totalOutstanding,
        paidCount: paidInvoices.length,
        unpaidCount: unpaidInvoices.length,
      },
      breakdown: {
        byType,
        byCustomer: topCustomers,
      },
      grossMargin: marginData,
    });
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[invoiced]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
