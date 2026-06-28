"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Scale,
  MessageSquare,
  Zap,
  Sparkles,
} from "lucide-react";
import type { FitResult, Verdict } from "@/lib/compute-fit";

interface FitVerdictPanelProps {
  result: FitResult;
  collapsed?: boolean;
  onNarrateToRecruiter?: () => void;
  onNarrateToCandidate?: () => void;
  onRunHeartbeat?: () => void;
  heartbeatLoading?: boolean;
}

const VERDICT_UI: Record<
  Verdict,
  { icon: typeof CheckCircle2; ring: string; text: string; bg: string; label: string }
> = {
  CLEARED: {
    icon: CheckCircle2,
    ring: "border-emerald-400/40",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    label: "CLEARED",
  },
  BLOCKED: {
    icon: XCircle,
    ring: "border-rose-400/40",
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    label: "BLOCKED",
  },
  RESCUED: {
    icon: Sparkles,
    ring: "border-violet-400/50",
    text: "text-violet-300",
    bg: "bg-violet-500/15",
    label: "RESCUED",
  },
};

const CHECK_STYLE = {
  PASS: { icon: CheckCircle2, text: "text-emerald-300", bg: "bg-emerald-500/10" },
  FLAG: { icon: AlertTriangle, text: "text-amber-300", bg: "bg-amber-500/10" },
  BLOCK: { icon: XCircle, text: "text-rose-300", bg: "bg-rose-500/10" },
};

export function FitVerdictPanel({
  result,
  collapsed = false,
  onNarrateToRecruiter,
  onNarrateToCandidate,
  onRunHeartbeat,
  heartbeatLoading,
}: FitVerdictPanelProps) {
  if (collapsed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel border border-rose-500/30 px-5 py-4 text-center text-sm text-rose-300"
      >
        Access revoked — cross-party fit context no longer available to recruiter
      </motion.div>
    );
  }

  const style = VERDICT_UI[result.verdict];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel overflow-hidden border ${style.ring}`}
    >
      <div className={`border-b border-white/10 px-5 py-4 ${style.bg}`}>
        <div className="flex flex-wrap items-start gap-3">
          <div className={`rounded-xl p-2 ${style.bg}`}>
            <Scale className={`h-5 w-5 ${style.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Fit verdict · deterministic · rule-based on published policy + role
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Icon className={`h-5 w-5 ${style.text}`} />
              <h3 className={`font-display text-lg font-bold ${style.text}`}>
                {style.label}
              </h3>
              <span className="text-sm text-slate-300">{result.headline}</span>
            </div>
            {result.resumeVsContext && (
              <p
                className={`mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs leading-relaxed ${style.text}`}
              >
                {result.resumeVsContext}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Computed across both Aicoo contexts — agent narrates, does not decide.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-4">
        {result.checks.map((c, i) => {
          const s = CHECK_STYLE[c.status];
          const CIcon = s.icon;
          return (
            <motion.div
              key={`${c.dimension}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/5 bg-black/20 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CIcon className={`h-4 w-4 ${s.text}`} />
                  <span className="text-xs font-semibold capitalize text-white">
                    {c.dimension}
                  </span>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${s.bg} ${s.text}`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{c.reason}</p>
              <p className="mt-2 flex items-start gap-1 text-[10px] text-slate-600">
                <Shield className="mt-0.5 h-3 w-3 shrink-0" />
                Cross-boundary via Aicoo share scope
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
        {onNarrateToRecruiter && (
          <button
            type="button"
            onClick={onNarrateToRecruiter}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Agent narrates verdict → recruiter
          </button>
        )}
        {onNarrateToCandidate && (
          <button
            type="button"
            onClick={onNarrateToCandidate}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Agent narrates verdict → candidate
          </button>
        )}
        {onRunHeartbeat && result.verdict !== "BLOCKED" && (
          <button
            type="button"
            onClick={onRunHeartbeat}
            disabled={heartbeatLoading}
            className="btn-ghost flex items-center gap-2 text-xs text-violet-300"
          >
            <Zap className="h-3.5 w-3.5" />
            {heartbeatLoading ? "Running heartbeat…" : "Run heartbeat (ACTIONS)"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
