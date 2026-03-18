import { NextRequest, NextResponse } from "next/server";
import { simproFetch } from "@/lib/simpro";

export const revalidate = 300;

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

function getPeriodRange(period?: string | null): { start: string; label: string } {
  const now = new Date();
  if (period === "ytd") {
    // Australian financial year: July 1 – June 30
    const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(fyStartYear, 6, 1).toISOString().split("T")[0];
    return { start, label: `FY ${fyStartYear}–${fyStartYear + 1} YTD` };
  }
  if (period === "rolling12") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 12);
    const start = d.toISOString().split("T")[0];
    return { start, label: "Rolling 12 Months" };
  }
  // Default: current month
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const label = now.toLocaleString("en-AU", { month: "long", year: "numeric" });
  return { start, label };
}

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

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period");
    const { start, label } = getPeriodRange(period);

    const invoiceColumns = "ID,Type,DateIssued,Total,IsPaid,DatePaid,Customer";
    const dateFilter = `DateIssued>=${start}`;

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

    // --- By customer breakdown (top 20, ex-tax) ---
    const byCustomer: Record<string, { count: number; value: number }> = {};
    for (const inv of invoices) {
      const name = inv.Customer?.CompanyName ?? "Unknown";
      if (!byCustomer[name]) byCustomer[name] = { count: 0, value: 0 };
      byCustomer[name].count++;
      byCustomer[name].value += inv.Total?.ExTax ?? 0;
    }
    const topCustomers = Object.entries(byCustomer)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 20)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {} as Record<string, { count: number; value: number }>);

    // --- Jobs in period: gross margin + top projects ---
    const jobsInPeriod: { ID: number; Name: string; Stage: string; Total: { ExTax: number } }[] =
      await simproFetch("/jobs/", {
        columns: "ID,Name,Stage,DateIssued,Total",
        if: dateFilter,
      });

    const activeJobs = jobsInPeriod.filter(
      (j) => j.Stage === "Progress" || j.Stage === "Complete" || j.Stage === "Invoiced"
    );

    // Top projects by ex-tax value (top 10)
    const topProjects = activeJobs
      .map((j) => ({ name: j.Name, value: j.Total?.ExTax ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Gross margin from job details (capped at 20 for speed)
    const jobIds = activeJobs.map((j) => j.ID).slice(0, 20);

    let marginData = {
      jobsAnalysed: 0,
      avgGrossMarginActual: 0,
    };

    if (jobIds.length > 0) {
      const jobDetails = await fetchJobDetails(jobIds);
      const withMargin = jobDetails.filter((j) => j.Totals?.GrossMargin);

      if (withMargin.length > 0) {
        const sumActual = withMargin.reduce((s, j) => s + (j.Totals?.GrossMargin?.Actual ?? 0), 0);
        marginData = {
          jobsAnalysed: withMargin.length,
          avgGrossMarginActual: Math.round((sumActual / withMargin.length) * 100) / 100,
        };
      }
    }

    const response = NextResponse.json({
      period: label,
      periodStart: start,
      fetchedAt: new Date().toISOString(),
      summary: {
        invoiceCount: invoices.length,
        totalExTax,
      },
      breakdown: {
        byCustomer: topCustomers,
        topProjects,
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
