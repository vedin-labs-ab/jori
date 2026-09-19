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
| `pnpm backend <name>` | A preview deployment for a task's worktree, with dev's settings. |

- `pnpm dev` already pushes Convex to the dev deployment; a worktree that
  needs a live backend gets one from `pnpm backend <name>`. It copies dev's
  settings one at a time without printing them, and sets the region and
  origins itself. Previews run in the EU and dev in the US, so a dev
  variable named `PREVIEW_<NAME>` replaces `<NAME>` on previews. The EU
  bucket's R2 key reaches them that way.
- Production ships from pushed `main`, reusing the gate pass landing
  recorded. Gitleaks 8.30.1 must be on `PATH` (or set `GITLEAKS_BIN`);
  every production ship scans all available Git history again, including
  refs, before reusing that pass. `--yes` replaces the typed confirmation
  without a terminal.
- Vercel refuses a head commit authored by `noreply@anthropic.com`: author
  `main` commits as the developer and credit yourself in the trailer.
