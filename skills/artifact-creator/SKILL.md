---
name: artifact-creator
description: Create or update Milo artifacts from the platform template. Use for building persistent React artifact UIs that run in Milo's iframe sandbox, use the Milo SDK, request narrow tool capabilities, validate locally, and publish through create_artifact or update_artifact.
category: Milo
---

# Artifact Creator

Use this skill when creating or updating a Milo artifact.

Before planning or building the UI, apply the `frontend-design` skill. Let it
decide the outcome, layout, sections, states, and simplest Milo-native
experience.

## Mental Model

A Milo artifact is a versioned React + TypeScript mini-app served inside a
sandboxed iframe.

Milo owns the shell, SDK, theme, shadcn/ui primitives, build pipeline, and
serving path. The artifact owns only task-specific source files under `src/**`.

Build an artifact when the user needs a persistent interactive surface: a
tracker, review queue, dashboard, workspace, setup flow, calculator, editor,
report, or automation-backed view. Do not create an artifact for a one-off
answer that is better as a normal message.

## Interpret the Request

Before writing code, identify:

- The user outcome: what should the artifact help them understand, decide, or
  do?
- The primary artifact surface: list, table, form, timeline, split view, editor,
  dashboard, or focused tool.
- The data model: what state is local to the user, shared across users, or
  produced by automation?
- The actions: what can happen inside the artifact, and which actions need
  brokered tools?
- The lifecycle states: loading, empty, populated, error, partial data, long
  content, and success.

Keep the artifact focused. If the request implies multiple unrelated tools,
build separate artifacts.

## Platform Contract

Use the platform template as immutable infrastructure.

The template provides:

- `@/milo` for artifact SDK access.
- `@/milo/contract` for contract-only helpers that must run during Node-side
  validation.
- `@/components/ui/*` for Milo-owned shadcn/ui primitives.
- `@/milo.css`, `src/main.tsx`, config files, theme, and build pipeline.

Create `src/App.tsx` and `src/contract.ts`. `src/App.tsx` exports a default
React component or named `App` component. `src/contract.ts` exports a named
`contract` constant created with `defineArtifactContract`. Add optional
`src/styles.css` and optional relative imports under `src/**`.

Do not publish platform-owned files: package/config files, `index.html`,
`src/main.tsx`, `src/milo.ts`, `src/milo.css`, `src/components/ui/**`,
`src/lib/utils.ts`, `src/vite-env.d.ts`, `node_modules`, or `dist`.

Do not use direct platform or network APIs: `fetch`, `XMLHttpRequest`,
`WebSocket`, `localStorage`, `sessionStorage`, Clerk, Convex clients, or
environment variables. Use the Milo SDK.

## SDK Use

Artifact runtime code should use `@/milo` for platform access. Contract files
should use `@/milo/contract` so local and publish validation can load contracts
without initializing browser-only runtime APIs.

Use:

- `defineArtifactContract` from `@/milo/contract` in `src/contract.ts` for the
  artifact's durable state contract. This file is required even when the
  artifact has no durable state.
- `milo.state.read/replace/patch/subscribe` with contract refs, never raw keys.
- `useMiloState(contract.state.someEntry)` for React state that mirrors one
  contract entry and should update when Milo state changes.
- `milo.model.prompt` for bounded semantic model help. This requires a strict
  Zod object schema and returns parsed `output`, not best-effort JSON.
  `maxOutputTokens` is optional, output-only, defaults to 1000, and must be an
  integer from 64 to 16000. Omit it unless the response schema clearly needs a
  smaller or larger output budget.
- Typed wrappers for granted integration tools when available. Prefer batch read
  wrappers after searches.
- `milo.callTool(tool, args, options?)` only for approved brokered tools listed
  in the artifact's capabilities.

Think of the artifact contract as the product API for the artifact. All durable
domain state that must survive reloads, be shared, or be written by automations
belongs in contract-backed Milo state. React `useState` is fine for ephemeral UI
state such as selected row, open dialog, pending form text, and transient loading
flags. Do not keep important domain state only in local component state.

State is contract-bound. Define it once in `src/contract.ts` with strict Zod
object schemas:

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

Use that same contract in UI code:

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

For partial updates, use `milo.state.patch`. The SDK reads the current document,
merges the patch, validates the full result with the Zod schema, and then writes
it with version protection. Use `replace` when writing a complete document.

For user-local state, use `scope: "personal"` in the contract entry. For
automation outputs or team-visible state, use `scope: "shared"`.

The publish tools derive the stored artifact contract from `src/contract.ts`.
Never provide a manual contract payload. Never delete `src/contract.ts`, loosen
schemas, replace live data with mock data, or remove state to bypass local
check or publish failures. Fix the root cause and rerun the local check. If the
root cause cannot be fixed with the available source, stop and report the exact
validation error.

If no durable state is needed, still create the required contract:

```ts
import { defineArtifactContract } from "@/milo/contract"

export const contract = defineArtifactContract({ version: 1, state: {} })
```

Choose a producer mode before building:

- Interactive-only: the UI reads external tools, prompts models when needed, and
  writes durable results to `milo.state` from user actions.
- Automation-backed: an artifact-owned automation writes contract state in the
  background, and the UI mostly subscribes and renders.
- Hybrid: the UI can run an immediate refresh while an automation keeps the same
  contract state fresh later.

