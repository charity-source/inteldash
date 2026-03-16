import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tests = await Promise.all([
      // Date filter variations on jobs
      simproFetch('/jobs/', {
        'pageSize': '1',
        'columns': 'ID,Name,DateIssued',
        'DateIssued': 'after:2026-03-01',
      }).catch((e: any) => ({ test: 'date_v1', error: e.message })),

      simproFetch('/jobs/', {
        'pageSize': '1',
        'columns': 'ID,Name,DateIssued',
        'orderBy': 'DateIssued',
        'orderDirection': 'desc',
      }).catch((e: any) => ({ test: 'orderBy', error: e.message })),

      simproFetch('/jobs/', {
        'pageSize': '1',
        'columns': 'ID,Name,DateIssued',
        'if': 'DateIssued gt 2026-03-01',
      }).catch((e: any) => ({ test: 'date_odata', error: e.message })),

      // Columns on quotes
      simproFetch('/quotes/', {
        'pageSize': '2',
        'columns': 'ID,Name,Stage,Status,DateIssued,Total,IsClosed',
      }).catch((e: any) => ({ test: 'quote_columns', error: e.message })),

      // Columns on invoices
      simproFetch('/invoices/', {
        'pageSize': '2',
        'columns': 'ID,Type,DateIssued,Total,IsPaid,DatePaid,Customer',
      }).catch((e: any) => ({ test: 'invoice_columns', error: e.message })),

      // Columns + stage filter combined on jobs
      simproFetch('/jobs/', {
        'pageSize': '2',
        'columns': 'ID,Name,Stage,Status,DateIssued,Total',
        'Stage': 'Progress',
      }).catch((e: any) => ({ test: 'columns_and_filter', error: e.message })),
    ]);

    return NextResponse.json({
      date_v1: tests[0],
      orderBy: tests[1],
      date_odata: tests[2],
      quote_columns: tests[3],
      invoice_columns: tests[4],
      columns_and_filter: tests[5],
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
