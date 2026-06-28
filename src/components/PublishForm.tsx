"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Rocket, User, Briefcase } from "lucide-react";
import type { ShareLink } from "@/lib/types";
import type { SideContext } from "@/lib/scenarios";
import { SCENARIO_CLEARS } from "@/lib/scenarios";

interface PublishFormProps {
  side: "candidate" | "recruiter";
  seed?: SideContext;
  onPublished: (share: ShareLink, context: SideContext) => void;
}

export function PublishForm({ side, seed, onPublished }: PublishFormProps) {
  const d = seed ?? SCENARIO_CLEARS[side];
  const [main, setMain] = useState(d.main);
  const [secondary, setSecondary] = useState(d.secondary);
  const [policyOrComp, setPolicyOrComp] = useState(d.policyOrComp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seed) return;
    setMain(seed.main);
    setSecondary(seed.secondary);
    setPolicyOrComp(seed.policyOrComp);
  }, [seed]);

  async function publish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/publish?side=${side}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main, secondary, policyOrComp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      onPublished(data.shareLink, { main, secondary, policyOrComp });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  const Icon = side === "candidate" ? User : Briefcase;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background:
              side === "candidate"
                ? "rgba(34,211,238,0.15)"
                : "rgba(167,139,250,0.15)",
          }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: side === "candidate" ? "#22d3ee" : "#a78bfa" }}
          />
        </div>
        <div>
          <h3 className="font-semibold capitalize text-white">{side} workspace</h3>
          <p className="text-xs text-slate-500">Pulse Account {side === "candidate" ? "A" : "B"}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            {side === "candidate" ? "Work history" : "Role brief"}
          </label>
          <textarea
            className="input-field min-h-[100px] resize-y font-mono text-xs"
            value={main}
            onChange={(e) => setMain(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            {side === "candidate" ? "Verified skills / context" : "Team context"}
          </label>
          <textarea
            className="input-field min-h-[80px] resize-y font-mono text-xs"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            {side === "candidate" ? "Policy" : "Comp band"}
          </label>
          <textarea
            className="input-field min-h-[80px] resize-y font-mono text-xs"
            value={policyOrComp}
            onChange={(e) => setPolicyOrComp(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm text-rose-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={publish}
        disabled={loading}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        Publish to Pulse manually
      </button>
    </motion.div>
  );
}
