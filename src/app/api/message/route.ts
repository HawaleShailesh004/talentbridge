import { NextRequest, NextResponse } from "next/server";
import { enableMessaging, aicooFetch, getKey } from "@/lib/aicoo";
import type { Side } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { side, recipientId, message } = await req.json();
    if (side !== "candidate" && side !== "recruiter") {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    await enableMessaging(side as Side);

    const params: Record<string, string> = { message };
    if (recipientId) params.recipient_id = recipientId;

    const { data } = await aicooFetch<{
      success: boolean;
      tool: string;
      result?: { isError?: boolean; error?: string };
    }>(getKey(side as Side), "POST", "/tools", {
      tool: "send_message_to_human",
      params,
    });

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Message failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
