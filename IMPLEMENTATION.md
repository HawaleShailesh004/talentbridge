# TalentBridge — Implementation Reference

Complete documentation of everything implemented in the TalentBridge hackathon app: architecture, Aicoo integration, backend routes, core logic, UI/UX, demo scenarios, and verification tooling.

---

## 1. Product overview

**TalentBridge** is a two-sided hiring coordination demo built for the Aicoo Agent-Coordination Hackathon. It shows **mutual first-pass diligence**: a candidate and a recruiter each publish verified context to separate Aicoo Pulse accounts, share scoped read-only links, run a **deterministic cross-context fit check**, and use **guest agents** to narrate results in natural language.

**Core thesis:** Hiring wastes time on comp mismatches and ATS false negatives. TalentBridge catches hard blockers early (BLOCKED), rescues strong candidates whose resumes look thin (RESCUED), and moves aligned matches forward (CLEARED) with workflow actions (email drafts, Calendly on request, Pulse ping, live revoke).

**Important distinction:** The two chat panels are **not** a single recruiter ↔ candidate room. Each panel is one party querying the **other party’s published Pulse agent** via guest share tokens.

| Panel | User plays | Agent answers from |
|-------|------------|-------------------|
| Recruiter → Candidate | Recruiter | Candidate Pulse (Account A) share |
| Candidate → Recruiter | Candidate | Recruiter Pulse (Account B) share |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 14 App (page.tsx)                    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Scenario     │ Publish      │ Fit verdict  │ Mutual diligence   │
│ toggle       │ forms        │ + workflow   │ chat (×2)          │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────┬──────────┘
       │              │              │                 │
       ▼              ▼              │                 ▼
 POST /api/scenario  POST /api/publish                 POST /api/chat/guest
       │              │              │                 │
       └──────────────┴──────────────┘                 │
                      │                                │
                      ▼                                ▼
              ┌───────────────┐              ┌─────────────────┐
              │  lib/aicoo.ts │              │ guest-v04 stream │
              │  accumulate   │              │ (NDJSON proxy)   │
              │  share/create │              └─────────────────┘
              │  revoke, etc. │
              └───────┬───────┘
                      │
                      ▼
              https://www.aicoo.io/api/v1
              https://www.aicoo.io/api/chat/guest-v04
```

**Two Pulse API keys (server-side only):**

| Env var | Role |
|---------|------|
| `CANDIDATE_PULSE_KEY` | Pulse Account A — profile, policy, verified skills |
| `RECRUITER_PULSE_KEY` | Pulse Account B — role brief, comp band, interview process |

**Published folder structure (critical):** Files are accumulated with paths whose first segment matches the shared folder name so Aicoo scopes them correctly inside share links.

| Side | Folder name | Files |
|------|-------------|-------|
| Candidate | `TalentBridgeProfile` | `main.md`, `secondary.md`, `policy_or_comp.md` |
| Recruiter | `TalentBridgeRole` | `main.md`, `secondary.md`, `policy_or_comp.md` |

---

## 3. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + custom design tokens (`globals.css`) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Markdown | `react-markdown` + `remark-gfm` |
| Streaming | Fetch ReadableStream + NDJSON parser |

**Scripts:**

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run verify` | Aicoo primitive smoke tests (`scripts/verify-primitives.mjs`) |
| `npm run verify:scenarios` | Deterministic fit engine for all 3 scenarios |

---

## 4. Aicoo primitives used

| Primitive | Where used | Purpose |
|-----------|------------|---------|
| `POST /init` | Publish, scenario | Initialize workspace |
| `POST /accumulate` | Publish, scenario | Write markdown context files |
| `GET/POST /context/folders` | `ensureFolder` | Resolve or create scoped folders |
| `POST /share/create` | Publish, scenario | Mint guest share link with `loadPolicy: true` |
| `GET /share/list` | Publish GET, analytics | List links + visitor/conversation stats |
| `DELETE /share/{id}` | Publish DELETE, revoke demo | Revoke access → guest-v04 404 |
| `PATCH /share/{id}` | `aicoo.ts` (available, unused in UI) | Optional folder swap on existing link |
| `POST /chat/guest-v04` | Chat proxy | Streaming agent chat (not iframe) |
| `PUT /tools/namespaces` | Message route | Enable `messaging` namespace |
| `POST /tools` (`send_message_to_human`) | Message route, workflow ping | Notify Pulse account owner |
| `POST /heartbeat/run` | Heartbeat route, UI button | Optional autonomous actions tier |

