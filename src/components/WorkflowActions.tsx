"use client";

import { Mail, Calendar, Bell, Ban } from "lucide-react";
import type { FitResult } from "@/lib/compute-fit";
import type { ChatPanelHandle } from "@/components/ChatPanel";
import { WORKFLOW_PROMPTS } from "@/lib/chat-persona";

interface WorkflowActionsProps {
  fitResult: FitResult;
  recruiterChatRef: React.RefObject<ChatPanelHandle | null>;
  candidateChatRef: React.RefObject<ChatPanelHandle | null>;
  onPingHuman: (side: "candidate" | "recruiter", message: string) => Promise<void>;
}

export function WorkflowActions({
  fitResult,
  recruiterChatRef,
  candidateChatRef,
  onPingHuman,
}: WorkflowActionsProps) {
  const cleared = fitResult.verdict === "CLEARED" || fitResult.verdict === "RESCUED";
  const blocked = fitResult.verdict === "BLOCKED";

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-400">
        Next steps (demo workflow — drafts via agent; human ping via Aicoo messaging)
      </p>
      <div className="flex flex-wrap gap-2">
        {cleared && (
          <>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2 text-xs"
              onClick={() =>
                recruiterChatRef.current?.sendMessage(
                  WORKFLOW_PROMPTS.approveAndEmail(),
                  "📧 Draft approval email + Calendly"
                )
              }
            >
              <Mail className="h-3.5 w-3.5" />
              Draft approval email
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2 text-xs"
              onClick={() =>
                candidateChatRef.current?.sendMessage(
                  WORKFLOW_PROMPTS.shareCalendly,
                  "📅 Share Calendly booking link"
                )
              }
            >
              <Calendar className="h-3.5 w-3.5" />
              Share Calendly (role agent)
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2 text-xs text-emerald-300"
              onClick={() => onPingHuman("recruiter", WORKFLOW_PROMPTS.pingRecruiterHuman)}
            >
              <Bell className="h-3.5 w-3.5" />
              Ping recruiter in Pulse
            </button>
          </>
        )}
        {blocked && (
          <>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2 text-xs"
              onClick={() =>
                recruiterChatRef.current?.sendMessage(
                  WORKFLOW_PROMPTS.rejectAndEmail(),
                  "📧 Draft rejection email"
                )
              }
            >
              <Ban className="h-3.5 w-3.5" />
              Draft rejection email
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2 text-xs"
              onClick={() =>
                candidateChatRef.current?.sendMessage(
                  "Draft a polite message asking if there is any flexibility to reach ₹8 LPA, given my verified backend experience.",
                  "💬 Draft comp negotiation"
                )
              }
            >
              <Mail className="h-3.5 w-3.5" />
              Candidate negotiation draft
            </button>
          </>
        )}
      </div>
      <p className="mt-2 text-[10px] text-slate-600">
        Real SMTP email + live Calendly API need external integrations. Demo uses agent-drafted
        copy + Aicoo send_message_to_human ping to the Pulse account owner.
      </p>
    </div>
  );
}
