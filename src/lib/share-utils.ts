import type { ShareLink, Side } from "./types";
import { shareLabelPrefix } from "./constants";
import { listShareLinks, revokeShareLink } from "./aicoo";

export type ListedShareLink = {
  id: string;
  url: string;
  agentUrl?: string;
  scope?: string;
  access?: string;
  label?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt?: string;
  analytics?: ShareLink["analytics"];
};

export function extractTokenFromShareUrl(url: string): string {
  const match = url.match(/\/(?:a|shared)\/([^/?#]+)/);
  return match?.[1] ?? "";
}

export function listedLinkToShareLink(link: ListedShareLink): ShareLink {
  const url = link.agentUrl || link.url;
  return {
    id: link.id,
    token: extractTokenFromShareUrl(url),
    url,
    scope: link.scope ?? "folders",
    access: link.access ?? "read",
    label: link.label,
    isActive: link.isActive,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    analytics: link.analytics,
  };
}

export function latestTalentBridgeLink(
  side: Side,
  links: ListedShareLink[]
): ShareLink | null {
  const prefix = shareLabelPrefix(side);
  const match = links
    .filter((l) => l.isActive && l.label?.startsWith(prefix))
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    )[0];

  return match ? listedLinkToShareLink(match) : null;
}

export async function revokeActiveTalentBridgeLinks(
  side: Side
): Promise<number> {
  const { data } = await listShareLinks(side);
  const prefix = shareLabelPrefix(side);
  const active = data.links.filter(
    (l) => l.isActive && l.label?.startsWith(prefix)
  );

  for (const link of active) {
    await revokeShareLink(side, link.id);
  }

  return active.length;
}
