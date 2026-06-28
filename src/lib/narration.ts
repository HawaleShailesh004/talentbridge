import type { FitResult } from "./compute-fit";

export type AgentSide = "candidate_agent" | "recruiter_agent";

/** Verdict narration preambles for guest chat proxy messages */
export function buildNarrationPreamble(
  result: FitResult,
  side: AgentSide
): string {
  const reasons = result.checks
    .map((c) => `${c.dimension}: ${c.reason}`)
    .join("; ");

  if (result.verdict === "BLOCKED") {
    return (
      `[COORDINATION VERDICT — BLOCKED]\n` +
      `A cross-context fit check found a hard conflict. Details: ${reasons}.\n` +
      `When you answer, be honest and direct: state the specific blocking constraint plainly. Do not oversell the match. One or two sentences.`
    );
  }

  if (result.verdict === "RESCUED") {
    return (
      `[COORDINATION VERDICT — CLEARED (rescued from keyword filter)]\n` +
      `${result.resumeVsContext}\n` +
      `Supporting checks: ${reasons}.\n` +
      `When you answer, make the key point explicit: the resume text alone looks thin and a keyword/ATS screen would likely reject, but the verified context proves the capability. Cite the concrete verified evidence (not resume buzzwords). Two to three sentences.`
    );
  }

  return (
    `[COORDINATION VERDICT — CLEARED]\n` +
    `A cross-context fit check passed. Details: ${reasons}.\n` +
    `Answer concisely and confirm the relevant fit, citing specific verified facts. If there is a flagged soft concern, mention it honestly. One or two sentences.`
  );
}

export function buildProxyMessage(
  result: FitResult,
  side: AgentSide,
  userMessage: string
): string {
  const preamble = buildNarrationPreamble(result, side);
  const asker = side === "candidate_agent" ? "RECRUITER" : "CANDIDATE";
  return `${preamble}\n\n[${asker} ASKS]\n${userMessage}`;
}

export function buildVerdictNarrationMessage(
  result: FitResult,
  audience: "recruiter" | "candidate",
  userQuestion?: string
): string {
  const side: AgentSide =
    audience === "recruiter" ? "candidate_agent" : "recruiter_agent";
  const question =
    userQuestion?.trim() ||
    (audience === "recruiter"
      ? "Explain this fit check to the recruiter honestly — cite verified context and policy."
      : "Explain what I should know about this role given the fit check.");
  return buildProxyMessage(result, side, question);
}
