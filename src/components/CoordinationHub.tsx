"use client";

import { motion } from "framer-motion";
import { ShieldOff, BarChart3, Link2, Loader2 } from "lucide-react";
import type { ShareLink } from "@/lib/types";

interface CoordinationHubProps {
  candidateShare?: ShareLink;
  recruiterShare?: ShareLink;
  candidateLinkRevoked?: boolean;
  onRevoke: () => Promise<void>;
  revoking: boolean;
  analytics?: {
    uniqueVisitors: number;
    totalConversations: number;
    totalMessages: number;
  };
}

export function CoordinationHub({
  candidateShare,
  recruiterShare,
  candidateLinkRevoked = false,
  onRevoke,
  revoking,
  analytics,
}: CoordinationHubProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-panel relative overflow-hidden p-6"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(34,211,238,0.15), transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30">
            <Link2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Coordination Hub</h3>
            <p className="text-xs text-slate-500">Aicoo permission layer</p>
          </div>
        </div>

        <div className="space-y-4">
          <LinkRow
            label="Candidate agent"
            url={candidateShare?.url}
            active={!!candidateShare}
            revoked={candidateLinkRevoked}
          />
          <div className="flex justify-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-px w-full max-w-[120px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            />
          </div>
          <LinkRow label="Recruiter agent" url={recruiterShare?.url} active={!!recruiterShare} accent="violet" />
        </div>

        {analytics && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { label: "Visitors", value: analytics.uniqueVisitors, icon: BarChart3 },
              { label: "Chats", value: analytics.totalConversations, icon: BarChart3 },
              { label: "Messages", value: analytics.totalMessages, icon: BarChart3 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-center"
              >
                <p className="text-lg font-bold text-cyan-300">{value}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        {candidateLinkRevoked && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
            Candidate share link revoked — recruiter session will die on next message
          </p>
        )}

        {candidateShare && !candidateLinkRevoked && (
          <motion.button
            type="button"
            onClick={onRevoke}
            disabled={revoking}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-danger mt-6 flex w-full items-center justify-center gap-2"
          >
            {revoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4" />
            )}
            Revoke candidate access (live demo)
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function LinkRow({
  label,
  url,
  active,
  accent = "cyan",
  revoked = false,
}: {
  label: string;
  url?: string;
  active: boolean;
  accent?: "cyan" | "violet";
  revoked?: boolean;
}) {
  const color = revoked ? "#f87171" : accent === "cyan" ? "#22d3ee" : "#a78bfa";
  return (
    <div
      className={`rounded-xl border bg-black/20 p-3 ${
        revoked ? "border-rose-500/30 opacity-75" : "border-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {revoked && (
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-300">
            Revoked
          </span>
        )}
      </div>
      {active && url ? (
        <p
          className={`mt-1 truncate font-mono text-[11px] ${revoked ? "line-through text-rose-400/80" : ""}`}
          style={{ color: revoked ? undefined : color }}
        >
          {url}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-600">Not published yet</p>
      )}
    </div>
  );
}
