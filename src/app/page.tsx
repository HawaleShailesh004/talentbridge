"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hero } from "@/components/Hero";
import { BrandLogo } from "@/components/BrandLogo";
import { PublishForm } from "@/components/PublishForm";
import { ChatPanel, type ChatPanelHandle } from "@/components/ChatPanel";
import { CoordinationHub } from "@/components/CoordinationHub";
import { FitVerdictPanel } from "@/components/FitVerdictPanel";
import { ScenarioToggle } from "@/components/ScenarioToggle";
import { WorkflowActions } from "@/components/WorkflowActions";
import type { ShareLink } from "@/lib/types";
import type { FitResult } from "@/lib/compute-fit";
import type { ScenarioId } from "@/lib/scenarios";
import { getScenario, SCENARIO_CLEARS } from "@/lib/scenarios";
import { buildVerdictNarrationMessage } from "@/lib/narration";
import { wrapGuestMessage } from "@/lib/chat-persona";

const PROMPTS: Record<
  ScenarioId,
  { recruiter: string[]; candidate: string[] }
> = {
  clears: {
    recruiter: [
      "Does this candidate meet our MERN stack requirement?",
      "What is their comp floor and notice period?",
    ],
    candidate: [
      "Does this role meet my ₹8 LPA comp floor?",
      "Is this role hybrid in Thane?",
    ],
  },
  blocked: {
    recruiter: [
      "Can we proceed despite the comp band?",
      "What is the candidate's comp floor?",
    ],
    candidate: ["Does this role meet my ₹8 LPA comp floor?"],
  },
  rescued: {
    recruiter: [
      "The resume looks thin — should we reject this candidate?",
      "What verified production evidence supports this profile?",
    ],
    candidate: [
      "Would an ATS reject my resume for this role?",
      "What does verified context show that keywords miss?",
    ],
  },
};

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function Home() {
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [candidateShare, setCandidateShare] = useState<ShareLink>();
  const [recruiterShare, setRecruiterShare] = useState<ShareLink>();
  const [candidateSeed, setCandidateSeed] = useState(SCENARIO_CLEARS.candidate);
  const [recruiterSeed, setRecruiterSeed] = useState(SCENARIO_CLEARS.recruiter);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [candidateLinkRevoked, setCandidateLinkRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [analytics, setAnalytics] = useState<ShareLink["analytics"]>();
  const [heartbeatNote, setHeartbeatNote] = useState<string | null>(null);
  const [heartbeatLoading, setHeartbeatLoading] = useState(false);

  const recruiterChatRef = useRef<ChatPanelHandle>(null);
  const candidateChatRef = useRef<ChatPanelHandle>(null);
  const appliedOnce = useRef(false);

  const applyScenario = useCallback(async (id: ScenarioId) => {
    setScenarioLoading(true);
    setCandidateLinkRevoked(false);
    setHeartbeatNote(null);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scenario failed");

      const scenario = getScenario(id);
      setActiveScenario(id);
      setCandidateSeed(scenario.candidate);
      setRecruiterSeed(scenario.recruiter);
      setCandidateShare(data.candidate.shareLink);
      setRecruiterShare(data.recruiter.shareLink);
      setFitResult(data.fitResult);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Scenario apply failed");
    } finally {
      setScenarioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (appliedOnce.current) return;
    appliedOnce.current = true;
    void applyScenario("clears");
  }, [applyScenario]);

  const narrateToRecruiter = useCallback(() => {
    if (!fitResult) return;
    recruiterChatRef.current?.sendMessage(
      buildVerdictNarrationMessage(fitResult, "recruiter"),
      "🎯 Narrate deterministic fit verdict → recruiter"
    );
  }, [fitResult]);

  const narrateToCandidate = useCallback(() => {
    if (!fitResult) return;
    candidateChatRef.current?.sendMessage(
      buildVerdictNarrationMessage(fitResult, "candidate"),
      "🎯 Narrate deterministic fit verdict → candidate"
    );
  }, [fitResult]);

  const runHeartbeat = useCallback(async () => {
    setHeartbeatLoading(true);
    setHeartbeatNote(null);
    try {
      const res = await fetch("/api/heartbeat/run?side=recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "ACTIONS" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Heartbeat failed");
      setHeartbeatNote(
        `Heartbeat #${data.result?.runId} · ${data.result?.actionsCreated ?? 0} action(s) on recruiter Pulse`
      );
    } catch (e) {
      setHeartbeatNote(e instanceof Error ? e.message : "Heartbeat unavailable");
    } finally {
      setHeartbeatLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    if (!candidateShare?.id || candidateLinkRevoked) return;
    try {
      const res = await fetch("/api/publish?side=candidate");
      const data = await res.json();
      const link = data.links?.find((l: ShareLink) => l.id === candidateShare.id);
      if (link?.analytics) setAnalytics(link.analytics);
    } catch {
      /* noop */
    }
  }, [candidateShare?.id, candidateLinkRevoked]);

  useEffect(() => {
    refreshAnalytics();
    const id = setInterval(refreshAnalytics, 15000);
    return () => clearInterval(id);
  }, [refreshAnalytics]);

  async function handleRevoke() {
    if (!candidateShare?.id) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/publish?side=candidate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId: candidateShare.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Revoke failed");
      }
      setCandidateLinkRevoked(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevoking(false);
    }
  }

  const prompts = activeScenario ? PROMPTS[activeScenario] : PROMPTS.clears;
  const scenarioMeta = activeScenario ? getScenario(activeScenario) : null;

  const wrapRecruiterPanel = useCallback(
    (msg: string) =>
      wrapGuestMessage(msg, "recruiter_to_candidate", fitResult, activeScenario),
    [fitResult, activeScenario]
  );

  const wrapCandidatePanel = useCallback(
    (msg: string) =>
      wrapGuestMessage(msg, "candidate_to_recruiter", fitResult, activeScenario),
    [fitResult, activeScenario]
  );

  const pingHuman = useCallback(async (side: "candidate" | "recruiter", message: string) => {
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ping failed");
      alert(`Ping sent to ${side} Pulse owner via Aicoo messaging.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ping failed");
    }
  }, []);

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <FloatingOrb className="left-[5%] top-[15%] h-64 w-64 bg-cyan-500/10" />
      <FloatingOrb className="right-[8%] top-[40%] h-48 w-48 bg-violet-500/10" delay={2} />

      <Hero />

      <ScenarioToggle
        active={activeScenario}
        loading={scenarioLoading}
        onSelect={applyScenario}
      />

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <PublishForm
          side="candidate"
          seed={candidateSeed}
          onPublished={(link, ctx) => {
            setCandidateShare(link);
            setCandidateSeed(ctx);
            setCandidateLinkRevoked(false);
          }}
        />
        <PublishForm
          side="recruiter"
          seed={recruiterSeed}
          onPublished={(link, ctx) => {
            setRecruiterShare(link);
            setRecruiterSeed(ctx);
          }}
        />
      </div>

      {fitResult && (
        <div className="mb-10">
          <FitVerdictPanel
            result={fitResult}
            collapsed={candidateLinkRevoked}
            onNarrateToRecruiter={narrateToRecruiter}
            onNarrateToCandidate={narrateToCandidate}
            onRunHeartbeat={runHeartbeat}
            heartbeatLoading={heartbeatLoading}
          />
          {heartbeatNote && (
            <p className="mt-2 text-center text-xs text-violet-300">{heartbeatNote}</p>
          )}
          <WorkflowActions
            fitResult={fitResult}
            recruiterChatRef={recruiterChatRef}
            candidateChatRef={candidateChatRef}
            onPingHuman={pingHuman}
          />
        </div>
      )}

      <div className="mb-10">
        <CoordinationHub
          candidateShare={candidateShare}
          recruiterShare={recruiterShare}
          candidateLinkRevoked={candidateLinkRevoked}
          onRevoke={handleRevoke}
          revoking={revoking}
          analytics={analytics}
        />
      </div>

      <section>
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white">
            Mutual Diligence Chat
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Each side talks to the <strong className="font-medium text-slate-300">other party&apos;s agent</strong> — not a live human chat between you and them.
            Scenario pills re-publish Pulse files, recompute fit, and <strong className="font-medium text-slate-300">reset both chats</strong>.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChatPanel
            ref={recruiterChatRef}
            title="Recruiter → Candidate"
            subtitle="Pulse B → Pulse A · loadPolicy context"
            token={candidateShare?.token}
            agentUrl={candidateShare?.url}
            accentColor="cyan"
            placeholder="Ask about skills, comp, verified context…"
            suggestedPrompts={prompts.recruiter}
            linkRevoked={candidateLinkRevoked}
            scenarioResetKey={activeScenario ?? "clears"}
            scenarioLabel={scenarioMeta?.chip}
            transformMessage={wrapRecruiterPanel}
          />
          <ChatPanel
            ref={candidateChatRef}
            title="Candidate → Recruiter"
            subtitle="Pulse A → Pulse B · role scope"
            token={recruiterShare?.token}
            agentUrl={recruiterShare?.url}
            accentColor="violet"
            placeholder="Ask about comp, hybrid, rescue scenario…"
            suggestedPrompts={prompts.candidate}
            scenarioResetKey={activeScenario ?? "clears"}
            scenarioLabel={scenarioMeta?.chip}
            transformMessage={wrapCandidatePanel}
          />
        </div>
      </section>

      <footer className="mt-16 flex flex-col items-center gap-3 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
        <BrandLogo className="h-8 w-auto opacity-60" />
        Clears / Blocked / Rescued demo scenarios · Aicoo coordination layer
      </footer>
    </main>
  );
}
