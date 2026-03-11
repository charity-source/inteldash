import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:3002/api/technician", {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream server error", status: res.status },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to connect to tech-recovery-live server", detail: message },
      { status: 502 }
    );
  }
}
