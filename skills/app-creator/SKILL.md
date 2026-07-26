---
name: app-creator
description: Create or update Jori apps from the platform template. Use for building persistent React app UIs that run in Jori's iframe sandbox, use the Jori SDK, request narrow tool capabilities, validate locally, and publish through create_app or update_app.
category: creation
---

# App Creator

Before planning or building the UI, apply the `frontend-design` skill — let it
decide the outcome, layout, sections, states, and simplest experience. This
skill owns the app platform on top of that: the template, SDK, contract,
capabilities, components, and the validate-then-publish flow.

## Mental Model

A Jori app is a versioned React + TypeScript mini-app served inside a
sandboxed iframe. Jori owns the shell, SDK, theme, shadcn/ui primitives, build
pipeline, and serving path. The app owns only task-specific files under
`src/**`.

Build an app when the user needs a persistent interactive surface: a
tracker, review queue, dashboard, workspace, setup flow, calculator, editor,
report, or automation-backed view. Skip it for a one-off answer that works
better as a normal message. If the request implies several unrelated tools,
build a separate app for each.

## Plan the App

Beyond the UX that `frontend-design` covers, settle the app-specific pieces
before writing code:

- Data model: which state is personal to one user versus shared across the
  organization?
- Brokered tools: which actions call external tools, so the UI needs capability
  grants?
- Producer mode: how does state get written?
  - Interactive-only: the UI writes results from user actions.
  - Automation-backed: an app-owned automation writes state; the UI
    subscribes and renders.
  - Hybrid: the UI can refresh on demand while an automation keeps state fresh.

## Platform Contract

Treat the template as immutable infrastructure. It provides:

- `@/jori` for the app SDK.
- `@/jori/contract` for contract-only helpers that load during Node-side
  validation.
- `@/components/ui/*` for Jori-owned shadcn/ui primitives.
- `@/jori.css`, `src/main.tsx`, config, theme, and the build pipeline.

You create `src/App.tsx` and `src/contract.ts`, plus optional `src/styles.css`
and relative imports under `src/**`. `src/App.tsx` exports a default or named
`App` component. `src/contract.ts` exports a named `contract` from
`defineAppContract`.

Do not publish platform-owned files: package and config files, `index.html`,
`src/main.tsx`, `src/jori.ts`, `src/jori.css`, `src/components/ui/**`,
`src/lib/utils.ts`, `src/vite-env.d.ts`, `node_modules`, or `dist`.

Do not reach for raw platform or network APIs — `fetch`, `XMLHttpRequest`,
`WebSocket`, `localStorage`, `sessionStorage`, Better Auth, Convex clients, or
environment variables. Go through the Jori SDK.

Build the UI from the shadcn/ui primitives in `@/components/ui/*` — buttons,
inputs, selects, dialogs, tabs, tables, badges, cards, separators, skeletons,
alerts, menus, tooltips. Style with Tailwind `className` aligned to the template
tokens; leave global CSS alone unless the app needs a reusable local
pattern. Add custom visual treatment only when it clarifies hierarchy, state, or
workflow.

## State

The contract is the app's durable-state API. Any domain state that must
survive reloads, be shared, or be written by an automation belongs in
contract-backed Jori state. Keep `useState` for ephemeral UI only — selected
row, open dialog, pending form text, loading flags — never for important domain
state.

Runtime code reads through `@/jori`; `src/contract.ts` imports from
`@/jori/contract` so validation can load the contract without browser-only APIs.

Define state once in `src/contract.ts` with strict Zod object schemas:

```ts
import { z } from "zod"
import { defineAppContract } from "@/jori/contract"

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

export const contract = defineAppContract({
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

Read and write through contract refs, never raw keys. `useJoriState` mirrors one
contract entry into React and re-renders when it changes:

```ts
import { jori, useJoriState } from "@/jori"
import { contract } from "./contract"

const latest = await jori.state.read(contract.state.reviewQueueLatest)

const unsubscribe = jori.state.subscribe(
  contract.state.reviewQueueLatest,
  (document) => setLatest(document?.value ?? null)
)

