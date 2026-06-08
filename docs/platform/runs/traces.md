# Traces

## Responsibility

Stores the Convex file pointer for raw runtime trace output.

## Includes

- One trace file per execution.
- Raw harness command stdout, stderr, exit codes, and command errors.
- Raw Codex agent JSONL, including reasoning events.

## Boundary

Execution lifecycle state, sandbox identity, prompt assembly, tool assembly, Slack identifiers, and derived final-message details belong outside the stored trace file. Trace content lives in Convex storage.

## Draft Schema

```ts
traces: defineTable({
  tenantId: v.string(),
  executionId: v.id("executions"),
  fileId: v.id("_storage"),
  createdAt: v.number(),
})
```
