# Traces

## Responsibility

Stores the Convex file pointer for a full execution trace.

## Includes

- One trace file per execution trace snapshot.
- Model calls, tool calls, E2B events, Slack replies, errors, and final result details inside the file.

## Boundary

Execution lifecycle state belongs to [Executions](./executions.md). Trace content lives in Convex storage.

## Draft Schema

```ts
traces: defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  fileId: v.id("_storage"),
  createdAt: v.number(),
})
```
