# Sandboxes

## Responsibility

Owns the Daytona cloud environments where Milo agents run.

## Includes

- Exactly one Daytona sandbox for each execution.
- Milo agents always running inside Daytona sandboxes, never directly inside Milo-owned infrastructure.
- Runtime access to models, tools, integrations, files, and execution environments.
- A single active sandboxed agent instance for a given activated conversation.
- Relevant new conversation messages routed into that active instance as steering context.
- Lightweight model-based filtering before steering so unrelated conversation chatter does not hold up the active work.
- Immediate sandbox termination when an admin kills an execution from the console.

## Draft Schema

```ts
sandboxes: defineTable({
  organizationId: v.id("organizations"),
  executionId: v.id("executions"),
  provider: v.literal("daytona"),
  externalId: v.string(),
  status: v.union(v.literal("starting"), v.literal("ready"), v.literal("stopped"), v.literal("failed")),
  createdAt: v.number(),
})
```
