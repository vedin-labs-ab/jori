# Executions

## Responsibility

Stores a Milo run.

## Includes

- The trigger that caused the run.
- Lifecycle state.
- E2B sandbox identifier.
- Active MCP token hash.
- Failure summary.
- Creator and completion timestamps.

## Boundary

Run cause belongs to [Triggers](../attention/triggers.md). Full run details belong to [Traces](./traces.md).

## Draft Schema

```ts
executions: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  sandboxId: v.optional(v.string()),
  hash: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  error: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
```