**Share link configuration:**

- `scope: "folders"`, `access: "read"`
- `requireSignIn: false` — required for anonymous guest-v04
- `identity: { loadCoo: true, loadUser: true, loadPolicy: true }`
- `expiresIn: "7d"`
- Labels prefixed `candidate-` / `recruiter-` for link management

**Link lifecycle:** On each publish or scenario apply, all active TalentBridge links for that side are revoked, then one fresh link is created (single active link per side).

---

## 5. Backend API routes

### `POST /api/publish?side=candidate|recruiter`

Manual publish from PublishForm.

**Body:** `{ main, secondary, policyOrComp }` (markdown strings)

**Flow:**

1. `initWorkspace(side)`
2. `ensureFolder(side, TB_FOLDER[side])`
3. `accumulateProfile` with paths `{folderName}/main.md`, etc.
4. `revokeActiveTalentBridgeLinks(side)`
5. `createShareLink(side, folderId, label)`

**Response:** `{ success, folderId, revokedCount, accumulate, shareLink }` where `shareLink` includes `agentUrl`.

---

### `GET /api/publish?side=candidate|recruiter`

List share links and resolve latest active TalentBridge link.

**Response:** Aicoo `links` array + `activeLink` (parsed token via URL regex).

Used for analytics polling on the main page (every 15s).

---

### `DELETE /api/publish?side=candidate|recruiter`

Revoke a share link.

**Body:** `{ linkId }`

**Response:** Aicoo revoke payload.

Used by Coordination Hub “Revoke candidate access” demo.

---

### `POST /api/scenario`

Apply a demo scenario to **both** sides in parallel.

**Body:** `{ scenarioId: "clears" | "blocked" | "rescued" }`

**Flow:**

1. Load scenario seed from `lib/scenarios.ts`
2. `publishSide("candidate", …)` and `publishSide("recruiter", …)` in parallel
3. `computeFit(scenario.policy, scenario.signal, scenario.role)`

**Response:**

```json
{
  "success": true,
  "scenarioId": "blocked",
  "fitResult": { "verdict", "checks", "headline", "resumeVsContext?" },
  "candidate": { "folderId", "accumulate", "shareLink" },
  "recruiter": { "folderId", "accumulate", "shareLink" },
  "expect": "BLOCKED",
  "expectMatch": true
}
```

---

### `GET /api/scenario`

Harness endpoint — returns pass/fail for all three scenarios vs expected verdict.

---

### `POST /api/chat/guest`

Proxies Aicoo guest-v04 chat.

**Body:** `{ token, message, sessionKey? }`

**Success:** Pipes upstream NDJSON body through with `Content-Type: application/x-ndjson`.

**Error:** JSON with `{ error, revoked?: true }` when share link is dead (404).

The client never calls Aicoo directly; tokens stay server-mediated (token is passed from client but message wrapping happens client-side before POST).

---

### `POST /api/message`

Executes Aicoo `send_message_to_human` tool.

**Body:** `{ side: "candidate"|"recruiter", message, recipientId? }`

**Flow:**

1. Validate side + message
2. `enableMessaging(side)` — `PUT /tools/namespaces { messaging: true }`
3. `POST /tools` with tool name and params (`recipient_id` optional)

Used by **Ping recruiter in Pulse** workflow button.

---

### `POST /api/heartbeat/run?side=candidate|recruiter`

Runs Aicoo heartbeat.

**Body:** `{ tier: "ACTIONS" | "MESSAGES" }` (defaults to ACTIONS)

