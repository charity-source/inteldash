import { NextResponse } from "next/server";

const BASE_URL = process.env.SIMPRO_BASE_URL;
const TOKEN = process.env.SIMPRO_API_TOKEN;

async function tryFilter(label: string, filterValue: string): Promise<{ label: string; filter: string; count: number | string; status: number; url?: string; sample?: string }> {
  try {
    const url = new URL(`${BASE_URL}/invoices/`);
    url.searchParams.set("columns", "ID,DateIssued");
    url.searchParams.set("pageSize", "5");
    url.searchParams.set("if", filterValue);

    const fullUrl = url.toString();
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return { label, filter: filterValue, count: `error: ${res.status}`, status: res.status, url: fullUrl, sample: body.substring(0, 300) };
    }

    const data = await res.json();
    const count = Array.isArray(data) ? data.length : "not-array";
    const sample = Array.isArray(data) ? JSON.stringify(data.slice(0, 2)) : JSON.stringify(data).substring(0, 200);
    return { label, filter: filterValue, count, status: res.status, url: fullUrl, sample };
  } catch (err) {
    return { label, filter: filterValue, count: `exception: ${(err as Error).message}`, status: 0 };
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  // Use a FUTURE date — a working filter should return 0 results
  const futureDate = "2099-01-01";
  // Use a very old date — a working filter should return 5 (same as no filter)
  const oldDate = "2000-01-01";

  const results = await Promise.all([
    // Baseline: no filter
    (async () => {
      const url = new URL(`${BASE_URL}/invoices/`);
      url.searchParams.set("columns", "ID,DateIssued");
      url.searchParams.set("pageSize", "5");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      return {
        label: "BASELINE (no filter)",
        filter: "(none)",
        count: Array.isArray(data) ? data.length : "not-array",
        status: res.status,
        url: url.toString(),
        sample: Array.isArray(data) ? JSON.stringify(data.slice(0, 1)) : "",
      };
    })(),

    // Future date tests — a working filter returns 0
    tryFilter("ge() future", `DateIssued ge(${futureDate})`),
    tryFilter("gt() future", `DateIssued gt(${futureDate})`),
    tryFilter(">= future", `DateIssued>=${futureDate}`),
    tryFilter("> future", `DateIssued>${futureDate}`),
    tryFilter("ge space future", `DateIssued ge ${futureDate}`),
    tryFilter("gt space future", `DateIssued gt ${futureDate}`),
    tryFilter("=ge() future", `DateIssued=ge(${futureDate})`),
    tryFilter("between future", `DateIssued between(${futureDate},2099-12-31)`),

    // Old date tests — a working filter returns 5 (same as baseline)
    tryFilter("ge() old", `DateIssued ge(${oldDate})`),
    tryFilter("=ge() old", `DateIssued=ge(${oldDate})`),
  ]);

  return NextResponse.json({
    note: "Future-date filters should return 0 if working, 5 if ignored",
    futureDate,
    oldDate,
    results,
  });
}
