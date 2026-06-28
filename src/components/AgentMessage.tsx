"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import {
  displayWhileStreaming,
  splitAgentContent,
} from "@/lib/parse-agent-content";

interface AgentMessageProps {
  content: string;
  streaming?: boolean;
  accentColor?: "cyan" | "violet";
  onSuggestionClick?: (text: string) => void;
}

export function AgentMessage({
  content,
  streaming = false,
  accentColor = "cyan",
  onSuggestionClick,
}: AgentMessageProps) {
  const { body, suggestions } = streaming
    ? { body: displayWhileStreaming(content), suggestions: [] as string[] }
    : splitAgentContent(content);

  const chipHover =
    accentColor === "cyan"
      ? "hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
      : "hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-violet-200";

  return (
    <div className="space-y-3">
      {body ? (
        <div className="chat-md prose-invert max-w-none text-sm leading-relaxed text-slate-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
              ),
              li: ({ children }) => <li className="text-slate-300">{children}</li>,
              h1: ({ children }) => (
                <h1 className="mb-2 text-base font-bold text-white">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 text-sm font-bold text-white">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 text-sm font-semibold text-slate-100">
                  {children}
                </h3>
              ),
              code: ({ children }) => (
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs text-cyan-200">
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline underline-offset-2"
                >
                  {children}
                </a>
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      ) : streaming ? (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Thinking…
        </span>
      ) : null}

      {streaming && body && (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-400/80"
          aria-hidden
        />
      )}

      {!streaming && suggestions.length > 0 && (
        <div className="border-t border-white/10 pt-2">
          <p className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <Sparkles className="h-3 w-3" />
            Suggested follow-ups
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionClick?.(s)}
                className={`rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-left text-[11px] text-slate-400 transition ${chipHover}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
