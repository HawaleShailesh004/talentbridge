/**
 * TalentBridge — Day 0 primitive verification
 * Run: npm run verify (from talentbridge/)
 * Requires CANDIDATE_PULSE_KEY (+ optional RECRUITER_PULSE_KEY) in .env.local
 *
 * Loads .env.local manually (no dotenv dep).
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const BASE = "https://www.aicoo.io/api/v1";

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnv();

const CANDIDATE_KEY = process.env.CANDIDATE_PULSE_KEY || process.env.AICOO_API_KEY;
const RECRUITER_KEY = process.env.RECRUITER_PULSE_KEY;

const results = [];

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  log(pass ? "✅" : "❌", `${name}: ${detail}`);
}

async function aicoo(key, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, json, text };
}

async function fetchUrl(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    text: text.slice(0, 300),
    isHtml: text.trimStart().startsWith("<!") || text.includes("<html"),
  };
}

async function main() {
  console.log("\n=== TalentBridge — Aicoo Primitive Verification ===\n");

  if (!CANDIDATE_KEY) {
    console.error(
      "Missing CANDIDATE_PULSE_KEY. Copy .env.local.example → .env.local and add your key.\n"
    );
    process.exit(1);
  }

  // ── RISK #1: accumulate + folder path format ──
  const stamp = Date.now();
  const acc = await aicoo(CANDIDATE_KEY, "POST", "/accumulate", {
    files: [
      {
        path: `verify/profile_${stamp}.md`,
        content: `# Verify Profile\nBuilt at ${new Date().toISOString()}`,
      },
      {
        path: `verify/policy_${stamp}.md`,
        content: `# Policy\nComp floor: ₹8 LPA\nLocation: Thane only`,
      },
    ],
    folders: { create: ["verify"] },
  });
  record(
    "accumulate (path format)",
    acc.ok,
    acc.ok ? `created=${acc.json.created}, updated=${acc.json.updated}` : `${acc.status} ${JSON.stringify(acc.json)}`
  );

  // ── RISK #2: folder IDs for share/create ──
  const folders = await aicoo(CANDIDATE_KEY, "GET", "/context/folders");
  const verifyFolder = folders.ok
    ? folders.json.folders?.find((f) => f.name === "verify" || f.name === "Verify")
    : null;
  record(
    "context/folders (list)",
    folders.ok && Array.isArray(folders.json.folders),
    folders.ok ? `${folders.json.folders?.length} folders` : `${folders.status}`
  );

  let folderId = verifyFolder?.id;
  if (!folderId && folders.ok) {
    const createF = await aicoo(CANDIDATE_KEY, "POST", "/context/folders", {
      name: "TalentBridgeVerify",
      parentId: null,
    });
    folderId = createF.json?.folder?.id;
    record("context/folders (create)", createF.ok, createF.ok ? `id=${folderId}` : `${createF.status}`);
  } else {
    record("verify folder id", !!folderId, folderId ? `id=${folderId}` : "no verify folder found");
  }

  // Put a file in the folder we'll share
  if (folderId) {
    await aicoo(CANDIDATE_KEY, "POST", "/accumulate", {
      texts: [
        {
          title: `shared_context_${stamp}`,
          content: "Senior MERN dev. 3 production apps. Available in 30 days.",
          folder: verifyFolder?.name || "TalentBridgeVerify",
        },
      ],
    });
  }

  // ── RISK #3: share/create (correct enum format) ──
  let shareLink = null;
  if (folderId) {
    const share = await aicoo(CANDIDATE_KEY, "POST", "/share/create", {
      scope: "folders",
      folderIds: [folderId],
      access: "read",
      requireSignIn: false, // CRITICAL: default is true; blocks guest-v04 without login
      identity: { loadCoo: true, loadUser: true, loadPolicy: true },
      expiresIn: "7d",
      label: `verify-${stamp}`,
    });
    shareLink = share.json?.shareLink;
    // Live API returns agent URL in `url` field (docs also show separate agentUrl — may be absent)
    const agentUrl = shareLink?.agentUrl || shareLink?.url;
    if (shareLink) shareLink.agentUrl = agentUrl;
    record(
      "share/create",
      share.ok && !!agentUrl,
      share.ok
        ? `url=${agentUrl}, requireSignIn=${shareLink.requireSignIn}`
        : `${share.status} ${JSON.stringify(share.json)}`
    );
    record(
      "share requireSignIn=false",
      share.ok && shareLink?.requireSignIn === false,
      shareLink?.requireSignIn === false
        ? "anonymous guest access enabled"
        : `requireSignIn=${shareLink?.requireSignIn} — guest-v04 will 401`
    );
  } else {
    record("share/create", false, "skipped — no folderId");
  }

  // ── RISK #4 (BIGGEST): agentUrl — page vs API, iframe headers ──
  if (shareLink?.agentUrl) {
    const agentPage = await fetchUrl(shareLink.agentUrl);
    const xfo = agentPage.headers["x-frame-options"] || agentPage.headers["content-security-policy"] || "none";
    const embeddable =
      !agentPage.headers["x-frame-options"]?.toLowerCase().includes("deny") &&
      !agentPage.headers["x-frame-options"]?.toLowerCase().includes("sameorigin");
    record(
      "agentUrl GET (hosted page)",
      agentPage.status === 200 && agentPage.isHtml,
      `status=${agentPage.status}, html=${agentPage.isHtml}, x-frame-options=${xfo}`
    );
    record(
      "agentUrl iframe embeddable",
      embeddable,
      embeddable
        ? "likely embeddable (no X-Frame-Options DENY/SAMEORIGIN)"
        : "may block iframe — use linked panel (Option B)"
    );

    // Try POST to agentUrl (expect HTML or 405)
    const agentPost = await fetchUrl(shareLink.agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Does candidate meet ₹8 LPA floor?" }),
    });
    record(
      "agentUrl POST (programmatic)",
      false,
      `status=${agentPost.status}, html=${agentPost.isHtml} — ${agentPost.isHtml ? "NOT a JSON API (use iframe or guest-v04)" : "unexpected"}`
    );

    // ── RISK #5: guest-v04 (undocumented) ──
    const token = shareLink.token;
    if (shareLink.requireSignIn === false) {
      const guest = await fetch("https://www.aicoo.io/api/chat/guest-v04", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: "What is the comp floor?" }),
      });
      const guestText = await guest.text();
      record(
        "guest-v04 POST",
        guest.status === 200,
        `status=${guest.status}, preview=${guestText.slice(0, 120)}`
      );
    } else {
      record(
        "guest-v04 POST",
        false,
        "skipped — requireSignIn=true on link; set requireSignIn:false on share/create"
      );
    }

    // ── RISK #6: revoke ──
    const linkId = shareLink.id;
    const revoke = await aicoo(CANDIDATE_KEY, "DELETE", `/share/${linkId}`);
    record("share revoke DELETE", revoke.ok, revoke.ok ? revoke.json.message || "ok" : `${revoke.status}`);

    const guestAfter = await fetch("https://www.aicoo.io/api/chat/guest-v04", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: "after revoke" }),
    });
    const guestAfterText = await guestAfter.text();
    record(
      "guest-v04 after revoke",
      guestAfter.status === 404 || guestAfterText.includes("revoked"),
      `status=${guestAfter.status} — ${guestAfterText.slice(0, 80)}`
    );
  }

  // ── RISK #7: share/list analytics ──
  const list = await aicoo(CANDIDATE_KEY, "GET", "/share/list?status=all&limit=5");
  record(
    "share/list analytics",
    list.ok && Array.isArray(list.json.links),
    list.ok
      ? `${list.json.links?.length} links, sample analytics=${JSON.stringify(list.json.links?.[0]?.analytics || {})}`
      : `${list.status}`
  );

  // ── RISK #8: send_message_to_human (needs recruiter key + network) ──
  if (RECRUITER_KEY) {
    // Tools are disabled by default — enable messaging namespace first
    await aicoo(RECRUITER_KEY, "PUT", "/tools/namespaces", {
      namespaces: { messaging: true },
    });
    const tools = await aicoo(RECRUITER_KEY, "GET", "/tools");
    const msgTool = tools.json?.tools?.find((t) => t.name === "send_message_to_human");
    record(
      "tools discover send_message_to_human",
      !!msgTool,
      msgTool ? `schema=${JSON.stringify(msgTool.parameters?.required || [])}` : "not found"
    );

    if (msgTool) {
      const exec = await aicoo(RECRUITER_KEY, "POST", "/tools", {
        tool: "send_message_to_human",
        params: { message: "TalentBridge verify ping" },
      });
      record(
        "send_message_to_human execute",
        exec.ok || exec.status === 422,
        `${exec.status} ${JSON.stringify(exec.json).slice(0, 200)}`
      );
    }
  } else {
    log("⚠️", "RECRUITER_PULSE_KEY not set — skipping send_message_to_human test");
  }

  // ── Summary ──
  console.log("\n=== SUMMARY ===");
  const failed = results.filter((r) => !r.pass && r.name !== "agentUrl POST (programmatic)");
  const critical = [
    "share/create",
    "share requireSignIn=false",
    "guest-v04 POST",
    "share revoke DELETE",
    "guest-v04 after revoke",
  ];
  const criticalOk = critical.every((n) => results.find((r) => r.name === n)?.pass);

  if (criticalOk) {
    log("✅", "CRITICAL PATH OK — safe to scaffold Next.js app (use iframe or guest-v04 for chat panels)");
  } else {
    log("❌", "CRITICAL PATH BLOCKED — fix failures above before building UI");
  }

  console.log(`\nPassed: ${results.filter((r) => r.pass).length}/${results.length}`);
  if (failed.length) {
    console.log("Non-blocking failures:", failed.map((r) => r.name).join(", "));
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
