# Guidelines

## Workflow

- Start work with `pnpm task <name>`: a `task/<name>` branch in
  `~/.worktrees/jori/<name>` from local `main`, dependencies installed. One
  task per worktree; never share a branch between agents.
- The gate is `pnpm check` and `pnpm test`. Do not weaken or bypass a check
  unless told to. `pnpm check:fix` formats and regenerates content.
- Commit on the task branch, then land with `pnpm land <name>` from the
  primary checkout. It rebases on `main`, runs the gate in the worktree, and
  fast-forwards `main`. If it says `main` moved, run it again.
- Before changing code, read `biome.jsonc`, `scripts/dependencies/index.ts`
  and `scripts/structure/index.ts`. They define formatting, dependency
  boundaries and folder structure; shape the change to pass them from the
  start.

## Targets

Every environment-bound command takes one target: `dev`, `prod-us` or
`prod-eu`. The target names its env file (`.env.local` for dev,
`.env.<target>.local` for production) and is the word a production ship asks
you to type.

| Command | Does |
| --- | --- |
| `pnpm ship <target> [--yes]` | Deploys. Dev pushes Convex and skills with no gate, since the `pnpm dev` watcher already pushes there. Production requires the primary checkout, a clean `main` equal to `origin/main`, the gate (skipped when this tree already passed it), and a confirmation. |
| `pnpm skills <target>` | Syncs the skill catalog. |
| `pnpm sandbox <target>` | Builds the E2B template. |
| `pnpm db:seed dev`, `pnpm db:truncate dev` | Development data only. |

- Worktrees never deploy: a push from one replaces what another task just
  verified. A change that needs a live backend (a schema migration, an HTTP
  action, webhook ingress) verifies against a Convex preview deployment
  named after the task branch.
- Ship production only when the user asks. Never read or print production
  credentials.

## Code

- Simplicity over cleverness, readability over everything: less code,
  descriptive names, no duplication, no unclear abbreviations.
- Organize by domain: colocate UI, logic, data access, schemas and tests
  under the feature they serve, so the filesystem explains the system.
  Single-word folder and file names; a name that needs two words needs
  another folder.
- Improve what you touch: remove local duplication, clarify names, simplify
  control flow.
- Pre-launch means no legacy: no phased migrations, fallbacks, compatibility
  layers or temporary solutions. Make the clean, complete change.

## UI

- shadcn/ui primitives, installed with `npx shadcn@latest add`, default
  styling kept. Tailwind via `className` only. Leave `index.css` alone unless
  clearly necessary.
- Simple and consistent, desktop-optimized, fully responsive. No gradients.
- Landing visuals are console views from `src/shared/console` rendered over
  `src/landing/demo` fixtures. The kit takes props and emits callbacks (the
  dependency check enforces it); `src/console` binds it to Convex and
  `src/landing/demo` to the in-memory workspace. Never hand-draw a console
  lookalike in `src/landing`, and never import `src/console` from it.

## Convex

Read `convex/_generated/ai/guidelines.md` before touching Convex code. It
overrides prior assumptions.
