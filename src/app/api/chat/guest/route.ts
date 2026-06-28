import { NextRequest, NextResponse } from "next/server";
import { guestChat } from "@/lib/aicoo";

export async function POST(req: NextRequest) {
  try {
    const { token, message, sessionKey } = await req.json();

    if (!token || !message) {
      return NextResponse.json(
        { error: "token and message required" },
        { status: 400 }
      );
    }

    const upstream = await guestChat(token, message, sessionKey);

    if (!upstream.ok) {
      const raw = await upstream.text();
      let err: { error?: string; message?: string } = {};
      try {
        err = JSON.parse(raw);
      } catch {
        err = { message: raw.slice(0, 200) };
      }
      return NextResponse.json(
        {
          error: err.message || err.error || "Guest chat failed",
          revoked: upstream.status === 404,
        },
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: "Empty stream from Aicoo" }, { status: 502 });
    }

    // Pipe guest-v04 NDJSON straight through for client-side streaming
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
