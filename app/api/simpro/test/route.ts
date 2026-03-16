import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test list filtering and field selection
    const tests = await Promise.all([
      simproFetch('/jobs/', {
        'pageSize': '2',
        'columns': 'ID,Name,Stage,Status,DateIssued,Total',
      }).catch((e: any) => ({ test: 'columns', error: e.message })),

      simproFetch('/jobs/', {
        'pageSize': '2',
        'DateIssued.after': '2026-03-01',
      }).catch((e: any) => ({ test: 'date_filter', error: e.message })),

      simproFetch('/jobs/', {
        'pageSize': '2',
        'Stage': 'Progress',
      }).catch((e: any) => ({ test: 'stage_filter', error: e.message })),
    ]);

    return NextResponse.json({
      columns_test: tests[0],
      date_filter_test: tests[1],
      stage_filter_test: tests[2],
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
