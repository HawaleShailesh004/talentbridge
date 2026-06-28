import type { Side } from "./types";

/** Pulse folder names — file paths MUST use these as the first segment for /accumulate */
export const TB_FOLDER: Record<Side, string> = {
  candidate: "TalentBridgeProfile",
  recruiter: "TalentBridgeRole",
};

export function shareLabelPrefix(side: Side): string {
  return `${side}-`;
}
