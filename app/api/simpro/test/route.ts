import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [quoteList, invoiceList] = await Promise.all([
      simproFetch('/quotes/', { 'pageSize': '1' }),
      simproFetch('/invoices/', { 'pageSize': '1' }),
    ]);

    const [quoteDetail, invoiceDetail] = await Promise.all([
      simproFetch(`/quotes/${quoteList[0].ID}`).catch((e: any) => ({ error: e.message })),
      simproFetch(`/invoices/${invoiceList[0].ID}`).catch((e: any) => ({ error: e.message })),
    ]);

    return NextResponse.json({
      quoteFields: Object.keys(quoteDetail),
      quoteDetail,
      invoiceFields: Object.keys(invoiceDetail),
      invoiceDetail,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
