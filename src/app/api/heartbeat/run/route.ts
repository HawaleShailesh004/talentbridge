import { NextRequest, NextResponse } from "next/server";
import { runHeartbeat } from "@/lib/aicoo";
import type { Side } from "@/lib/types";

function sideFromRequest(req: NextRequest): Side {
  const side = req.nextUrl.searchParams.get("side");
  if (side !== "candidate" && side !== "recruiter") {
    throw new Error("Invalid side");
  }
  return side;
}

export async function POST(req: NextRequest) {
  try {
    const side = sideFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const tier = body.tier === "MESSAGES" ? "MESSAGES" : "ACTIONS";
    const { data } = await runHeartbeat(side, tier);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Heartbeat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