**Response:** `{ success, result: { runId, status, actionsCreated, … } }`

UI shows result note under fit panel. Often returns `0 actions` if no heartbeat policy is configured — API success is still valid.

---

## 6. Core libraries (`src/lib/`)

### `aicoo.ts`

Central Aicoo HTTP client:

- `getKey(side)` — resolves env keys
- `aicooFetch` — Bearer auth, JSON parse, error surfacing
- Workspace: `initWorkspace`, `accumulateProfile`, `listFolders`, `ensureFolder`
- Sharing: `createShareLink`, `listShareLinks`, `revokeShareLink`, `patchShareLink`
- Tools: `enableMessaging`, `runHeartbeat`
- Chat: `guestChat` — raw fetch to guest-v04 (returns Response for streaming)

### `compute-fit.ts`

**Deterministic fit engine.** The LLM/agent does **not** decide fit; this module does.

**Inputs:**

- `CandidatePolicy` — comp floor, cities, relocation, max office days, notice, role prefs
- `CandidateSignal` — keyword strength, verified context strings, context strength
- `RoleBrief` — comp band, location, onsite/hybrid days, required capabilities

**Dimensions checked:**

| Dimension | BLOCK | FLAG | PASS |
|-----------|-------|------|------|
| comp | Role max < candidate floor | — | Band clears floor |
| location | Onsite/relocation conflict | Too many office days | City in allowed list |
| notice | — | — | Always pass (informational) |
| stack | Weak keywords + weak context | — | Verified context proves capabilities |

**Verdicts:**

- `BLOCKED` — any BLOCK check
- `RESCUED` — no blocks, keyword weak + context strong (ATS false-negative path)
- `CLEARED` — all pass (may include FLAG in headline)

**Thresholds:** `KEYWORD_WEAK_BELOW = 0.45`, `CONTEXT_STRONG_ABOVE = 0.7`, `CAPABILITY_MATCH_ABOVE = 0.6`

### `scenarios.ts`

Three demo scenarios with rich markdown seeds + structured fit inputs:

| ID | Label | Expected verdict | Story |
|----|-------|------------------|-------|
| `clears` | Clears | CLEARED | Strong resume + context; senior role ₹10–14L vs ₹8L floor |
| `blocked` | Blocked | BLOCKED | Junior role ₹6–7L vs ₹8L floor |
| `rescued` | Rescued | RESCUED | Thin resume keywords; strong verified production context |

Each scenario includes:

- `candidate` / `recruiter` `SideContext` (three markdown files)
- `policy`, `signal`, `role` for `computeFit`
- `verifyAllScenarios()` for CI/harness

**Clears/Rescued recruiter briefs** include Calendly URL: `https://calendly.com/talentbridge-demo/senior-backend-intro`

**Blocked recruiter brief** explicitly states no Calendly until comp aligns.

### `narration.ts`

Builds verdict injection messages for guest chat:

- `buildNarrationPreamble(result, side)` — BLOCKED / RESCUED / CLEARED preambles
- `buildVerdictNarrationMessage(result, audience)` — used by “Agent narrates verdict” buttons

Agents are instructed to **narrate** the deterministic verdict, not recompute it.

### `chat-persona.ts`

Human-like agent behavior layer — wraps every outgoing chat message before guest-v04.

**`wrapGuestMessage(userMessage, panel, fitResult?, scenarioId?)`:**

- **Candidate agent persona** (Recruiter → Candidate panel): first person, no “based on the notes”, refuses hire on BLOCKED, does not co-sign recruiter pass decisions, never shares Calendly
- **Recruiter role agent persona** (Candidate → Recruiter panel): direct comp/location answers, Calendly **only** on explicit booking request when comp aligns
- Injects authoritative fit verdict line
- **`panelIntentHint`** — regex-based intent hints for comp-only questions, hire/pass signals, booking requests

**`WORKFLOW_PROMPTS`:** canned prompts for approval email, rejection email, Calendly share, Pulse pings.

### `parse-stream.ts`

