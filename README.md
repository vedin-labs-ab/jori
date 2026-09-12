# Jori

[Jori](https://usejori.com) helps teams get work done across their connected tools.
This repository contains the application, agent prompts, and skills.

Source-available under the [Sustainable Use License](LICENSE.md).
See [third-party notices](NOTICE.md) for copied code and assets, and
[SECURITY.md](SECURITY.md) to report a vulnerability privately.

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.
The frontend uses React and TanStack Start; Convex runs the backend.
Local development requires a Convex development deployment and credentials
for the services you use.

For a new checkout without `.env.local`:

```sh
pnpm install --frozen-lockfile
cp .env.local.example .env.local
pnpm exec convex dev --configure
```

For an existing checkout, keep its `.env.local`. The Convex setup writes the
deployment selection and URL. Stop that process after setup,
then fill in the remaining frontend values from your development deployment.
The comments in [.env.local.example](.env.local.example) list the backend
settings, social sign-in callbacks and service credentials to configure in
Convex. Keep backend secrets out of `VITE_*` variables, which are public.

```sh
pnpm dev
```

The app serves at `http://localhost:8050`. Workspace creation is allowlisted;
see `convex/access/allowlist.ts` when configuring your development account.
Production uses separate target files described in
[.env.prod-us.local.example](.env.prod-us.local.example).

## Working on the code

Start with [the docs index](docs/index.md) for architecture, permissions,
integrations and regional boundaries. Follow [AGENTS.md](AGENTS.md) for the
task-worktree and landing workflow.

```sh
pnpm task my-change
# Work and commit in the task worktree, then return to the primary checkout.
pnpm land my-change
```

`pnpm land` runs the checks and tests before merging. To run them directly:

```sh
pnpm check
pnpm test
```

Pass test paths to `pnpm test` for focused runs. `pnpm check:fix` formats code
and regenerates compiled content. Prompts and skills are runtime inputs and
need the same review as application code.
