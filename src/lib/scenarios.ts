import type {
  CandidatePolicy,
  CandidateSignal,
  RoleBrief,
  Verdict,
} from "./compute-fit";
import { computeFit } from "./compute-fit";

export type ScenarioId = "clears" | "blocked" | "rescued";

export interface SideContext {
  main: string;
  secondary: string;
  policyOrComp: string;
}

export interface DemoScenario {
  id: ScenarioId;
  label: string;
  chip: string;
  description: string;
  candidate: SideContext;
  recruiter: SideContext;
  policy: CandidatePolicy;
  signal: CandidateSignal;
  role: RoleBrief;
  expect: Verdict;
}

const BASE_POLICY: CandidatePolicy = {
  compFloorLpa: 8,
  allowedCities: ["Thane", "Mumbai"],
  noRelocation: true,
  maxOfficeDays: 2,
  noticeDays: 30,
  roleTypePref: ["product", "backend"],
};

const S1_SIGNAL: CandidateSignal = {
  keywordSkills: ["MERN", "Next.js 14", "FastAPI", "AWS"],
  keywordStrength: 0.85,
  verifiedContext: [
    "Built courier aggregator platform MERN Next.js production",
    "3 production deployments shipped solo",
    "FastAPI Python backends in production",
  ],
  contextStrength: 0.85,
};

const S1_ROLE: RoleBrief = {
  compMinLpa: 10,
  compMaxLpa: 14,
  locationCity: "Thane",
  onsite: false,
  inOfficeDays: 2,
  requiredCapabilities: ["build production backend", "ship MERN apps"],
  roleType: ["product", "backend"],
};

export const SCENARIO_CLEARS: DemoScenario = {
  id: "clears",
  label: "Clears fast",
  chip: "Clears",
  description: "Strong resume + strong context — mutual fit in one glance",
  policy: BASE_POLICY,
  signal: S1_SIGNAL,
  role: S1_ROLE,
  expect: "CLEARED",
  candidate: {
    main: `# Shailesh — Work History

## Fascave IT Solutions · Backend Engineer (Jan 2024 – present)
- **Courier aggregator platform** — MERN + Next.js 14 App Router; built seller dashboard, NDR/RTO workflows, weight-discrepancy handling for live logistics clients.
- **3 production deployments** — solo-owned CI/CD (GitHub Actions → AWS ECS), zero-downtime rollouts.
- **FastAPI services** — pricing engine + webhook ingestion; PostgreSQL + Redis; p95 latency under 120ms at peak.

## Earlier · Freelance / internships (2022–2023)
- E-commerce admin panels (React, Node), payment webhook retries, basic AWS Lambda crons.

## Education
B.E. Computer Engineering — Mumbai University (2023)`,
    secondary: `# Verified Skills & Evidence

| Skill | Level | Evidence |
|-------|-------|----------|
| MERN Stack | Production | 3 shipped apps; courier platform in daily use |
| Next.js 14 / TypeScript | Production | App Router, server actions, auth middleware |
| FastAPI / Python | Production | Pricing + webhook services at Fascave |
| PostgreSQL / Redis | Production | Schema design, query tuning, cache invalidation |
| AWS (Lambda, ECS, S3) | Production | Deployed and monitored own services |

**References on file:** Fascave tech lead (verified via Pulse context).`,
    policyOrComp: `# Candidate Policy (verified)

| Constraint | Value |
|------------|-------|
| **Comp floor** | ₹8 LPA base (non-negotiable without ESOP top-up) |
| **Location** | Thane or Mumbai only — **no relocation** |
| **Hybrid** | Max **2 office days/week** (prefer Tue/Wed) |
| **Notice** | 30 days (can discuss buyout for right role) |
| **Role type** | Product engineering, backend, or full-stack — not pure support/QA |

**Open to:** Series A–B startups, fintech/logistics domains matching experience.`,
  },
  recruiter: {
    main: `# Senior Backend Engineer — Role Brief

**Hiring manager:** Priya N. · **Team:** Payments platform · **Stage:** Series A fintech (Thane)

| | |
|---|---|
| **Comp** | ₹10–14 LPA base + ESOP (12-month review) |
| **Location** | Hybrid — Thane office, **2 days/week** (Tue/Wed) |
| **Start** | 4–6 weeks · notice buyout possible |

## What you'll do
- Own backend features on Node.js/TypeScript + PostgreSQL
- Ship MERN/Next.js surfaces with product team
- Debug production auth, webhooks, and deployments independently

## Stack
Node.js, TypeScript, PostgreSQL, Redis, AWS (Lambda, ECS, S3)

## Interview process
1. **30-min intro** — scope, hybrid, comp band → book via Calendly below
2. **60-min technical** — system design + live coding
3. **30-min founder** — offer alignment

## Intro Calendly
**https://calendly.com/talentbridge-demo/senior-backend-intro**

30 minutes with Priya — culture fit, role scope, and whether comp band works for both sides.`,
    secondary: `# Team Context

- 18 engineers, async-first, ship weekly
- You'd partner with 1 PM + 2 frontend engineers
- Recent win: cut payment reconciliation time 40% after backend rewrite`,
    policyOrComp: `# Comp & Benefits

- Base: **₹10–14 LPA** (band depends on interview performance)
- ESOP grant at offer; refresh at 12 months
- Hybrid: 2 days/week Thane (Tue/Wed)
- Health insurance, learning budget ₹50k/year`,
  },
};