NDJSON stream handling for guest-v04:

- `StreamEvent` types: `text-delta`, `text`, `sessionKey`, etc.
- `applyStreamEvent` — accumulates text + session key
- `consumeNdjsonBuffer` — incremental line parser for ReadableStream

### `parse-agent-content.ts`

- `splitAgentContent` — separates markdown body from trailing `<suggestions>…</suggestions>` block
- `displayWhileStreaming` — hides partial suggestions tag during stream

### `share-utils.ts`

- `extractTokenFromShareUrl` — regex on `/a/` or `/shared/` paths
- `listedLinkToShareLink` — normalizes list API shape
- `latestTalentBridgeLink` — finds newest active link by label prefix
- `revokeActiveTalentBridgeLinks` — bulk revoke before republish

### `constants.ts`

- `TB_FOLDER` — `TalentBridgeProfile` / `TalentBridgeRole`
- `shareLabelPrefix(side)` — `candidate-` / `recruiter-`

### `types.ts`

Shared TypeScript types: `Side`, `ShareLink`, `Folder`, payloads, session state.

---

## 7. UI components

### `Hero.tsx`

- Animated badge: “Powered by Aicoo Coordination Layer”
- Gradient title “TalentBridge”
- Subtitle: mutual diligence via permissioned share links
- Feature chips: guest-v04 chat, identity.loadPolicy, live revoke

### `ScenarioToggle.tsx`

- Three clickable chips: **Clears**, **Blocked**, **Rescued**
- Color-coded active states (emerald / rose / violet)
- Loading spinner during publish
- Subtitle: re-publishes workspaces, resets chats, recomputes fit

### `PublishForm.tsx` (×2 on page)

Per-side manual publish UI:

- Three markdown textareas: main, secondary, policy/comp
- Syncs from scenario seed via `useEffect`
- “Publish to Pulse manually” → `POST /api/publish`
- Pulse Account A (candidate) / B (recruiter) labels
- Error display with AnimatePresence

### `FitVerdictPanel.tsx`

Displays deterministic fit result:

- Verdict header: CLEARED (emerald) / BLOCKED (rose) / RESCUED (violet)
- Headline + optional `resumeVsContext` killer line for RESCUED
- Grid of dimension cards: comp, location, notice, stack — each with PASS/FLAG/BLOCK badge
- “Cross-boundary via Aicoo share scope” footnote on each check
- Action buttons:
  - Agent narrates verdict → recruiter
  - Agent narrates verdict → candidate
  - Run heartbeat (ACTIONS) — hidden when BLOCKED
- **Collapsed mode** when candidate link revoked — rose banner only

### `WorkflowActions.tsx`

Contextual next-step buttons under fit panel:

**CLEARED / RESCUED:**

- Draft approval email → recruiter chat panel
- Share Calendly (role agent) → candidate→recruiter panel
- Ping recruiter in Pulse → `/api/message`

**BLOCKED:**

- Draft rejection email → recruiter chat
- Candidate negotiation draft → candidate chat

Footer note: SMTP/Calendly API are future integrations; demo uses agent drafts + Aicoo messaging.

### `CoordinationHub.tsx`

Permission layer visualization:

- Candidate + recruiter share URLs (mono, truncated)
- Revoked state styling on candidate link
- Analytics grid: Visitors, Chats, Messages (polled from share list)
- **Revoke candidate access (live demo)** — destructive button
- Revoked warning copy

### `ChatPanel.tsx`

Full streaming chat UI (480px height):

**Header:** title, subtitle (Pulse direction), “Open on Aicoo” external link

**States:**

- No token — “Publish context first”
- Scenario banner — `Scenario: {chip} · fresh chat — ask below`
- Amber banner — link revoked, history preserved
- Rose banner — session killed after 404

**Chat features:**

