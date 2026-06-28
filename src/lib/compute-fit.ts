/**
 * Deterministic fit engine — verdict is computed here; guest agents only narrate.
 */

export type CheckStatus = "PASS" | "FLAG" | "BLOCK";
export type Verdict = "CLEARED" | "BLOCKED" | "RESCUED";

export interface CandidatePolicy {
  compFloorLpa: number;
  allowedCities: string[];
  noRelocation: boolean;
  maxOfficeDays: number;
  noticeDays: number;
  roleTypePref?: string[];
}

export interface CandidateSignal {
  keywordSkills: string[];
  keywordStrength: number;
  verifiedContext: string[];
  contextStrength: number;
}

export interface RoleBrief {
  compMinLpa: number;
  compMaxLpa: number;
  locationCity: string;
  onsite: boolean;
  inOfficeDays: number;
  requiredCapabilities: string[];
  roleType?: string[];
}

export interface FitCheck {
  dimension: string;
  status: CheckStatus;
  reason: string;
}

export interface FitResult {
  verdict: Verdict;
  checks: FitCheck[];
  headline: string;
  resumeVsContext?: string;
}

export const KEYWORD_WEAK_BELOW = 0.45;
export const CONTEXT_STRONG_ABOVE = 0.7;
export const CAPABILITY_MATCH_ABOVE = 0.6;

function capabilityOverlap(roleNeeds: string[], proven: string[]): number {
  if (!roleNeeds.length) return 1;
  const blob = proven.join(" ").toLowerCase();
  let hits = 0;
  for (const need of roleNeeds) {
    const tokens = need.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (
      tokens.length &&
      tokens.filter((t) => blob.includes(t)).length >=
        Math.max(1, Math.floor(tokens.length / 2))
    ) {
      hits += 1;
    }
  }
  return hits / roleNeeds.length;
}

export function computeFit(
  policy: CandidatePolicy,
  signal: CandidateSignal,
  role: RoleBrief
): FitResult {
  const checks: FitCheck[] = [];

  if (role.compMaxLpa < policy.compFloorLpa) {
    checks.push({
      dimension: "comp",
      status: "BLOCK",
      reason: `Role tops out at ₹${role.compMaxLpa}L; candidate floor is ₹${policy.compFloorLpa}L`,
    });
  } else {
    checks.push({
      dimension: "comp",
      status: "PASS",
      reason: `Band ₹${role.compMinLpa}–${role.compMaxLpa}L clears floor ₹${policy.compFloorLpa}L`,
    });
  }

  const inAllowed = policy.allowedCities.includes(role.locationCity);
  if (role.onsite && policy.noRelocation && !inAllowed) {
    checks.push({
      dimension: "location",
      status: "BLOCK",
      reason: `Role is full-time onsite in ${role.locationCity}; candidate policy: ${policy.allowedCities.join(", ")} only, no relocation`,
    });
  } else if (!inAllowed && policy.noRelocation) {
    checks.push({
      dimension: "location",
      status: "BLOCK",
      reason: `Role in ${role.locationCity}; candidate will not relocate (allowed: ${policy.allowedCities.join(", ")})`,
    });
  } else if (role.inOfficeDays > policy.maxOfficeDays) {
    checks.push({
      dimension: "location",
      status: "FLAG",
      reason: `Role wants ${role.inOfficeDays} office days/wk; candidate prefers ≤${policy.maxOfficeDays}`,
    });
  } else {
    checks.push({
      dimension: "location",
      status: "PASS",
      reason: `${role.locationCity} within candidate's allowed locations`,
    });
  }

  checks.push({
    dimension: "notice",
    status: "PASS",
    reason: `Notice ${policy.noticeDays} days`,
  });

  const capOverlap = capabilityOverlap(
    role.requiredCapabilities,
    signal.verifiedContext
  );
  const keywordWeak = signal.keywordStrength < KEYWORD_WEAK_BELOW;
  const contextStrong =
    signal.contextStrength >= CONTEXT_STRONG_ABOVE &&
    capOverlap >= CAPABILITY_MATCH_ABOVE;

  if (contextStrong) {
    checks.push({
      dimension: "stack",
      status: "PASS",
      reason: keywordWeak
        ? "Resume keywords WEAK, but verified context proves capability"
        : "Capabilities confirmed by verified context",
    });
  } else {
    checks.push({
      dimension: "stack",
      status: "BLOCK",
      reason:
        "Neither resume keywords nor verified context cover the role's core capabilities",
    });
  }

  const hasBlock = checks.some((c) => c.status === "BLOCK");
  if (hasBlock) {
    const blocking = checks.find((c) => c.status === "BLOCK")!;
    return {
      verdict: "BLOCKED",
      checks,
      headline: `BLOCKED — ${blocking.reason}`,
    };
  }

  if (contextStrong && keywordWeak) {
    return {
      verdict: "RESCUED",
      checks,
      headline:
        "CLEARED — would be filtered by resume keywords; verified context confirms fit",
      resumeVsContext: `Resume-keyword match: WEAK (${Math.round(signal.keywordStrength * 100)}%). Verified-context match: STRONG (${Math.round(signal.contextStrength * 100)}%, capabilities ${Math.round(capOverlap * 100)}%). An ATS would reject this candidate; the coordination layer confirms the fit.`,
    };
  }

  const flagged = checks.find((c) => c.status === "FLAG");
  if (flagged) {
    return {
      verdict: "CLEARED",
      checks,
      headline: `CLEARED with 1 flag — ${flagged.reason}`,
    };
  }

  return {
    verdict: "CLEARED",
    checks,
    headline: "CLEARED — comp, location, and capability all pass",
  };
}
