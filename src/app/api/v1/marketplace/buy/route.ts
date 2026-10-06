import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    error: "Developer API is currently in private preview. Contact support to request early API key access."
  }, { status: 503 });
}

export async function GET() {
  return NextResponse.json({
    error: "Developer API is currently in private preview. Contact support to request early API key access."
  }, { status: 503 });
}
