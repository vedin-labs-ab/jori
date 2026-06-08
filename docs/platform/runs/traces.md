# Traces

## Responsibility

Owns append-only records produced around an execution: what triggered it, what the agent did, what tools changed, and why Milo reached an outcome.

## Includes

- Attention decisions from triggers, activations, and reviews.
- Model calls, tool calls, Daytona lifecycle notes, and external writes.
- Policy and autonomy decisions made during the execution.
- Replies sent back to the source conversation.
- Errors, stops, review requests, and completion summaries.

## Boundary

Source material belongs to [Sources](../context/sources.md). Execution summary state belongs to [Execution](./execution.md).

## Draft Schema

```ts
traces: defineTable({
  externalTenantId: v.string(),
  executionId: v.id("executions"),
  sourceId: v.optional(v.id("sources")),
  kind: v.string(),
  summary: v.string(),
  data: v.optional(v.any()),
  createdAt: v.number(),
})
```
