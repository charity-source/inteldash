import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Connect to real data source
  return NextResponse.json({ message: "Assets API - coming soon", data: [] });
}
