# Simplification pass notes

Running record of simplification sweeps: what was settled, what is
deliberately parallel, and what was probed and found clean. Start here — do
not re-litigate settled verdicts. Spend the survey where these notes do not
reach.

## Pass 1 — 2026-07-27

Net delta: 28 files, +84 / −126 (−42 lines). Four commits, `pnpm run check`
green by its own exit code at each, 1461 tests passing, `pnpm run deploy`
accepted the schema.

### Landed

- **Run status had seven homes** → `contracts/runtime/runs.ts` owns
  `runStatuses` / `RunStatus` / `isTerminalRunStatus`. Derived sites: the
  Convex validator (`convex/runs/schema.ts`), the inline validator in
  `convex/runtime/agents.ts`, the TS union in `convex/runtime/context/loaders.ts`,
  `contracts/runtime/worker/agents.ts`, and three model-facing JSON schema
  enums. `isTerminalAgentRunStatus` was the same predicate under a second
  name and is gone. Enum members and order are unchanged, so the schema and
  the model-facing JSON are byte-identical.
- **Notion and Linear each shadowed their own API client.** `integrations/
  {notion,linear}/options.ts` held a private `notionJson` / `linearGraphql`
  duplicating the exported one in a sibling file. Option loaders now call the
  sibling. Safe because `integrations/options/load.ts` catches every non-
  `OptionUnavailable` error and replaces it with a generic per-source
  message, so the differing internal error strings never reached a caller.
- **`convex/automations/console.ts` `run`** reopened the automation and
  repeated the access check that `requireAccessibleAutomation` — seventeen
  lines below in the same file — already wraps.
- **Automation field-error copy** was a literal in `editor/save/args.ts` and
  a private table in `editor/errors.ts`; the classifier decides inline
  rendering by string equality, so editing one copy silently broke the inline
  error. Tables exported, producer imports them — already the idiom that file
  used for instruction-marker errors.
- **`ConsoleScrollableGrid` / `ConsoleScrollableList`** carried the same six
  utility classes; extracted to one constant.

### Settled — looked like duplication, is not

- **`convex/reactions/cursor.ts` vs `convex/sessions/cursor.ts`.** Parallel
  shape ("drain pending items from a session cursor"), different guts:
  reactions tie-break on `updatedAt` then `_creationTime`; messages carry a
  `seenLastMessage` flag keyed on `messageId` identity. Unifying needs a
  predicate-and-state jungle to save ~15 lines. Coincidental similarity.
- **`providerPayload` vs `objectProperty`** (agent tool schemas). Identical
  bodies, but the header comment in `responses/common.ts` deliberately
  distinguishes "a provider payload passed through unchanged" from a generic
  open object. Merging loses a documented distinction.
- **The eight integration status queries** (`convex/integrations/status.ts`).
  Each returns a different public shape to the frontend, so merging changes
  API shapes. Also structurally blocked: `scripts/entrypoints.ts` greps each
  registration block for a sanctioned guard name, so hoisting
  `getOrganizationIntegration` into a shared handler would fail that check.
  The user-scoped Google and Microsoft projections are already extracted.
- **`google/credentials.ts` vs `linear/credentials.ts`** are byte-identical
  bar the error string, but they describe two providers' independent
  credential shapes. Merging couples unrelated providers.
- **`github/credentials.ts` hand-rolls `readGitHubTokens`** rather than using
  `requireTokenCredentials`. Load-bearing: GitHub is a GitHub App whose
  credential is `installationId` and whose access token may legitimately be
  absent; `requireTokenCredentials` throws when `tokens` is missing. Not a
  mechanical swap.
- **Hand-rolled date formatting** in `context/organization/profile`,
  `workstreams/activity/series.ts`, `workstreams/detail/grouping.ts`. Four
  genuinely different format shapes, not variants of `shortDate`. Adoption of
  `console/shared/time.ts` is otherwise fine.
- **`convex/shared/integrations.ts`** re-exporting `contracts/integrations`
  is not pass-through indirection — it derives Convex validators from the
  contract lists. This is the codebase's established pattern and the one the
  run-status change followed.

### Open — material divergence, needs a decision

- **`updateOAuthCredentials` exists three times** (`integrations/{google,
  linear,microsoft}/install.ts`) and the three `prepare*IntegrationForRuntime`
  bodies in `integrations/runtime.ts` that call them are near-copies. Not
  mergeable as-is: Linear declares `refreshToken` **required** while Google
  and Microsoft accept it optional with a `requireRefreshToken` fallback, and
  Microsoft additionally persists `tenantId`. Recommended winner: the Google
  shape (optional + fallback) plus a per-provider extra-fields hook, which
  would then unblock collapsing the three runtime refresh bodies too.
  Changing Linear's validator and Microsoft's stored fields is a contract
  decision, so it was left.
- **`handleGoogleOAuthCallback` vs `handleMicrosoftOAuthCallback`**
  (`integrations/{google,microsoft}/http.ts`, ~160 lines each) are the same
  function twice, down to the three try/catch arms. They diverge
  architecturally: Google registers **one** callback route for both Gmail and
  Calendar and resolves the integration from signed state; Microsoft
  registers **two** routes, each asserting its expected integration. A single
  helper taking `expectedIntegration?: T` preserves both exactly — Google
  passes undefined. Worth doing; left because it also wants the
  `updateOAuthCredentials` decision above.
- **`integrations/linear/graphql.ts` vs `broker/tools/linear/client.ts`**
  still both implement "POST GraphQL to Linear". The former uses raw `fetch`
  and a generic result type; the latter uses `fetchJsonObject`. Both throw on
  non-OK (`fetchJson` does too), so they are close to interchangeable —
  recommended winner is the generic `integrations` one. Left because the
  broker call sites depend on the `JsonObject` return.

### Probes run and found clean

- **Dead exports.** Tokenised the whole repo (1623 files incl. generated,
  tests, prompts, JSON) and counted every one of 3037 exported symbols. Only
  three appear once: `joriAgentRun`, `joriSandboxCleanup` (Trigger task ids)
  and `syncGlobalSkills` (invoked by the `skills:sync` package script) — all
  reachable by string. **No dead exports.**
- **Exported-but-file-local** across `src/` and `contracts/`: 9 hits, all
  type exports that are legitimately part of the shared-kernel surface. Not
  worth churn.
- `convex/integrations/options/common.ts` and `connect/{credentials,http,
  install,response,signing}.ts` are well adopted across all six providers —
  no adoption gaps found there.
- Repeated Tailwind strings across `src/`: nothing above 6 occurrences, and
  the top hits are inside single components.
- Schema literal-unions: `contracts/integrations` is the single source for
  provider/integration lists and is properly derived from.

### Not yet swept

- The `signing.ts` `createSigned<Provider>State` / `parseSigned<Provider>State`
  pairs — six near-identical two-function modules (~50 lines). A factory is
  feasible but changes every call site from a free function to a member;
  judged borderline, not attempted.
- Cross-cutting concerns not enumerated this pass: pagination, retry/backoff,
  empty states, loading/skeleton markup, toast copy.
- `src/` UI duplication beyond the layout constant: candidate leads not
  verified this pass include destructive-confirmation dialogs repeated per
  feature, provider-logo components, and list-row overflow menus.
- 25 sites hand-roll `<Loader2 className="size-4 animate-spin" />` instead of
  the shadcn `Spinner` primitive (which is adopted at 26 other sites).
  Mechanical, but it adds `role="status"` / `aria-label="Loading"` to each
  site, so it is a DOM change, not a pure refactor.