- Suggested prompt chips when empty (scenario-specific)
- User bubbles (gradient cyan→violet) vs agent bubbles (glass)
- Streaming via NDJSON → live markdown update
- `<suggestions>` parsed into clickable follow-up chips
- Session key persistence across turns
- **`scenarioResetKey`** — clears messages, session, input on scenario change
- **`transformMessage`** — persona wrapper before API call; user sees raw text, API gets wrapped message
- **`forwardRef` + `sendMessage`** — programmatic sends from verdict/workflow buttons
- Revoke handling: next message → 404 → `sessionKilled` + explanatory copy

### `AgentMessage.tsx`

- Renders agent markdown with custom ReactMarkdown components
- Streaming cursor + “Thinking…” placeholder
- Suggestion chips with accent-colored hover (cyan/violet)

---

## 8. Main page (`src/app/page.tsx`)

**Layout order (top → bottom):**

1. Floating gradient orbs (decorative)
2. Hero
3. ScenarioToggle
4. PublishForm grid (candidate | recruiter)
5. FitVerdictPanel + heartbeat note + WorkflowActions
6. CoordinationHub
7. Mutual Diligence Chat section (dual ChatPanel grid)
8. Footer

**State management:**

- `activeScenario`, `fitResult`, share links, seeds, revoke flag
- `recruiterChatRef`, `candidateChatRef` for imperative chat sends
- Auto-applies **Clears** scenario on first mount
- Scenario-specific suggested prompts (`PROMPTS` map)
- `wrapRecruiterPanel` / `wrapCandidatePanel` callbacks
- Analytics refresh interval: 15 seconds

**Suggested prompts per scenario:**

| Scenario | Recruiter panel | Candidate panel |
|----------|-----------------|-----------------|
| clears | MERN stack, comp floor | ₹8L floor, hybrid Thane |
| blocked | Proceed despite comp?, comp floor | ₹8L floor |
| rescued | Thin resume reject?, verified evidence | ATS reject?, verified vs keywords |

---

## 9. Design system (`globals.css` + `layout.tsx`)

**Fonts:** Syne (display), DM Sans (body) via `next/font/google`

**Background:** Multi-layer radial gradients + animated conic mesh + grid overlay

**Component classes:**

| Class | Use |
|-------|-----|
| `.glass-panel` | Frosted card containers |
| `.gradient-text` | Cyan→violet→rose title |
| `.btn-primary` | Gradient CTA |
| `.btn-ghost` | Secondary actions |
| `.btn-danger` | Revoke button |
| `.input-field` | Textareas and chat input |
| `.chat-bubble-user` / `.chat-bubble-agent` | Message styling |
| `.chat-md` | Agent markdown spacing |

**Motion:** Framer Motion on panels, chips, banners, orbs (page-level + component-level)

**Color semantics:**

- Cyan — candidate / recruiter→candidate panel
- Violet — recruiter role / candidate→recruiter panel
- Emerald — CLEARED
- Rose — BLOCKED / revoke / session killed
- Amber — revoked-but-session-alive warning

---

## 10. End-to-end user flows

### Flow A — Scenario demo (primary)

1. Page loads → auto **Clears** via `POST /api/scenario`
2. User clicks **Blocked** / **Rescued** → both sides republished, fit recomputed, chats reset
3. User asks questions in either panel → persona-wrapped guest-v04 stream
4. User clicks narrate buttons → verdict explained in natural language
5. User clicks workflow buttons → email draft / Calendly / Pulse ping
6. User revokes candidate link → next recruiter chat message dies with 404

### Flow B — Manual publish

1. User edits markdown in PublishForm
2. Clicks “Publish to Pulse manually”
3. New share link replaces prior active link for that side
4. Corresponding chat panel activates with new token

### Flow C — Mutual diligence interpretation

- Left panel: recruiter diligence on **candidate’s** verified profile
- Right panel: candidate diligence on **role brief**
- Fit panel: **TalentBridge app** computes cross-context verdict from structured scenario data (not from LLM)

---

## 11. Chat behavior rules (implemented)

