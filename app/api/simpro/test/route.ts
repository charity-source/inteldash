import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get one ID from each list
    const [jobList, quoteList, invoiceList] = await Promise.all([
      simproFetch('/jobs/', { 'pageSize': '1' }),
      simproFetch('/quotes/', { 'pageSize': '1' }),
      simproFetch('/invoices/', { 'pageSize': '1' }),
    ]);

    // Fetch full detail for each
    const [jobDetail, quoteDetail, invoiceDetail] = await Promise.all([
      simproFetch(`/jobs/${jobList[0].ID}/`).catch((e: any) => ({ error: e.message })),
      simproFetch(`/quotes/${quoteList[0].ID}/`).catch((e: any) => ({ error: e.message })),
      simproFetch(`/invoices/${invoiceList[0].ID}/`).catch((e: any) => ({ error: e.message })),
    ]);

    return NextResponse.json({
      jobFields: Object.keys(jobDetail),
      jobDetail,
      quoteFields: Object.keys(quoteDetail),
      quoteDetail,
      invoiceFields: Object.keys(invoiceDetail),
      invoiceDetail,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
