# Sandboxes

## Responsibility

Owns isolated cloud environments where agents can inspect, edit, run, test, and produce work without directly mutating company systems.

## Includes

- Sandboxed Milo instances started from an activation when the conversation may need delegated work.
- Runtime access to models, tools, integrations, files, and execution environments.
- Provider-backed isolation for agent work, such as Daytona environments.
- A single active sandbox instance for a given activated conversation.
- Relevant new conversation messages routed into that active instance as steering context.
- Lightweight model-based filtering before steering so unrelated conversation chatter does not hold up the active work.
- Immediate sandbox termination when an admin kills an execution from the console.

## Draft Schema

```ts
sandboxes: defineTable({
  organizationId: v.id("organizations"),
  runId: v.id("runs"),
  provider: v.string(),
  externalId: v.string(),
  status: v.union(v.literal("starting"), v.literal("ready"), v.literal("stopped"), v.literal("failed")),
  createdAt: v.number(),
})
```
