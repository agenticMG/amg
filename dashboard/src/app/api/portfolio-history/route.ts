import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPortfolioHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hours = Number(request.nextUrl.searchParams.get("hours") || "24");
  const data = await getPortfolioHistory(Math.min(hours, 720));
  return NextResponse.json(data);
}
