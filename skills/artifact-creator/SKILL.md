---
name: artifact-creator
description: Create or update Milo artifacts from the platform template. Use for building persistent React artifact UIs that run in Milo's iframe sandbox, use the Milo SDK, request narrow tool capabilities, validate locally, and publish through create_artifact or update_artifact.
category: Milo
---

# Artifact Creator

Before planning or building the UI, apply the `frontend-design` skill — let it
decide the outcome, layout, sections, states, and simplest experience. This
skill owns the artifact platform on top of that: the template, SDK, contract,
capabilities, components, and the validate-then-publish flow.

## Mental Model

A Milo artifact is a versioned React + TypeScript mini-app served inside a
sandboxed iframe. Milo owns the shell, SDK, theme, shadcn/ui primitives, build
pipeline, and serving path. The artifact owns only task-specific files under
`src/**`.

Build an artifact when the user needs a persistent interactive surface: a
tracker, review queue, dashboard, workspace, setup flow, calculator, editor,
report, or automation-backed view. Skip it for a one-off answer that works
better as a normal message. If the request implies several unrelated tools,
build a separate artifact for each.

## Plan the Artifact

Beyond the UX that `frontend-design` covers, settle the artifact-specific pieces
before writing code:

- Data model: which state is personal to one user versus shared across the
  organization?
- Brokered tools: which actions call external tools, so the UI needs capability
  grants?
- Producer mode: how does state get written?
  - Interactive-only: the UI writes results from user actions.
  - Automation-backed: an artifact-owned automation writes state; the UI
    subscribes and renders.
  - Hybrid: the UI can refresh on demand while an automation keeps state fresh.

## Platform Contract

Treat the template as immutable infrastructure. It provides:

- `@/milo` for the artifact SDK.
- `@/milo/contract` for contract-only helpers that load during Node-side
  validation.
- `@/components/ui/*` for Milo-owned shadcn/ui primitives.
- `@/milo.css`, `src/main.tsx`, config, theme, and the build pipeline.

You create `src/App.tsx` and `src/contract.ts`, plus optional `src/styles.css`
and relative imports under `src/**`. `src/App.tsx` exports a default or named
`App` component. `src/contract.ts` exports a named `contract` from
`defineArtifactContract`.

Do not publish platform-owned files: package and config files, `index.html`,
`src/main.tsx`, `src/milo.ts`, `src/milo.css`, `src/components/ui/**`,
`src/lib/utils.ts`, `src/vite-env.d.ts`, `node_modules`, or `dist`.

Do not reach for raw platform or network APIs — `fetch`, `XMLHttpRequest`,
`WebSocket`, `localStorage`, `sessionStorage`, Clerk, Convex clients, or
environment variables. Go through the Milo SDK.

Build the UI from the shadcn/ui primitives in `@/components/ui/*` — buttons,
inputs, selects, dialogs, tabs, tables, badges, cards, separators, skeletons,
alerts, menus, tooltips. Style with Tailwind `className` aligned to the template
tokens; leave global CSS alone unless the artifact needs a reusable local
pattern. Add custom visual treatment only when it clarifies hierarchy, state, or
workflow.

## State

The contract is the artifact's durable-state API. Any domain state that must
survive reloads, be shared, or be written by an automation belongs in
contract-backed Milo state. Keep `useState` for ephemeral UI only — selected
row, open dialog, pending form text, loading flags — never for important domain
state.

Runtime code reads through `@/milo`; `src/contract.ts` imports from
`@/milo/contract` so validation can load the contract without browser-only APIs.

Define state once in `src/contract.ts` with strict Zod object schemas:

```ts
import { z } from "zod"
import { defineArtifactContract } from "@/milo/contract"

const triageResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  items: z.array(
    z.strictObject({
      externalItemId: z.string(),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      reason: z.string(),
      suggestedReply: z.string().nullable(),
    })
  ),
})

export const contract = defineArtifactContract({
  version: 1,
  state: {
    reviewQueueLatest: {
      key: "review/queue/latest",
      scope: "shared",
      schema: triageResultSchema,
      schemaName: "ReviewQueue",
      schemaVersion: 1,
    },
  },
})
```

Read and write through contract refs, never raw keys. `useMiloState` mirrors one
contract entry into React and re-renders when it changes:

```ts
import { milo, useMiloState } from "@/milo"
import { contract } from "./contract"

const latest = await milo.state.read(contract.state.reviewQueueLatest)

const unsubscribe = milo.state.subscribe(
  contract.state.reviewQueueLatest,
  (document) => setLatest(document?.value ?? null)
)

const { value, patch, status, error } = useMiloState(
  contract.state.reviewQueueLatest
)
```

Use `patch` for partial updates — the SDK reads the document, merges, validates
against the schema, and writes with version protection — and `replace` to write
a complete document. Set `scope: "personal"` for user-local state and
`scope: "shared"` for automation outputs or team-visible state.

Every artifact needs a contract, even with no durable state:

```ts
import { defineArtifactContract } from "@/milo/contract"

export const contract = defineArtifactContract({ version: 1, state: {} })
```

