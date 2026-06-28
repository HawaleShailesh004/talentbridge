import { NextRequest, NextResponse } from "next/server";
import {
  accumulateProfile,
  createShareLink,
  ensureFolder,
  initWorkspace,
} from "@/lib/aicoo";
import { TB_FOLDER, shareLabelPrefix } from "@/lib/constants";
import { computeFit } from "@/lib/compute-fit";
import { getScenario, type ScenarioId, SCENARIOS } from "@/lib/scenarios";
import { revokeActiveTalentBridgeLinks } from "@/lib/share-utils";

function parseScenarioId(raw: string | null): ScenarioId {
  if (raw === "clears" || raw === "blocked" || raw === "rescued") return raw;
  throw new Error("scenario must be clears | blocked | rescued");
}

async function publishSide(
  side: "candidate" | "recruiter",
  ctx: { main: string; secondary: string; policyOrComp: string },
  labelSuffix: string
) {
  await initWorkspace(side);
  const folderName = TB_FOLDER[side];
  const folderId = await ensureFolder(side, folderName);

  const files = [
    { path: `${folderName}/main.md`, content: ctx.main },
    { path: `${folderName}/secondary.md`, content: ctx.secondary },
    { path: `${folderName}/policy_or_comp.md`, content: ctx.policyOrComp },
  ];

  const acc = await accumulateProfile(side, folderName, files);
  await revokeActiveTalentBridgeLinks(side);

  const label = `${shareLabelPrefix(side)}${labelSuffix}`;
  const share = await createShareLink(side, folderId, label);

  return {
    folderId,
    accumulate: acc.data,
    shareLink: {
      ...share.data.shareLink,
      agentUrl: share.data.shareLink.url,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarioId = parseScenarioId(body.scenarioId ?? null);
    const scenario = getScenario(scenarioId);
    const stamp = `${scenarioId}-${Date.now()}`;

    const [candidate, recruiter] = await Promise.all([
      publishSide("candidate", scenario.candidate, stamp),
      publishSide("recruiter", scenario.recruiter, stamp),
    ]);

    const fitResult = computeFit(scenario.policy, scenario.signal, scenario.role);

    return NextResponse.json({
      success: true,
      scenarioId,
      fitResult,
      candidate,
      recruiter,
      expect: scenario.expect,
      expectMatch: fitResult.verdict === scenario.expect,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scenario apply failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const results = Object.values(SCENARIOS).map((s) => {
    const r = computeFit(s.policy, s.signal, s.role);
    return {
      id: s.id,
      expect: s.expect,
      got: r.verdict,
      pass: r.verdict === s.expect,
      headline: r.headline,
    };
  });
  return NextResponse.json({
    ok: results.every((r) => r.pass),
    results,
  });
}