export const SCENARIO_BLOCKED: DemoScenario = {
  id: "blocked",
  label: "Blocked early",
  chip: "Blocked",
  description: "Comp below floor — caught before anyone wastes a call",
  policy: BASE_POLICY,
  signal: S1_SIGNAL,
  role: {
    ...S1_ROLE,
    compMinLpa: 6,
    compMaxLpa: 7,
  },
  expect: "BLOCKED",
  candidate: SCENARIO_CLEARS.candidate,
  recruiter: {
    main: `# Junior Backend Engineer — Role Brief

**Team:** Platform squad · **Stage:** Series A fintech (Thane)

| | |
|---|---|
| **Comp** | **₹6–7 LPA** base (fixed band for junior level) |
| **Location** | Hybrid — Thane office, 2 days/week |
| **Stack** | Node.js, PostgreSQL, AWS basics |

## Scope
- Implement API endpoints under senior guidance
- Write tests, fix bugs, learn deployment pipeline
- **Not** a senior/lead track at this comp band

## Note on comp
This opening is budgeted for junior hires. **We cannot flex above ₹7 LPA** for this req — separate senior reqs exist at higher bands.

## Interview process (if aligned on comp)
1. 30-min intro with recruiter
2. Take-home + review call

No Calendly link for this req until comp expectations match the posted band.`,
    secondary: `# Team Context

- Growing team, mentorship-heavy
- Good for early-career engineers within the posted band`,
    policyOrComp: `# Comp (firm)

- Base: **₹6–7 LPA** — no exceptions on this requisition
- ESOP: not included at junior band
- Hybrid: 2 days/week Thane`,
  },
};

export const SCENARIO_RESCUED: DemoScenario = {
  id: "rescued",
  label: "Rescued",
  chip: "Rescued",
  description: "Weak resume keywords, strong verified context — ATS false-negative fixed",
  policy: BASE_POLICY,
  signal: {
    keywordSkills: ["some backend", "a few projects"],
    keywordStrength: 0.3,
    verifiedContext: [
      "Shipped courier aggregator handling real NDR RTO weight-discrepancy at Fascave",
      "Debugged JWT-in-handshake WebSocket auth in production",
      "Solo-built and deployed 5 systems end to end",
    ],
    contextStrength: 0.88,
  },
  role: {
    compMinLpa: 10,
    compMaxLpa: 14,
    locationCity: "Thane",
    onsite: false,
    inOfficeDays: 2,
    requiredCapabilities: [
      "own production backend solo",
      "debug auth in production",
      "ship systems end to end",
    ],
    roleType: ["product", "backend"],
  },
  expect: "RESCUED",
  candidate: {
    main: `# Work History

Some backend work across a few projects. *(Resume keywords intentionally thin — see Verified Context for production evidence.)*

- Helped on API projects
- General web development exposure`,
    secondary: `# Verified Context (Pulse — authoritative)

These items were accumulated and verified in Pulse; they may not appear on the one-page resume:

1. **Courier aggregator at Fascave** — live NDR/RTO flows, weight-discrepancy logic, seller dashboard (MERN + Next.js 14).
2. **JWT-in-handshake WebSocket auth** — debugged and fixed production auth bug affecting real-time tracking.
3. **5 systems solo-built end-to-end** — from schema to AWS deployment; 3 still in production.
4. **FastAPI pricing engine** — webhooks, PostgreSQL, Redis; owned on-call for 6 months.

*An ATS keyword scan may score this profile low; verified context is the source of truth for fit.*`,
    policyOrComp: SCENARIO_CLEARS.candidate.policyOrComp,
  },
  recruiter: {
    main: `# Senior Backend Engineer — Role Brief

**Comp:** ₹10–14 LPA · **Location:** Hybrid Thane, 2 days/week

## Must-have (non-keyword)
- **Own production backend solo** — not just tickets under a lead
- **Debug auth in production** — JWT, sessions, WebSocket edge cases
- **Ship systems end-to-end** — schema → deploy → on-call

We care about verified production evidence over resume keyword density.

## Intro Calendly
**https://calendly.com/talentbridge-demo/senior-backend-intro**`,
    secondary: `# Team Context

Needs someone who can own production backend solo from day 30. Resume screen is intentionally shallow — agent coordination checks verified context.`,
    policyOrComp: `# Comp

₹10–14 LPA + ESOP · hybrid 2 days/week Thane`,
  },
};

export const SCENARIOS: Record<ScenarioId, DemoScenario> = {
  clears: SCENARIO_CLEARS,
  blocked: SCENARIO_BLOCKED,
  rescued: SCENARIO_RESCUED,
};

export function getScenario(id: ScenarioId): DemoScenario {
  return SCENARIOS[id];
}

export function computeScenarioFit(id: ScenarioId) {
  const s = getScenario(id);
  return computeFit(s.policy, s.signal, s.role);
}

/** Harness — all three must match expect */
export function verifyAllScenarios(): { ok: boolean; results: Array<{ id: ScenarioId; pass: boolean; verdict: Verdict }> } {
  const results = (Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
    const s = SCENARIOS[id];
    const r = computeFit(s.policy, s.signal, s.role);
    return { id, pass: r.verdict === s.expect, verdict: r.verdict };
  });
  return { ok: results.every((r) => r.pass), results };
}
