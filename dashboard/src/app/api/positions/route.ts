import { NextResponse } from "next/server";
import { getPositions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPositions();
  return NextResponse.json(data);
}
