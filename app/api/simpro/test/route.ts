import { simproFetch } from '@/lib/simpro';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const jobs = await simproFetch('/jobs/', {
      'pageSize': '1',
    });

    return NextResponse.json({
      status: 'connected',
      sample: jobs,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
    }, { status: 500 });
  }
}
