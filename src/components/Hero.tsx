"use client";

import { motion } from "framer-motion";
import { Sparkles, Link2, Shield, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export function Hero() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative mb-10 text-center"
    >
      <motion.div
        className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-cyan-300"
        animate={{ boxShadow: ["0 0 20px rgba(34,211,238,0.1)", "0 0 40px rgba(34,211,238,0.25)", "0 0 20px rgba(34,211,238,0.1)"] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Powered by Aicoo Coordination Layer
      </motion.div>

      <div className="flex justify-center">
        <BrandLogo className="h-16 w-auto max-w-[min(100%,520px)] md:h-[4.5rem]" />
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 md:text-lg">
        Mutual first-pass diligence — candidate screens the role, recruiter queries
        verified context — through permissioned, revocable Aicoo share links.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-cyan-400" /> guest-v04 chat
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-violet-400" /> identity.loadPolicy
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-rose-400" /> live revoke
        </span>
      </div>
    </motion.header>
  );
}