On first render, subscribe to contract state and show any existing value at
once. If required data is missing or stale, run the primary load automatically
with cached tool calls — do not gate the artifact behind a first "Scan" button.
Reserve explicit refresh controls, and `{ forceRefresh: true }`, for
user-requested freshness.

## Models and Data

Use deterministic sources first. Pull facts, counts, IDs, dates, participants,
links, and statuses from structured tool outputs and existing Milo state. Reach
for `milo.model.prompt` only for semantic work: judgment, classification,
summarization, ranking, extraction from unstructured text, and drafting.

`milo.model.prompt` takes a strict Zod object schema and returns parsed
`output`, not best-effort JSON. Define the schema beside the call:

```ts
import { z } from "zod"
import { milo } from "@/milo"

const triageSchema = z.object({
  priority: z.enum(["low", "normal", "high"]),
  summary: z.string(),
  suggestedReply: z.string().nullable(),
})

const { output } = await milo.model.prompt({
  instruction: "Classify the email for a support operator.",
  input: { subject, body },
  schema: triageSchema,
  schemaName: "email_triage",
})
```

`maxOutputTokens` is optional (default 1000, integer 64-16000). Use the smallest
range that fits the schema: omit it for normal outputs, 64-512 for labels,
scores, and short summaries, 1000-4000 for lists and short drafts, and
4000-16000 only for large reports or many drafted replies. Handle a failed
prompt in UI state; never fall back silently to empty data.

When an integration offers search/list and read/detail tools, retrieve in
stages: discover candidates with cheap search, list, or metadata reads; prompt
only when deterministic filters cannot decide relevance; hydrate full records
only for candidates that need high-trust output or write actions; and ground
consequential output in those full records, not snippets alone.

The SDK and broker cache external reads and `milo.model.prompt` for at least 15
minutes. Pass `{ cacheTtlMs }` for up to 60 minutes on stable reads or expensive
prompts, and `{ forceRefresh: true }` when you need fresh data for the same
arguments. Do not cache `milo.state` yourself; it is Milo-owned and read live.

## Capabilities

Capabilities grant the tools the UI may call at runtime, through `milo.callTool`
or typed integration wrappers. Keep them narrow:

- Grant only tools the UI actually calls, and prefer read tools.
- Grant batch reads over single-record reads called in a loop.
- Put write tools behind clear user-confirmed actions, and prefer
  draft/prepare/preview tools over immediate send/mutate/publish.
- Add `integrationId` to target a specific connected account, and `versionPinned`
  to scope a grant to the published version.

Do not grant platform SDK tools like state or model prompting — those are part
of the platform, not capabilities.

## Build and Publish

1. Apply `frontend-design`.
2. When updating, read the current source with `read_artifact`.
3. Copy the template from `/home/user/.milo/artifacts/template` into a working
   folder under `/home/user/workspace/artifacts/`.
4. Edit only artifact-owned `src/**` files.
5. Run `npm run check` in the artifact folder; fix failures and rerun until
   green.
6. Publish with `create_artifact` (new) or `update_artifact` (existing).

The workspace layout is known — inspect only the artifact folder and its
`src/**` files, never broad directories like `/home/user/workspace`,
`/home/user/.milo`, or `node_modules`.

`npm run check` is the local mirror of publish validation: it formats,
typechecks, validates the contract, runs Biome, and builds. Use it as the single
validation path; publish runs the same checks again before storing source and
assets, so treat publish as the final step, not the iteration loop. Never loosen
schemas, swap in mock data, or delete contract state to get past a failure — fix
the root cause and rerun. If you cannot fix it with the available source, stop
and report the exact validation error.

Publish derives the stored contract from `src/contract.ts`; never hand-write a
contract payload or inline source files. Pass:

- `title`: short artifact title.
- `access`: `personal` unless the user asks for an organization-visible
  artifact.
- `workspacePath`: the artifact folder under `/home/user/workspace/artifacts`.
- `message`: a concise version note when useful.
- `capabilities`: narrow runtime grants, only when needed.

Hand off with the returned `url`, or `urlPath` when there is no `url` — never a
raw artifact ID.

## Automations

An artifact can own automations that produce its contract state in the
background. To add one:

- Publish the artifact with `src/contract.ts`.
- Create the automation with `artifactId` set to the published artifact.
- Have it write outputs with `update_artifact_state` and read prior state with
  `read_artifact_state`, both keyed by `contractName` (for example
  `reviewQueueLatest`).

The automation shares the UI's stored contract, so `artifactId` is inferred and
can be omitted from those calls. Writes must match the contract schema; invalid
writes fail rather than store malformed data.

## Final Check

Before handoff, confirm the judgment calls that `npm run check` cannot:

- The UI follows `frontend-design` and includes only artifact-owned files.
- Important domain state is contract-backed, not stranded in React state.
- Reads and writes go through the SDK and contract refs, never raw keys or
  forbidden APIs.
- Capabilities are minimal and justified.
- Local checks pass before publish.
