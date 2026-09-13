# Jori

Jori is the shared drive an organization's AI works out of. Folders hold
jobs beside the tables, stores, and files they use. A person describes a
job in plain language, says when it runs, and it runs. We are laying the
foundation: primitives a person drives, before Jori starts suggesting jobs
of its own.

## Words

Same word, same meaning, wherever you write:

- **you** means the coding agent reading this and making changes to Jori.
- **the developer**, **the owner**, and **me** mean Albin, who's building
  Jori as Vedin Labs and is talking to you now.
- **we** and **us** mean Albin and you, building Jori together.
- **Jori** means the product, and the agent inside it that users talk to.
  Jori's they, never it.
- **user** means a person using Jori.
- **agent** means Jori's agent, the one the prompts and runs describe. In
  this codebase's tooling it means a coding agent, which may be you.

## How we decide

- The admin work that keeps a business alive is work nobody wants. If a
  user needs an engineer to do it in Jori, the design is wrong.
- Folders are the unit. Jobs, materials, and chats live in the tree, a
  folder is the ceiling on who sees what it holds, and spend rolls up by
  folder. A new primitive joins the tree instead of bringing its own
  sharing or billing.
- Reliable before magical. A primitive a person can drive beats an
  automation that guesses, until the primitives are boring.

## Workflow

- `pnpm task <name>` starts a branch and worktree, one per task or agent.
  Work and commit there.
- `pnpm test <paths>` runs the tests for what you changed. It never waits
  for a gate and gets two workers, so keep the paths narrow.
  `pnpm check:fix` formats and regenerates compiled content.
- `pnpm land <name>` rebases on `main`, runs the gate, and fast-forwards.
  Gates run one at a time, so start it in the background and let it
  finish. Run `task` and `land` from the primary checkout, everything else
  in the worktree.
- `pnpm dev:up` serves `main` and keeps it current; `pnpm dev:check` says
  where. Landed work shows up there on its own, so preview a worktree only
  for what has not landed.
- Land only pure documentation with `--no-verify`. Anything the build
  reads, including prompts, skills, and legal pages, is not documentation.

## Code

The goal is a codebase a newcomer can skim and guess right: folders by
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

- Ask before loosening a check or deleting a test to get past a failure.
- Dev is yours to deploy, seed, and truncate. Ship production, run functions
  against it, or change its data only when asked.
- Never read `.env.prod-*.local` or print a deployment's environment. The
  tooling loads what it needs.
- Keep EU and US data apart. When a provider cannot deliver per region, state
  the limitation instead of widening geography or permissions.
- Ask before changing legal pages.
- Prefer no documentation. When a page would clearly earn its place, ask
  before adding it.

## Guides

Before work of a kind listed below, read its guide. When your change makes
a guide out of date, fix the guide in the same change.

| Work | Guide |
| --- | --- |
| Console or landing UI | `guides/ui.md` |
| Convex functions, schema, or workflows | `convex/_generated/ai/guidelines.md` |
| Deploying, seeding, or building sandbox images | `guides/deployment.md` |
| Integrations: registrations, permissions, regional delivery | `guides/integrations.md` |

For work that wants domain expertise instead, such as copy, marketing,
product, or design, `npx skills find <topic>` searches skills.sh. Install
a skill globally, and only when its audits there are clean.
