# Tech Stack

This document is the source of truth for Milo's technical stack.

## Frontend

- React with TypeScript: application UI and domain views.
- Clerk: authentication, user sign-up, and organization creation using out-of-the-box components where possible.
- Tailwind CSS 4: styling.
- shadcn/ui: default UI primitives.
- TanStack: routing, data coordination, and application structure.
- Vite: local development and production builds.
- Vercel, likely: frontend hosting.

## Backend

- Convex: application data, server functions, realtime sync, and backend coordination.

## AI

- Codex: temporary Milo runtime for the first Slack-trigger prototype.
- User subscription credentials: temporary model access for the first version.
- E2B: cloud sandboxes for isolated Milo execution.

OpenRouter and Pi are deferred until the Slack-trigger prototype proves the runtime loop.

## Code Quality

- Biome: linting and formatting.
