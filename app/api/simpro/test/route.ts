import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const jobList = await simproFetch('/jobs/', { 'pageSize': '1' });
    const jobId = jobList[0].ID;

    // Try different URL patterns
    const attempts = await Promise.all([
      simproFetch(`/jobs/${jobId}`).catch((e: any) => ({ pattern: `/jobs/${jobId}`, error: e.message })),
      simproFetch(`/jobs/${jobId}/`).catch((e: any) => ({ pattern: `/jobs/${jobId}/`, error: e.message })),
      simproFetch(`/jobs/${jobId}/details/`).catch((e: any) => ({ pattern: `/jobs/${jobId}/details/`, error: e.message })),
      simproFetch(`/jobs/${jobId}/details`).catch((e: any) => ({ pattern: `/jobs/${jobId}/details`, error: e.message })),
    ]);

    return NextResponse.json({
      jobId,
      attempts,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
