# TalentBridge

**Mutual first-pass hiring diligence** powered by the [Aicoo](https://www.aicoo.io) coordination layer.

Two Pulse accounts publish verified context, share permissioned links, run a **deterministic fit check**, and let agents **narrate** the result — before anyone wastes a call on comp mismatch or an ATS false negative.

<p align="center">
  <img src="./public/talentbridge_logo.svg" alt="TalentBridge" width="480" />
</p>

## Problem

- Recruiters and candidates burn time on calls that fail on **comp**, **location**, or **hybrid** constraints.
- ATS keyword screens **reject strong builders** whose real work lives in verified Pulse context, not resume bullets.

## Solution

TalentBridge coordinates **cross-boundary diligence**:

| Side | Pulse account | Publishes |
|------|---------------|-----------|
| Candidate | Account A | Work history, verified skills, policy (comp floor, location) |
| Recruiter | Account B | Role brief, comp band, interview process |

Each party chats with the **other side's agent** via scoped guest share links — not a single shared inbox.

## Demo scenarios

One click re-publishes both workspaces, recomputes fit, and **resets both chats**.

| Scenario | Verdict | What it shows |
|----------|---------|---------------|
| **Clears** | CLEARED | Strong resume + context, aligned ₹10–14L band |
| **Blocked** | BLOCKED | ₹6–7L role vs ₹8L candidate floor — caught early |
| **Rescued** | RESCUED | Thin resume keywords, strong verified production context |

## Features

- **Deterministic fit engine** — comp, location, notice, stack (agents narrate; they don't decide)
- **Streaming guest-v04 chat** — NDJSON proxy, markdown + suggestion chips
- **Human-like agent personas** — no robotic "based on the notes" replies
- **Workflow actions** — approval/rejection email drafts, Calendly on request, Pulse ping
- **Live revoke demo** — `DELETE /share/{id}` → guest session 404 on next message
- **Coordination hub** — share URLs, analytics, revoke control

## Quick start

```bash
git clone git@github-main:HawaleShailesh004/talentbridge.git
cd talentbridge
cp .env.local.example .env.local
```

Add your keys from [aicoo.io/settings/api-keys](https://www.aicoo.io/settings/api-keys):

```env
CANDIDATE_PULSE_KEY=aicoo_sk_live_...
RECRUITER_PULSE_KEY=aicoo_sk_live_...
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm run verify           # Aicoo API primitives (live keys required)
npm run verify:scenarios # Deterministic fit engine (offline, all 3 scenarios)
```

## Stack

- **Frontend:** Next.js 14 · TypeScript · Tailwind CSS · Framer Motion
- **Aicoo primitives:** `/init` · `/accumulate` · `/share/create` · guest-v04 · messaging · revoke · heartbeat

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Main UI
│   └── api/
│       ├── publish/          # Publish + revoke + list shares
│       ├── scenario/         # Demo scenario apply
│       ├── chat/guest/       # guest-v04 stream proxy
│       ├── message/          # send_message_to_human
│       └── heartbeat/run/
├── components/               # Chat, verdict panel, hub, workflow
└── lib/
    ├── aicoo.ts              # Aicoo client
    ├── compute-fit.ts        # Verdict engine
    ├── scenarios.ts          # Clears / Blocked / Rescued seeds
    └── chat-persona.ts       # Agent tone + intent hints
```

## Documentation

Full architecture, API routes, and UI reference: **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**

## Hackathon

Built for the **Aicoo Agent-Coordination Hackathon** — coordination layer, not another ATS.

## License

MIT
