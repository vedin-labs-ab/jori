# Convex

Convex-owned entry points stay at this root:

- `auth.config.ts`: Clerk JWT provider configuration.
- `http.ts`: HTTP routes and Slack webhooks.
- `schema.ts`: root database schema.
- `_generated`: generated Convex files.

Milo-owned modules are organized by responsibility:

- `identity`: Clerk-backed organization behavior.
- `context`: integrations and observed messages.
- `attention`: triggers and active listening state.
- `runs`: executions and runtime orchestration.
- `providers/slack`: Slack protocol details.
- `schemas`: one table definition per file.
