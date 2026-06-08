# Dreaming

## Responsibility

Owns background processes that study company traces and agent work to improve what Milo can do next.

## Owns

- Reflection over sources, memory, runs, outcomes, and user feedback.
- Opportunity discovery where Milo could help, automate, summarize, route, or prepare.
- Pattern detection across repeated friction, manual effort, and successful runs.

## Boundary

Dreaming proposes improvements. [Agents](../agents/agents.md) own active capabilities. [Execution](../runs/execution.md) owns execution attempts. [Permissions](../identity/permissions.md) own permission to apply sensitive changes.

## Draft Schema

```ts
dreams: defineTable({
  organizationId: v.id("organizations"),
  kind: v.union(v.literal("reflection"), v.literal("opportunity"), v.literal("pattern")),
  summary: v.string(),
  status: v.union(v.literal("open"), v.literal("accepted"), v.literal("dismissed")),
  createdAt: v.number(),
})
```
