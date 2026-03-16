import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [jobs, quotes, invoices] = await Promise.all([
      simproFetch('/jobs/', { 'pageSize': '3' }).catch((e: any) => ({ error: e.message })),
      simproFetch('/quotes/', { 'pageSize': '3' }).catch((e: any) => ({ error: e.message })),
      simproFetch('/invoices/', { 'pageSize': '3' }).catch((e: any) => ({ error: e.message })),
    ]);

    return NextResponse.json({
      jobs: { fields: jobs[0] ? Object.keys(jobs[0]) : jobs, sample: jobs[0] },
      quotes: { fields: quotes[0] ? Object.keys(quotes[0]) : quotes, sample: quotes[0] },
      invoices: { fields: invoices[0] ? Object.keys(invoices[0]) : invoices, sample: invoices[0] },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
