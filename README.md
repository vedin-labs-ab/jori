# Jori

Jori is an AI teammate for company work. The application uses TanStack Start,
Convex with Better Auth, and Trigger.dev.

## Environments

Jori runs in two environments. Every resource is named for the environment
that owns it, so a name always says which environment it belongs to.

| | `dev` | `prod` |
| --- | --- | --- |
| Frontend | `localhost:5173` | Vercel, `usejori.com` |
| Convex project | `jori-dev` | `jori-prod-us` |
| Trigger.dev environment | `dev` | `prod` |
| E2B template | `jori-sandbox-dev` | `jori-sandbox-prod` |
| Local env file | `.env.dev.local` | `.env.prod.local` |

A staging environment slots in without renaming anything: add `staging` to
`scripts/env/names.ts`, add `.env.staging.local`, and provision resources
under the matching `jori-staging` names.

`.env.dev.local` holds working development credentials. `.env.prod.local`
holds credentials that *target* production — deploy keys — never the secrets
production *runs on*. Those live in the Convex and Vercel dashboards, and
`pnpm deploy:prod` verifies the deployment holds them before it deploys.

## Development

Install dependencies, create the development deployment, and start everything:

```sh
pnpm install
```

```sh
cp .env.dev.local.example .env.dev.local
```

The Convex CLI creates the deployment and writes `CONVEX_DEPLOYMENT` into that
file. Run it once per machine:

```sh
npx convex dev --configure
```

Then one command runs the frontend, the Convex watcher, and the Trigger.dev
worker together:

```sh
pnpm dev
```

Normal development exposes only the US product region at
`http://localhost:5173`. The public and US application origins are the same
locally, so no custom DNS, TLS, or reverse proxy is required. Development
deployments are test infrastructure and do not make a customer-facing
residency guarantee.

Run the repository checks and the tests before handing off a change. Together
they are the handoff gate, and they do not touch any deployment:

```sh
pnpm check && pnpm test
```

The `pnpm dev` watcher keeps the development deployment in step with the
working tree. `pnpm deploy:dev` pushes it once without that watcher running.

## Deploying to production

Production is deployed by a person, explicitly, from `main`:

```sh
pnpm deploy:prod
```

The command refuses to start unless the checkout is clean, `main` is checked
out, `main` matches `origin/main`, the checks and tests pass, and the
production Convex deployment already holds every variable it needs. It then
deploys Convex, deploys the frontend to Vercel, and syncs the skill catalog.

Nothing else deploys to production. Pushing `main` deploys nothing: Vercel's
git integration is turned off for `main` in `vercel.json`, so the only route to
production is the command above.

## Data regions

Jori is designed as two isolated regional applications built from the same
codebase. Region is deployment configuration, not a property repeated across
product records.

| Host role | Example | Responsibility |
| --- | --- | --- |
| Public entry | `example.com` | Remembers a region and redirects to a regional host |
| US application | `us.example.com` | US marketing, authentication, console, and Convex |
| EU application | `eu.example.com` | EU marketing, authentication, console, and Convex |

The real domain is intentionally not encoded in the application. Production
deployments provide the public and regional origins through environment
variables.

While US is the only enabled region, the public entry and the US application
are the same origin: `usejori.com` serves the product directly rather than
redirecting to a regional host. Enabling EU splits them, moving the US
application to its own hostname and leaving the apex as a routing edge. Only
sign-in callbacks are pinned to the application origin, so that split costs two
OAuth client updates rather than a re-registration of every integration.

`pnpm deploy:prod` deploys the US production target. When EU is enabled it
splits into `deploy:prod:us` and `deploy:prod:eu` with `deploy:prod` as the
serialized parent.

EU selection remains disabled until every launch gate in [EU.md](EU.md) is
cleared. That document is the source of truth for residency scope, provider
readiness, and operational enablement.