Default to seamless loading. On first render, subscribe to contract state and
show any existing value immediately. If required data is missing or stale, run
the primary load automatically with cached tool calls; do not require the user
to click a first "Scan" button. Keep explicit refresh controls for user-requested
freshness and pass `{ forceRefresh: true }` only from those explicit refreshes.

Prompt model calls must define the expected result beside the call:

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

For prompt output budgets, use the smallest range that fits the schema:

- Omit `maxOutputTokens` for normal structured outputs.
- Use 64-512 for labels, scores, IDs, and short summaries.
- Use 1000-4000 for lists, grouped summaries, and short drafted text.
- Use 4000-16000 only for intentionally large reports, many items, or multiple
  drafted replies.

Handle prompt errors explicitly in UI state. A failed prompt means the schema,
model, or request failed validation; do not silently fall back to empty data.

Use deterministic data before prompting. Prefer structured tool outputs and
existing Milo state for facts, counts, IDs, dates, participants, links, and
statuses. Use `milo.model.prompt` for semantic judgment, classification,
summarization, ranking, extraction from unstructured text, and drafting. When
producing high-trust output, first discover candidate records with deterministic
tools, then send only the relevant fields to the model with a strict output
schema.

For integrations with search/list and read/detail tools, use a staged retrieval
pipeline:

- Use cheap search, list, or metadata reads for candidate discovery.
- Prompt only when deterministic filters cannot decide relevance or priority.
- Hydrate full records only for candidates that need high-trust output,
  user-visible conclusions, or write actions.
- Ground drafting, recommendations, approvals, updates, and other consequential
  output in the full relevant record context, not snippets or summaries alone.

Caching is handled by the Milo SDK and broker. External read tools and
`milo.model.prompt` are cached automatically for at least 15 minutes. You may
pass `{ cacheTtlMs }` to request up to 60 minutes for stable external reads or
expensive prompts, and `{ forceRefresh: true }` when the UI needs fresh external
data for the same exact arguments. Do not build custom caches around
`milo.state`; artifact state is Milo-owned and should be read live.

## Capabilities

Capabilities are grants for tools the artifact UI may call at runtime.

Keep grants narrow:

- Grant only tools the UI actually calls.
- Prefer read tools.
- For search-and-review flows, grant batch reads when available instead of
  calling single-record read tools in a loop.
- Use write tools only behind clear user-confirmed actions.
- Prefer draft, prepare, or preview tools over immediate send, mutate, or
  publish tools when the user should review the output first.
- Include `integrationId` when the grant must target a specific connected
  account.
- Use `versionPinned` when a grant should apply only to the published version.

Do not add capabilities for platform SDK tools such as state or model
prompting. Those are part of the artifact platform.

## Workflow

1. Apply `frontend-design`.
2. Inspect existing artifact source with `read_artifact` when updating.
3. Copy the template into a working folder under
   `/home/user/milo-workspace/artifacts/`.
4. Edit only artifact-owned `src/**` files.
5. Run `npm run check` inside the artifact folder.
6. Fix validation failures and rerun the check.
7. Publish only after checks pass with `create_artifact` or `update_artifact`
   using the artifact folder as `workspacePath`.

The workspace layout is known. Do not run broad directory discovery across
`/home/user/milo-workspace`, `node_modules`, `.milo`, or platform-owned files.
When you need file context, inspect only the artifact folder and the
artifact-owned `src/**` files.

`npm run check` is the local equivalent of publish validation: it formats,
typechecks, validates the contract, runs Biome, and builds. Use it as the
single validation path. Do not run separate formatting or broad lint commands
unless a specific check error requires focused debugging.

The publish tool repeats the same validation, then stores the artifact source
and assets. Treat publish as the final step, not the iteration loop.

## Publishing

Use `create_artifact` for new artifacts and `update_artifact` for existing
ones.

Provide:

- `title`: short artifact title.
- `access`: `personal` unless the user asks for an organization-visible
  artifact.
- `workspacePath`: artifact workspace directory under
  `/home/user/milo-workspace`.
- `message`: concise version note when useful.
- `capabilities`: narrow runtime tool grants, only when needed.

Do not inline source files in the publish call. Milo validates, formats, builds,
derives the contract from `src/contract.ts`, and stores source from
`workspacePath`.

After a successful publish, use the returned `url` when present, otherwise use
the returned `urlPath`, in the user-facing handoff. Do not hand off only raw
artifact IDs.

## Automations

Artifact automations are owned by the artifact. They are producers for artifact
contract state entries.

If the artifact needs background work:

- Publish the artifact with `src/contract.ts`.
- Create an automation with `artifactId` set to the published artifact ID.
- Instruct the automation to write outputs with `update_artifact_state` using
  `contractName`, for example `reviewQueueLatest`.
- Instruct the automation to read prior state with `read_artifact_state` using
  the same `contractName`.

Automations use the same stored artifact contract as the UI. When an
artifact-owned automation calls artifact state tools, `artifactId` can be
omitted because Milo infers it from the run. The automation must write values
that match the stored contract schema; invalid writes fail instead of silently
storing stale or malformed data.

## Final Check

Before handoff, verify:

- The UI follows `frontend-design`.
- The source includes only artifact-owned files.
- The artifact uses Milo SDK instead of forbidden APIs.
- Capabilities are minimal and justified.
- `src/contract.ts` exists and exports `contract`.
- State reads/writes use contract refs or contract names, not raw keys.
- Important domain state is contract-backed, not only local React state.
- Loading, empty, error, and success states exist.
- Local artifact checks pass before publish.
