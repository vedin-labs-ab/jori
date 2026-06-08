# Executions

## Responsibility

Stores a Milo run.

## Includes

- The trigger that caused the run.
- Lifecycle state.
- E2B sandbox identifier.
- Active MCP token hash.
- Creator and completion timestamps.

## Boundary

Run cause belongs to [Triggers](../attention/triggers.md). The active thread link belongs to [Activations](../attention/activations.md). Full run details belong to [Traces](./traces.md).

## Draft Schema

```ts
executions: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  sandboxId: v.optional(v.string()),
  tokenHash: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
```