const { value, patch, status, error } = useJoriState(
  contract.state.reviewQueueLatest
)
```

Use `patch` for partial updates — the SDK reads the document, merges, validates
against the schema, and writes with version protection — and `replace` to write
a complete document. Set `scope: "personal"` for user-local state and
`scope: "shared"` for automation outputs or team-visible state.

Every app needs a contract, even with no durable state:

```ts
import { defineAppContract } from "@/jori/contract"

export const contract = defineAppContract({ version: 1, state: {} })
```

On first render, subscribe to contract state and show any existing value at
once. If required data is missing or stale, run the primary load automatically
with cached tool calls — do not gate the app behind a first "Scan" button.
Reserve explicit refresh controls, and `{ forceRefresh: true }`, for
user-requested freshness.

## Models and Data

Use deterministic sources first. Pull facts, counts, IDs, dates, participants,
links, and statuses from structured tool outputs and existing Jori state. Reach
for `jori.model.prompt` only for semantic work: judgment, classification,
summarization, ranking, extraction from unstructured text, and drafting.

`jori.model.prompt` takes a strict Zod object schema and returns parsed
`output`, not best-effort JSON. Define the schema beside the call:

```ts
import { z } from "zod"
import { jori } from "@/jori"

const triageSchema = z.object({
  priority: z.enum(["low", "normal", "high"]),
  summary: z.string(),
  suggestedReply: z.string().nullable(),
})

const { output } = await jori.model.prompt({
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

The SDK and broker cache external reads and `jori.model.prompt` for at least 15
minutes. Pass `{ cacheTtlMs }` for up to 60 minutes on stable reads or expensive
prompts, and `{ forceRefresh: true }` when you need fresh data for the same
arguments. Do not cache `jori.state` yourself; it is Jori-owned and read live.

## Capabilities

Capabilities grant the tools the UI may call at runtime, through `jori.callTool`
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
2. When updating, read the current source with `read_app`.
3. Copy the template from `/home/user/.jori/apps/template` into a working
   folder under `/home/user/workspace/apps/`.
4. Edit only app-owned `src/**` files.
5. Run `npm run check` in the app folder; fix failures and rerun until
   green.
6. Publish with `create_app` (new) or `update_app` (existing).

The workspace layout is known — inspect only the app folder and its
`src/**` files, never broad directories like `/home/user/workspace`,
`/home/user/.jori`, or `node_modules`.

`npm run check` is the local mirror of publish validation: it formats,
typechecks, validates the contract, runs Biome, and builds. Use it as the single
validation path; publish runs the same checks again before storing source and
assets, so treat publish as the final step, not the iteration loop. Never loosen
schemas, swap in mock data, or delete contract state to get past a failure — fix
the root cause and rerun. If you cannot fix it with the available source, stop
and report the exact validation error.

Publish derives the stored contract from `src/contract.ts`; never hand-write a
contract payload or inline source files. Pass:

- `title`: short app title.
- `access`: `personal` unless the user asks for an organization-visible
  app.
- `workspacePath`: the app folder under `/home/user/workspace/apps`.
- `message`: a concise version note when useful.
- `capabilities`: narrow runtime grants, only when needed.

Hand off with the returned `url`, or `urlPath` when there is no `url` — never a
raw app ID.

## Automations

An app can own automations that produce its contract state in the
background. To add one:

- Publish the app with `src/contract.ts`.
- Create the automation with `appId` set to the published app.
- Have it write outputs with `update_app_state` and read prior state with
  `read_app_state`, both keyed by `contractName` (for example
  `reviewQueueLatest`).

The automation shares the UI's stored contract, so `appId` is inferred and
can be omitted from those calls. Writes must match the contract schema; invalid
writes fail rather than store malformed data.

## Final Check

Before handoff, confirm the judgment calls that `npm run check` cannot:

- The UI follows `frontend-design` and includes only app-owned files.
- Important domain state is contract-backed, not stranded in React state.
- Reads and writes go through the SDK and contract refs, never raw keys or
  forbidden APIs.
- Capabilities are minimal and justified.
- Local checks pass before publish.
