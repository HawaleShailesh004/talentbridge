import type { FitResult } from "./compute-fit";
import type { ScenarioId } from "./scenarios";

export type ChatPanelRole = "recruiter_to_candidate" | "candidate_to_recruiter";

function panelIntentHint(
  userMessage: string,
  panel: ChatPanelRole,
  fitResult?: FitResult | null
): string {
  const lower = userMessage.toLowerCase();
  const wantsBooking =
    /\b(calendly|book(ing)?|schedule|intro call|next step|share the link|send the link)\b/i.test(
      userMessage
    );
  const compAsk =
    /\b(\d+\s*(lpa|lakhs?|l\b)|comp|salary|package|₹|rs\.?\s*\d)/i.test(userMessage);

  if (panel === "candidate_to_recruiter") {
    if (compAsk && !wantsBooking) {
      return "\n[Intent: compensation question — answer comp band and fit only. Do NOT include any Calendly URL.]";
    }
    if (!wantsBooking) {
      return "\n[Intent: general question — no Calendly URL unless user explicitly asks to book or schedule.]";
    }
    return "";
  }

  const hireSignal =
    /\b(let'?s|ok|yes|go ahead|move forward|green.?light|proceed|hire him|hire her|make an offer)\b/i.test(
      lower
    );
  const passSignal =
    /\b(not hire|don't hire|dont hire|let'?s not|pass on|reject|no go|not moving forward|decline)\b/i.test(
      lower
    );

  if (passSignal && !hireSignal) {
    return "\n[Intent: recruiter is passing on the candidate — acknowledge courteously as his agent; do NOT co-sign or say you would also pass.]";
  }
  if (hireSignal && !passSignal && fitResult?.verdict === "BLOCKED") {
    return "\n[Intent: recruiter wants to proceed but fit is BLOCKED — refuse to green-light; cite the hard blocker.]";
  }
  if (hireSignal && !passSignal && (fitResult?.verdict === "CLEARED" || fitResult?.verdict === "RESCUED")) {
    return "\n[Intent: recruiter wants to proceed — confirm fit briefly and offer a short candidate summary or next-step wording. Do NOT share Calendly.]";
  }
  return "";
}

/** Makes guest agent sound human — not "based on the notes" every reply */
export function wrapGuestMessage(
  userMessage: string,
  panel: ChatPanelRole,
  fitResult?: FitResult | null,
  scenarioId?: ScenarioId | null
): string {
  const candidatePersona = `You are the candidate's coordination agent (Pulse Account A). You represent Shailesh professionally — confident, direct, human. You advocate for him; you are NOT the recruiter.

Rules:
- Speak naturally. Do NOT say "based on the notes", "in the accessible folder", or "the shared documents" — state facts as if you know them.
- Use first person for policy: "My comp floor is ₹8 LPA", "I won't relocate".
- Keep answers 2–4 sentences unless asked for detail.
- If the cross-context fit check is BLOCKED, do NOT approve hire, interview, or "green light" — explain the hard blocker clearly.
- If CLEARED or RESCUED and the recruiter wants to proceed/hire: help with a concise summary or next steps (they coordinate scheduling on their side).
- If the recruiter says pass / don't hire / not moving forward: acknowledge professionally on Shailesh's behalf ("Appreciate the direct feedback"). Do NOT agree to reject him yourself ("I wouldn't move this forward either" is wrong — you represent the candidate).
- Never share Calendly links — booking is the hiring team's job.`;

  const recruiterPersona = `You are the hiring team's role ambassador (Pulse Account B) for this opening. You know the role brief, comp band, team, and interview process.

Rules:
- Speak like a recruiter coordinator, not a document reader. Avoid "the notes say" — state terms directly: "This role is ₹10–14 LPA hybrid in Thane."
- Be helpful and concise (2–4 sentences). Answer ONLY what was asked.
- If comp is below the candidate's stated floor, or above the role's max band, say clearly it is not a fit — do NOT offer interview booking or Calendly.
- Include the Calendly URL ONLY when the user explicitly asks to book, schedule, get the link, or move to intro/next step AND comp expectations align with the role band.
- Never append the Calendly link as a default sign-off. Do not repeat the link unless they ask again.`;

  const persona =
    panel === "recruiter_to_candidate" ? candidatePersona : recruiterPersona;

  let verdictLine = "";
  if (fitResult) {
    verdictLine = `\n[TalentBridge fit check (authoritative): ${fitResult.verdict} — ${fitResult.headline}${
      fitResult.resumeVsContext ? `. ${fitResult.resumeVsContext}` : ""
    }. Honor this in your answer.]`;
  }

  const scenarioLine = scenarioId
    ? `\n[Demo scenario: ${scenarioId}]`
    : "";

  const intentLine = panelIntentHint(userMessage, panel, fitResult);

  return `${persona}${verdictLine}${scenarioLine}${intentLine}\n\n---\nUser message:\n${userMessage}`;
}

export const WORKFLOW_PROMPTS = {
  approveAndEmail: (name = "Shailesh") =>
    `Draft a short professional email to ${name} approving first-round progression. Include: role title, comp band, hybrid expectation, and the Calendly link from our materials for a 30-min intro. Sign off as the hiring team. Under 120 words.`,

  rejectAndEmail: (name = "Shailesh") =>
    `Draft a polite rejection email to ${name}. Reason: comp band does not meet their stated ₹8 LPA floor. Keep it respectful, one paragraph, no false hope.`,

  shareCalendly:
    "Share the intro interview Calendly link from our role materials and explain what the 30-minute call covers.",

  pingRecruiterHuman:
    "TalentBridge: candidate cleared fit check — please review and approve intro scheduling in Pulse.",

  pingCandidateHuman:
    "TalentBridge: role matches your policy — review the role brief and book intro if interested.",
};
