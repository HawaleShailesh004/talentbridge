export interface StreamEvent {
  type: string;
  textDelta?: string;
  text?: string;
  message?: string;
  stage?: string;
  sessionKey?: string;
  conversationId?: string;
}

export function applyStreamEvent(
  ev: StreamEvent,
  acc: { sessionKey?: string; text: string }
): void {
  if (ev.sessionKey) acc.sessionKey = ev.sessionKey;
  if (ev.type === "text-delta" && ev.textDelta) acc.text += ev.textDelta;
  if (ev.type === "text" && ev.text) acc.text += ev.text;
}

/** Parse newline-delimited JSON stream from guest-v04 */
export function parseNdjsonStream(raw: string): {
  sessionKey?: string;
  text: string;
  events: StreamEvent[];
} {
  const events: StreamEvent[] = [];
  const acc = { sessionKey: undefined as string | undefined, text: "" };

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("{")) continue;
    try {
      const ev = JSON.parse(trimmed) as StreamEvent;
      events.push(ev);
      applyStreamEvent(ev, acc);
    } catch {
      // skip malformed lines
    }
  }

  return { sessionKey: acc.sessionKey, text: acc.text.trim(), events };
}

/** Incrementally parse NDJSON from a text buffer; returns unconsumed tail */
export function consumeNdjsonBuffer(
  buffer: string,
  onEvent: (ev: StreamEvent) => void
): string {
  const lines = buffer.split("\n");
  const tail = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("{")) continue;
    try {
      onEvent(JSON.parse(trimmed) as StreamEvent);
    } catch {
      // skip malformed lines
    }
  }

  return tail;
}
