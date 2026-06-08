# Structure

This document maps Milo's code layout to the platform domains.

## Backend

Convex-owned entry points stay at the root of `convex`:

- `auth.config.ts`: Clerk JWT configuration.
- `http.ts`: HTTP routes and webhook entry points.
- `schema.ts`: root database schema.
- `_generated`: generated Convex code.

Domain code lives under folders named for responsibility:

- `identity`: Clerk-backed organization behavior.
- `context`: integrations and observed messages.
- `attention`: triggers and active listening state.
- `runs`: execution lifecycle and runtime orchestration.
- `providers/slack`: Slack protocol code, including OAuth, signing, event parsing, and relevance checks.
- `schemas`: one table definition per file, imported by the root schema.

## Frontend

TanStack route files stay in `src/routes`, and generated router output stays in `src/routeTree.gen.ts`.

Product code lives under folders named for responsibility:

- `setup`: first-run sign-up, organization, website, and Slack connection UI.
- `shared`: cross-domain frontend helpers and components.
- `design`: internal design review surfaces.
- `components/ui`: shadcn/ui primitives.

## Naming

Use one-word folder and file names for Milo-owned code. Keep framework-owned, generated, or shadcn-owned names in their conventional locations unless a move removes more confusion than it creates.
