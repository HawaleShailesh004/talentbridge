"use client";

import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import type { ScenarioId } from "@/lib/scenarios";
import { SCENARIOS } from "@/lib/scenarios";

const ORDER: ScenarioId[] = ["clears", "blocked", "rescued"];

interface ScenarioToggleProps {
  active: ScenarioId | null;
  loading: boolean;
  onSelect: (id: ScenarioId) => void;
}

export function ScenarioToggle({ active, loading, onSelect }: ScenarioToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel mb-8 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <p className="text-sm font-semibold text-white">Demo scenario</p>
        <span className="text-[10px] text-slate-500">
          Re-publishes both Pulse workspaces · resets chats · recomputes fit
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((id) => {
          const s = SCENARIOS[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              disabled={loading}
              onClick={() => onSelect(id)}
              className={`rounded-xl border px-4 py-2.5 text-left transition ${
                isActive
                  ? id === "rescued"
                    ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                    : id === "blocked"
                      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-black/20 text-slate-400 hover:border-white/25 hover:text-slate-200"
              } disabled:opacity-50`}
            >
              <span className="block text-xs font-bold">{s.chip}</span>
              <span className="block text-[10px] opacity-80">{s.description}</span>
            </button>
          );
        })}
        {loading && (
          <span className="flex items-center gap-2 self-center text-xs text-cyan-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Publishing to Pulse…
          </span>
        )}
      </div>
    </motion.div>
  );
}
