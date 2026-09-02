# Guidelines

## Development Guidelines

- Ensure `pnpm run check` and `pnpm run test` pass before handoff. Together they are the handoff gate.
- Use Biome only for linting and formatting.
- Before making code changes, read `biome.jsonc`, `scripts/dependencies/index.ts`, and `scripts/structure/index.ts`; shape the implementation to satisfy formatting, dependency boundary, and folder structure constraints from the start.
- Do not weaken or bypass checks to make them pass unless explicitly instructed.

### Change Workflow

- For code changes, use a fresh worktree under `~/.worktrees/<repo-name>/<task-name>` from latest `main` on a dedicated `task/<task-name>` branch.
- Keep each task isolated; never share mutable branches across agents.
- Commit completed work on the task branch after required checks pass.
- Before updating `main`, rebase the task branch on latest `main`, resolve conflicts, and rerun checks.
- Update `main` atomically with a serialized fast-forward merge from the checked task branch.
- If no git remote is configured, updating local `main` is sufficient.
- If `main` moves before the update lands, repeat the rebase/check/fast-forward sequence.

### Environments

Jori runs in two environments, `dev` and `prod`. Every resource is named for
the environment that owns it, and every environment-targeting command is
suffixed with it.

- Worktrees never deploy. Concurrent tasks share one development deployment,
  so a push from a worktree silently replaces whatever another task just
  verified. `pnpm check` and `pnpm test` are the gate instead.
- A change that genuinely needs a live backend — a schema migration, an HTTP
  action, webhook ingress — verifies against a Convex preview deployment and a
  Trigger.dev preview branch named after the task branch. Both expire on their
  own; neither touches a shared environment.
- After a task branch lands on `main`, the development deployment picks the
  change up from the `pnpm dev` watcher. `pnpm deploy:dev` is only needed to
  push without that watcher running.
- Production is deployed by a person, never by an agent. Do not run
  `pnpm deploy:prod`, and do not read or write production credentials.

### Code Quality & Architecture

- Prefer simplicity over cleverness. If the same outcome can be achieved with less code, choose the simpler approach.
- Aggressively avoid duplication. Extract reusable code into clear, well-defined functions or modules.
- Prioritize readability above all. The codebase should be easy to scan and understand at a glance.
- Use descriptive, explicit naming. Avoid single-letter variables and unclear abbreviations.
- Improve the code you touch: remove local duplication, clarify names, simplify control flow, and leave nearby structure easier to understand.

### System Design Principles

- Organize by domain and responsibility: colocate related UI, logic, data access, schemas, and tests under the feature or domain they serve.
- Use folder and file structure to communicate intent, ownership, boundaries, and layering.
- Prefer single-word folder and file names. If a name needs multiple words, introduce another folder layer so each level has one clear responsibility.
- Prefer names and nesting that make the system understandable from the filesystem before reading implementation details.

### Change Philosophy

The platform is currently pre-launch, so prioritize clean, complete changes over compatibility with unfinished implementations.

- Treat the system as if it has no legacy constraints.
- Avoid phased migrations, fallbacks, and backward compatibility layers.
- Prefer clean, decisive changes over incremental patching.
- Do not introduce temporary solutions that become permanent bloat.

Complexity compounds quickly. Be deliberate in preventing it.

## Design Guidelines

- Always use shadcn/ui primitives when available.
- Install shadcn/ui components with the official `npx shadcn@latest add` command. Never recreate shadcn/ui components from memory.
- Keep shadcn/ui default styling.
- Keep product design simple and consistent.
- Style elements using Tailwind via `className` only.
- Do not modify `index.css` unless clearly necessary.
- Desktop-optimized, fully responsive and adaptive.
- Never use gradients.

## Convex

This project uses Convex as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first**.  
This file defines the correct usage patterns and overrides any prior assumptions.

## Trigger.dev

This project uses Trigger.dev for long-running agent execution and background task orchestration.

When working on Trigger.dev code, **always read `trigger/ai/guidelines.md` first**.  
This file defines the correct usage patterns and overrides any prior assumptions.
