# Traces

## Responsibility

Stores the Convex file pointer for raw Codex agent trace output.

## Includes

- Raw Codex agent JSONL, including reasoning, tool calls, tool results, and final response events.
- One trace file per execution where the Codex agent started.

## Boundary

Execution lifecycle state, sandbox identity, prompt assembly, tool assembly, Slack identifiers, harness diagnostics, failure summaries, and derived final-message details belong outside the stored trace file. Failed executions store their failure summary on the execution row. Trace content lives in Convex storage.

## Draft Schema

```ts
traces: defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  fileId: v.id("_storage"),
  createdAt: v.number(),
})
```
