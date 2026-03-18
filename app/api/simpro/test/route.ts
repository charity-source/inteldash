import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all Progress and Pending jobs with Status info
    const [progressJobs, pendingJobs] = await Promise.all([
      simproFetch('/jobs/', {
        columns: 'ID,Name,Stage,Status',
        Stage: 'Progress',
      }),
      simproFetch('/jobs/', {
        columns: 'ID,Name,Stage,Status',
        Stage: 'Pending',
      }),
    ]);

    const allJobs = [...progressJobs, ...pendingJobs];

    // Collect unique statuses
    const statusMap: Record<string, { count: number; stage: string; color: string }> = {};
    for (const job of allJobs) {
      const name = job.Status?.Name ?? "Unknown";
      if (!statusMap[name]) {
        statusMap[name] = { count: 0, stage: job.Stage, color: job.Status?.Color ?? "" };
      }
      statusMap[name].count++;
    }

    // Sort by count descending
    const statuses = Object.entries(statusMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, data]) => ({ name, ...data }));

    return NextResponse.json({
      totalJobs: allJobs.length,
      uniqueStatuses: statuses.length,
      statuses,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
