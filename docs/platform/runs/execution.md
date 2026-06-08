# Executions

## Responsibility

Stores a Milo run.

## Includes

- Lifecycle state.
- Daytona sandbox identifier.
- Creator and completion timestamps.

## Boundary

The active thread link belongs to [Activations](../attention/activations.md). Full run details belong to [Traces](./traces.md).

## Draft Schema

```ts
executions: defineTable({
  tenantId: v.string(),
  sandboxId: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
```
