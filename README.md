# Milo

Milo is an AI teammate for company work. The application uses TanStack Start,
Convex with Better Auth, and Trigger.dev.

## Development

Install dependencies, configure the local services, and start the frontend:

```sh
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Normal development exposes only the US product region at
`http://localhost:5173`. The public and US application origins are the same
locally, so no custom DNS, TLS, or reverse proxy is required. Development
deployments are test infrastructure and do not make a customer-facing
residency guarantee.

Run the complete repository checks before handing off a change:

```sh
pnpm check
```

Changes to Convex must also be validated against the configured development
deployment:

```sh
pnpm deploy
```

## Data regions

Milo is designed as two isolated regional applications built from the same
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

Production deployment commands will be introduced when the named regional
Convex and frontend targets exist. `pnpm deploy` continues to validate the
currently selected development deployment and does not claim to deploy a US or
EU production target.

EU selection remains disabled until every launch gate in [EU.md](EU.md) is
cleared. That document is the source of truth for residency scope, provider
readiness, and operational enablement.
