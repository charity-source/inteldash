import { NextResponse } from "next/server";

const BASE_URL = process.env.SIMPRO_BASE_URL;
const TOKEN = process.env.SIMPRO_API_TOKEN;

async function tryFilter(filterValue: string): Promise<{ filter: string; count: number | string; status: number; sample?: string }> {
  try {
    const url = new URL(`${BASE_URL}/invoices/`);
    url.searchParams.set("columns", "ID,DateIssued");
    url.searchParams.set("pageSize", "5");
    url.searchParams.set("if", filterValue);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return { filter: filterValue, count: `error: ${res.status}`, status: res.status, sample: body.substring(0, 200) };
    }

    const data = await res.json();
    const count = Array.isArray(data) ? data.length : "not-array";
    const sample = Array.isArray(data) ? JSON.stringify(data.slice(0, 2)) : JSON.stringify(data).substring(0, 200);
    return { filter: filterValue, count, status: res.status, sample };
  } catch (err) {
    return { filter: filterValue, count: `exception: ${(err as Error).message}`, status: 0 };
  }
}

export async function GET() {
  const start = "2026-03-01";

  // Try every plausible syntax
  const results = await Promise.all([
    tryFilter(`DateIssued ge(${start})`),
    tryFilter(`DateIssued gt(${start})`),
    tryFilter(`DateIssued>=${start}`),
    tryFilter(`DateIssued>${start}`),
    tryFilter(`DateIssued ge ${start}`),
    tryFilter(`DateIssued gt ${start}`),
    tryFilter(`DateIssued='ge(${start})'`),
    tryFilter(`DateIssued=ge(${start})`),
  ]);

  // Also try with no filter to see the baseline count
  try {
    const url = new URL(`${BASE_URL}/invoices/`);
    url.searchParams.set("columns", "ID,DateIssued");
    url.searchParams.set("pageSize", "5");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    results.unshift({
      filter: "(no filter - baseline)",
      count: Array.isArray(data) ? data.length : "not-array",
      status: res.status,
      sample: Array.isArray(data) ? JSON.stringify(data.slice(0, 2)) : "",
    });
  } catch (err) {
    results.unshift({ filter: "(no filter)", count: `error: ${(err as Error).message}`, status: 0 });
  }

  return NextResponse.json({ testedDate: start, results });
}
