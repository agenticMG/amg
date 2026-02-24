import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDecisions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
  const data = await getDecisions(Math.min(limit, 200));
  return NextResponse.json(data);
}
