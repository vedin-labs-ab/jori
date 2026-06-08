# Traces

## Responsibility

Owns append-only records produced around an execution: what triggered it, what the agent did, what tools changed, and why Milo reached an outcome.

## Includes

- Attention decisions from triggers and activations.
- Model calls, tool calls, Daytona lifecycle notes, and external writes.
- Policy and autonomy decisions made during the execution.
- Replies sent back to the source conversation.
- Errors, stops, confirmation requests, and completion summaries.

## Boundary

Message material belongs to [Messages](../context/messages.md). Execution lifecycle state belongs to [Execution](./execution.md).

## Draft Schema

```ts
traces: defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  fileId: v.id("_storage"),
  createdAt: v.number(),
})
```
