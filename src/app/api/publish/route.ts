import { NextRequest, NextResponse } from "next/server";
import {
  accumulateProfile,
  createShareLink,
  ensureFolder,
  initWorkspace,
  listShareLinks,
  revokeShareLink,
} from "@/lib/aicoo";
import { TB_FOLDER, shareLabelPrefix } from "@/lib/constants";
import {
  latestTalentBridgeLink,
  revokeActiveTalentBridgeLinks,
} from "@/lib/share-utils";
import type { Side } from "@/lib/types";

function sideFromRequest(req: NextRequest): Side {
  const side = req.nextUrl.searchParams.get("side");
  if (side !== "candidate" && side !== "recruiter") {
    throw new Error("Invalid side");
  }
  return side;
}

export async function POST(req: NextRequest) {
  try {
    const side = sideFromRequest(req);
    const body = await req.json();

    await initWorkspace(side);

    const folderName = TB_FOLDER[side];
    const folderId = await ensureFolder(side, folderName);

    // Path prefix must match shared folder — Aicoo maps files[].path by first segment.
    const files = [
      { path: `${folderName}/main.md`, content: body.main || "" },
      { path: `${folderName}/secondary.md`, content: body.secondary || "" },
      { path: `${folderName}/policy_or_comp.md`, content: body.policyOrComp || "" },
    ];

    const acc = await accumulateProfile(side, folderName, files);

    // One active link per side: revoke prior TalentBridge links, then mint fresh token.
    const revokedCount = await revokeActiveTalentBridgeLinks(side);

    const label = `${shareLabelPrefix(side)}${Date.now()}`;
    const share = await createShareLink(side, folderId, label);

    return NextResponse.json({
      success: true,
      folderId,
      revokedCount,
      accumulate: acc.data,
      shareLink: {
        ...share.data.shareLink,
        agentUrl: share.data.shareLink.url,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const side = sideFromRequest(req);
    const { data } = await listShareLinks(side);
    const activeLink = latestTalentBridgeLink(side, data.links);
    return NextResponse.json({ ...data, activeLink });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const side = sideFromRequest(req);
    const { linkId } = await req.json();
    if (!linkId) {
      return NextResponse.json({ error: "linkId required" }, { status: 400 });
    }
    const { data } = await revokeShareLink(side, linkId);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Revoke failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
