# Sandboxes

## Responsibility

Owns isolated cloud environments where agents can inspect, edit, run, test, and produce work without directly mutating company systems.

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
