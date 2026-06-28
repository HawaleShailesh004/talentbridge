"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, ExternalLink } from "lucide-react";
import { AgentMessage } from "@/components/AgentMessage";
import { applyStreamEvent, consumeNdjsonBuffer } from "@/lib/parse-stream";
import type { StreamEvent } from "@/lib/parse-stream";

interface Message {
  role: "user" | "agent";
  content: string;
  streaming?: boolean;
}

interface ChatPanelProps {
  title: string;
  subtitle: string;
  token: string | undefined;
  agentUrl?: string;
  accentColor: "cyan" | "violet";
  placeholder: string;
  suggestedPrompts: string[];
  linkRevoked?: boolean;
  /** Clears chat when scenario changes */
  scenarioResetKey?: string;
  scenarioLabel?: string;
  /** Wrap outgoing message (persona + verdict) before guest-v04 */
  transformMessage?: (raw: string) => string;
}

export interface ChatPanelHandle {
  sendMessage: (text: string, displayLabel?: string) => void;
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
  function ChatPanel(
    {
      title,
      subtitle,
      token,
      agentUrl,
      accentColor,
      placeholder,
      suggestedPrompts,
      linkRevoked = false,
      scenarioResetKey,
      scenarioLabel,
      transformMessage,
    },
    ref
  ) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | undefined>();
  const [sessionKilled, setSessionKilled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scenarioResetKey) return;
    setMessages([]);
    setSessionKey(undefined);
    setSessionKilled(false);
    setInput("");
  }, [scenarioResetKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const patchAgentMessage = useCallback((index: number, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  }, []);

  async function send(text?: string, displayOverride?: string) {
    const raw = (text ?? input).trim();
    if (!raw || !token || loading || sessionKilled) return;

    const apiMessage = transformMessage ? transformMessage(raw) : raw;
    const shown = displayOverride ?? raw;
    setInput("");
    setLoading(true);

    const agentIndex = messages.length + 1;

    setMessages((m) => [
      ...m,
      { role: "user", content: shown },
      { role: "agent", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: apiMessage, sessionKey }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const data = await res.json();
        if (data.revoked) setSessionKilled(true);
        patchAgentMessage(agentIndex, {
          content:
            data.error ||
            "**Access denied** — share link revoked at Aicoo coordination layer (`DELETE /share/{id}` → guest-v04 **404**). Context no longer crosses the permission boundary.",
          streaming: false,
        });
        return;
      }

      if (!contentType.includes("ndjson") || !res.body) {
        const data = await res.json();
        if (data.sessionKey) setSessionKey(data.sessionKey);
        patchAgentMessage(agentIndex, {
          content: data.reply || "No response text.",
          streaming: false,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const acc = { sessionKey: sessionKey as string | undefined, text: "" };

      const handleEvent = (ev: StreamEvent) => {
        applyStreamEvent(ev, acc);
        if (acc.sessionKey) setSessionKey(acc.sessionKey);
        patchAgentMessage(agentIndex, { content: acc.text, streaming: true });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = consumeNdjsonBuffer(buffer, handleEvent);
      }

      if (buffer.trim()) {
        consumeNdjsonBuffer(buffer + "\n", handleEvent);
      }

      patchAgentMessage(agentIndex, {
        content: acc.text.trim() || "Agent responded (no text in stream).",
        streaming: false,
      });
    } catch {
      patchAgentMessage(agentIndex, {
        content: "Network error. Try again.",
        streaming: false,
      });
    } finally {
      setLoading(false);
    }
  }

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string, display?: string) => {
      void send(text, display);
    },
  }));

  const borderGlow =
    accentColor === "cyan"
      ? "border-cyan-500/20 shadow-cyan-500/5"
      : "border-violet-500/20 shadow-violet-500/5";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-panel flex h-[480px] flex-col overflow-hidden border ${borderGlow} shadow-lg`}
    >
      <div
        className="flex items-center justify-between border-b border-white/10 px-4 py-3"
        style={{
          background:
            accentColor === "cyan"
              ? "linear-gradient(90deg, rgba(34,211,238,0.08), transparent)"
              : "linear-gradient(90deg, rgba(167,139,250,0.08), transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          <Bot
            className="h-4 w-4"
            style={{ color: accentColor === "cyan" ? "#22d3ee" : "#a78bfa" }}
          />
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        {agentUrl && (
          <a
            href={agentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400"
          >
            Open on Aicoo <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {!token ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
          Publish {accentColor === "cyan" ? "candidate" : "recruiter"} context first
          to enable this chat panel.
        </div>
      ) : (
        <>
          {scenarioLabel && (
            <div className="border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-cyan-300/90">
              Scenario: {scenarioLabel} · fresh chat — ask below
            </div>
          )}
          {linkRevoked && !sessionKilled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-200"
            >
              Share link revoked — history preserved.{" "}
              <strong>Send another message</strong> to watch live access cut off
              (guest-v04 → 404).
            </motion.div>
          )}
          {sessionKilled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-center text-xs text-rose-200"
            >
              Permission boundary enforced — session terminated. Without
              Aicoo&apos;s share layer, this cross-party access cannot exist.
            </motion.div>
          )}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Try asking:</p>
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    disabled={sessionKilled}
                    className="block w-full rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left text-xs text-slate-400 transition hover:border-white/15 hover:text-slate-200 disabled:opacity-40"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-agent"}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <AgentMessage
                    content={m.content}
                    streaming={m.streaming}
                    accentColor={accentColor}
                    onSuggestionClick={(s) => send(s)}
                  />
                )}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && send()}
                placeholder={
                  sessionKilled
                    ? "Session killed — republish to restore access"
                    : placeholder
                }
                className="input-field flex-1 py-2 text-sm"
                disabled={loading || sessionKilled}
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={loading || sessionKilled || !input.trim()}
                className="btn-primary flex items-center px-3"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
});
