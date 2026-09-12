# Deployment

[AGENTS.md](../AGENTS.md)

Targets: `dev`, `prod-us`, `prod-eu`. Dev reads `.env.local`, production
`.env.<target>.local`.

| Command | Purpose |
| --- | --- |
| `pnpm ship <target> [--yes]` | Dev: Convex and skills. Production: Convex, frontend, and skills. |
| `pnpm skills <target>` | Sync the skill catalog. |
| `pnpm sandbox <target>` | Build the Blaxel sandbox image. |
| `pnpm db:seed dev`, `pnpm db:truncate dev` | Seed or empty development data. |

- `pnpm dev` already pushes Convex to the dev deployment; a worktree that
  needs a live backend uses a task-specific Convex preview.
- Production ships from pushed `main`, reusing the gate pass landing
  recorded; `--yes` replaces the typed confirmation without a terminal.
- Vercel refuses a head commit authored by `noreply@anthropic.com`: author
  `main` commits as Albin and credit agents in the trailer.
