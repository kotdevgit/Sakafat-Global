import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    runtime: "node",
    release: process.env.RELEASE_ID || "development",
  });
}
