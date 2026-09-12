# Jori

Jori is the shared drive an organization's AI works out of. Folders hold
tables, stores, files, and jobs; sharing and spend attach to the folder tree.
The console and the Slack app are the surfaces, Convex is the backend, and
runs execute in regional sandboxes so EU and US data stay apart.

## Workflow

- `pnpm task <name>` starts a branch and worktree, one per task or agent.
  Work and commit there.
- `pnpm test <paths>` runs the tests for what you changed.
  `pnpm check:fix` formats and regenerates compiled content.
- `pnpm land <name>` rebases on `main` and runs the full gate, unless the
  tree already passed it. Run `task` and `land` from the primary checkout,
  everything else in the worktree.
- Only pure documentation lands with `--no-verify`. Anything the build reads,
  including prompts, skills, and legal pages, is not documentation.

## Code

The goal is a codebase a developer can skim and guess right: folders by
domain and responsibility, one purpose each, none overlapping, and one word
per concept everywhere. A synonym is a rename, not a choice.

- Keep the core simple and the edges busy. Primitives do one thing. Adapters
  and integrations absorb provider variety and normalize it into internal
  shapes. Core code never imports an edge.
- Look for an existing component before writing one. Extract a shared one
  the moment a second use appears.
- Colocate UI, logic, data access, schemas, and tests by domain. Names are
  single words except where a framework decides; nest when one word is not
  enough. A file that outgrows itself becomes a folder with `index.ts` and
  focused siblings, not `thing_helpers.ts`.
- Keep cleanup local to the change.
- Formatting, dependency direction, and folder limits are enforced by
  `biome.jsonc`, `scripts/dependencies/rules.ts`, and `scripts/structure/`.
- Before adding a test, name the behavior or failure it protects and check
  whether an existing test already does; extend that one when clear. Avoid
  tests that mirror the implementation.
- Pre-launch: replace obsolete behavior outright, with no compatibility
  layers or staged migrations.

## Boundaries

- Skipping the gate is for pure documentation only. Ask before loosening a
  check or deleting a test to get past a failure.
- Dev is yours to deploy, seed, and truncate. Ship production, run functions
  against it, or change its data only when asked.
- Never read `.env.prod-*.local` or print a deployment's environment. The
  tooling loads what it needs.
- Keep EU and US data apart. When a provider cannot deliver per region, state
  the limitation instead of widening geography or permissions.
- Ask before changing legal pages.

## Guides

Read the matching guide first, and update it in the same change when your
work makes it wrong.

| Work | Guide |
| --- | --- |
| Console or landing UI | `guides/ui.md` |
| Convex functions, schema, or workflows | `convex/_generated/ai/guidelines.md` |
| Deploying, seeding, or sandbox images | `guides/deployment.md` |
| Integrations: registrations, permissions, regional delivery | `guides/integrations.md` |
