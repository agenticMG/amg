import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDistributions, getTopRecipients } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
  const data = await getDistributions(Math.min(limit, 200));
  const topRecipients = await getTopRecipients(20);
  return NextResponse.json({ ...data, topRecipients });
}
