# Traces

## Responsibility

Owns records produced around a run: what triggered it, what the agent did, what tools changed, and why Milo believes the result.

## Includes

- Attention decisions from triggers, activations, and reviews.
- Model calls, tool calls, sandbox activity, and artifacts.
- Permission, policy, and autonomy decisions made during the run.
- Evidence that supports memory updates after the run.

## Boundary

Source material belongs to [Sources](../context/sources.md). Durable interpretation belongs to [Memory](../context/memory.md).

## Draft Schema

```ts
traces: defineTable({
  organizationId: v.id("organizations"),
  runId: v.optional(v.id("runs")),
  sourceId: v.optional(v.id("sources")),
  kind: v.string(),
  summary: v.string(),
  createdAt: v.number(),
})
```