| Situation | Expected agent behavior |
|-----------|-------------------------|
| Comp question only | Answer band/fit; no Calendly |
| “Share booking link” + comp aligned | Role agent may share Calendly URL from brief |
| Comp out of band (e.g. ₹19L) | Decline fit; no Calendly offer |
| Recruiter “let’s hire” on BLOCKED | Candidate agent refuses |
| Recruiter “let’s hire” on CLEARED | Candidate agent helps with summary/next steps |
| Recruiter “don’t hire” on CLEARED | Polite acknowledgment; does **not** co-sign rejection |
| Share link revoked | Amber warning → next message → rose session killed |

---

## 12. Environment & configuration

**`.env.local` (required):**

```env
CANDIDATE_PULSE_KEY=aicoo_sk_live_...
RECRUITER_PULSE_KEY=aicoo_sk_live_...
```

Keys are **never** exposed to the browser; all Aicoo calls go through Next.js API routes except guest tokens (share tokens are public by design for guest chat).

---

## 13. Verification & quality

### `npm run verify`

Tests live Aicoo primitives against candidate (+ optional recruiter) keys:

- accumulate path format
- folder list/create
- share/create with `requireSignIn: false`
- guest-v04 POST
- revoke → guest-v04 404
- share/list analytics
- send_message_to_human (with recruiter key)

### `npm run verify:scenarios`

Runs `verifyAllScenarios()` — asserts:

- clears → CLEARED
- blocked → BLOCKED
- rescued → RESCUED

---

## 14. Known limitations (honest scope)

| Area | Current state |
|------|---------------|
| Email | Agent-drafted copy in chat only; no SMTP |
| Calendly | Link embedded in role markdown; no Calendly API booking |
| Fit engine | Rule-based on scenario structs; not parsed live from markdown at runtime |
| Heartbeat | Exposed in UI; often returns 0 actions without Pulse heartbeat policy |
| Direct chat | No single shared thread between recruiter and candidate humans |
| Persona wrapping | Client-side string injection; agent may occasionally drift |
| `PATCH /share` | Implemented in client lib but UI always full republish |

---

## 15. File map

```
talentbridge/
├── IMPLEMENTATION.md          ← this document
├── .env.local.example
├── package.json
├── scripts/
│   ├── verify-primitives.mjs  ← Aicoo API smoke tests
│   └── verify-scenarios.ts    ← Fit engine harness
└── src/
    ├── app/
    │   ├── layout.tsx         ← fonts, metadata, mesh background
    │   ├── globals.css        ← design system
    │   ├── page.tsx           ← main orchestration
    │   └── api/
    │       ├── publish/route.ts
    │       ├── scenario/route.ts
    │       ├── chat/guest/route.ts
    │       ├── message/route.ts
    │       └── heartbeat/run/route.ts
    ├── components/
    │   ├── Hero.tsx
    │   ├── ScenarioToggle.tsx
    │   ├── PublishForm.tsx
    │   ├── FitVerdictPanel.tsx
    │   ├── WorkflowActions.tsx
    │   ├── CoordinationHub.tsx
    │   ├── ChatPanel.tsx
    │   └── AgentMessage.tsx
    └── lib/
        ├── aicoo.ts
        ├── compute-fit.ts
        ├── scenarios.ts
        ├── narration.ts
        ├── chat-persona.ts
        ├── parse-stream.ts
        ├── parse-agent-content.ts
        ├── share-utils.ts
        ├── constants.ts
        └── types.ts
```

---

## 16. Hackathon primitive checklist

| Requirement | Implementation |
|-------------|----------------|
| Two Pulse accounts | Candidate + recruiter keys |
| Share links | `/share/create` with folder scope + loadPolicy |
| Guest chat | guest-v04 NDJSON proxy, not iframe |
| Cross-context coordination | Deterministic fit + dual-panel mutual diligence |
| Revocable access | DELETE share + live 404 demo |
| Human in the loop | send_message_to_human ping |
| Agent narration | Persona + verdict injection |
| Demo scenarios | Clears / Blocked / Rescued one-click apply |

---

*Last updated to reflect the TalentBridge implementation as of the Aicoo Agent-Coordination Hackathon build.*
