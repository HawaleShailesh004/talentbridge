const BASE = "https://www.aicoo.io/api/v1";
const GUEST_CHAT = "https://www.aicoo.io/api/chat/guest-v04";

export function getKey(side: "candidate" | "recruiter"): string {
  const key =
    side === "candidate"
      ? process.env.CANDIDATE_PULSE_KEY || process.env.AICOO_API_KEY
      : process.env.RECRUITER_PULSE_KEY;
  if (!key) throw new Error(`Missing API key for ${side}`);
  return key;
}

export async function aicooFetch<T>(
  key: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Aicoo ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = data as { message?: string; error?: string };
    throw new Error(err.message || err.error || `Aicoo error ${res.status}`);
  }
  return { status: res.status, data };
}

export async function initWorkspace(side: "candidate" | "recruiter") {
  return aicooFetch<{ success: boolean }>(getKey(side), "POST", "/init", {});
}

export async function accumulateProfile(
  side: "candidate" | "recruiter",
  folderName: string,
  files: { path: string; content: string }[]
) {
  return aicooFetch<{
    success: boolean;
    created: number;
    updated: number;
    foldersCreated?: string[];
  }>(getKey(side), "POST", "/accumulate", {
    files,
    folders: { create: [folderName] },
  });
}

export async function listFolders(side: "candidate" | "recruiter") {
  return aicooFetch<{ success: boolean; folders: { id: number; name: string; fileCount: number }[] }>(
    getKey(side),
    "GET",
    "/context/folders"
  );
}

export async function ensureFolder(side: "candidate" | "recruiter", name: string) {
  const { data } = await listFolders(side);
  const existing = data.folders.find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await aicooFetch<{ success: boolean; folder: { id: number } }>(
    getKey(side),
    "POST",
    "/context/folders",
    { name, parentId: null }
  );
  return created.data.folder.id;
}

export async function createShareLink(
  side: "candidate" | "recruiter",
  folderId: number,
  label: string
) {
  return aicooFetch<{
    success: boolean;
    shareLink: {
      id: string;
      token: string;
      url: string;
      scope: string;
      access: string;
      requireSignIn?: boolean;
      expiresAt?: string;
      createdAt?: string;
    };
  }>(getKey(side), "POST", "/share/create", {
    scope: "folders",
    folderIds: [folderId],
    access: "read",
    requireSignIn: false,
    identity: { loadCoo: true, loadUser: true, loadPolicy: true },
    expiresIn: "7d",
    label,
  });
}

export async function listShareLinks(side: "candidate" | "recruiter") {
  return aicooFetch<{
    success: boolean;
    links: Array<{
      id: string;
      url: string;
      agentUrl?: string;
      scope?: string;
      access?: string;
      label?: string;
      isActive: boolean;
      expiresAt?: string;
      createdAt?: string;
      analytics?: {
        uniqueVisitors: number;
        totalConversations: number;
        totalMessages: number;
      };
    }>;
  }>(getKey(side), "GET", "/share/list?status=all&limit=20");
}

export async function revokeShareLink(side: "candidate" | "recruiter", linkId: string) {
  return aicooFetch<{ success: boolean; message: string }>(
    getKey(side),
    "DELETE",
    `/share/${linkId}`
  );
}

export async function patchShareLink(
  side: "candidate" | "recruiter",
  linkId: string,
  folderIds: number[]
) {
  return aicooFetch<{
    success: boolean;
    shareLink: {
      id: string;
      token: string;
      url: string;
      scope: string;
    };
  }>(getKey(side), "PATCH", `/share/${linkId}`, {
    scope: "folders",
    folderIds,
  });
}

export async function enableMessaging(side: "candidate" | "recruiter") {
  return aicooFetch<{ success: boolean }>(getKey(side), "PUT", "/tools/namespaces", {
    namespaces: { messaging: true },
  });
}

export async function runHeartbeat(
  side: "candidate" | "recruiter",
  tier: "ACTIONS" | "MESSAGES" = "ACTIONS"
) {
  return aicooFetch<{
    success: boolean;
    result: {
      runId: number;
      status: string;
      actionsCreated?: number;
      startedAt?: string;
      completedAt?: string;
    };
  }>(getKey(side), "POST", "/heartbeat/run", { tier });
}

export async function guestChat(token: string, message: string, sessionKey?: string) {
  const res = await fetch(GUEST_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, message, sessionKey }),
    cache: "no-store",
  });
  return res;
}

export { GUEST_CHAT };
