# Guidelines

## Architecture

Start with [the docs index](docs/index.md) before changing integrations, provider
selection, identity, data flows, or residency claims. Read the relevant guide for
the agreed priorities, regional boundary and integration decision tree.

## Workflow

- For repository changes, run `pnpm task <name>` from the primary checkout.
  Use a separate worktree and branch for each task or agent.
- Run focused tests for behavior changes with `pnpm test <paths>`.
  Commit on the task branch, then run `pnpm land <name>` from the primary
  checkout. Landing runs or reuses `pnpm check` and `pnpm test`.
- For documentation-only changes that cannot affect runtime behavior, review
  the diff and land with `--no-verify`; no builds or tests are needed.
  Prompts and skills are runtime inputs, not documentation.
- Otherwise, do not weaken or bypass checks unless asked.
  `pnpm check:fix` formats code and regenerates compiled content.

## Targets

Deployment and environment commands take `dev`, `prod-us`, or `prod-eu`.
They load `.env.local` for dev and `.env.<target>.local` for production.

| Command | Purpose |
| --- | --- |
| `pnpm ship <target> [--yes]` | Dev: deploy Convex and skills. Production: deploy Convex, frontend, and skills. |
| `pnpm skills <target>` | Sync the skill catalog. |
| `pnpm sandbox <target>` | Build the Blaxel sandbox image. |
| `pnpm db:seed dev`, `pnpm db:truncate dev` | Manage development data only. |

- Deploy shared dev and production only from the primary checkout.
  Use a task-specific Convex preview when worktree changes need live
  backend verification.
- Ship production only when the user asks. Do not inspect or expose
  production secrets; let deployment tooling load them.

## Code

- Prefer readable code, descriptive names, and simple control flow.
  Keep cleanup local to the change.
- Colocate UI, logic, data access, schemas, and tests by domain.
  Use single-word source names, respecting framework conventions.
- Formatting, dependency boundaries, and structure are defined in
  `biome.jsonc`, `scripts/dependencies/rules.ts`, and `scripts/structure/`.
  Consult them when relevant.
- Before adding a test, identify the behavior or failure mode it protects
  and check whether existing tests already protect it. Prefer extending an
  existing test when clear. Avoid tests that merely mirror the implementation.
- Pre-launch: replace obsolete behavior directly, without compatibility
  layers or staged migrations.

## UI

- Use shadcn/ui primitives, installed with `npx shadcn@latest add`, and
  preserve their default styling.
- Use Tailwind classes for static styling and inline styles for runtime
  values. Reserve `src/styles.css` for shared theme tokens and global rules.
- Desktop-first, responsive, no gradients.
- Console views in `src/shared/console` take props and emit callbacks.
  `src/console` binds them to Convex; `src/landing/demo` binds them to
  fixtures. Landing demos reuse these views. Do not build console
  lookalikes or import `src/console` into `src/landing`.

## Convex

Read `convex/_generated/ai/guidelines.md` before changing Convex code.
