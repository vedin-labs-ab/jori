# Execution

## Responsibility

Owns what happens during a run: planning, model calls, tool calls, sandbox activity, state transitions, and completion.

## Includes

- State such as queued, running, blocked, completed, or failed.
- Actions that change Milo or external tools.
- Artifacts produced by people, agents, or systems.
- Sandbox activity where agent work happens.

## Boundary

Agent capabilities belong to [Agents](../agents/agents.md). Review points belong to [Reviews](../attention/reviews.md). Permissions belong to [Permissions](../identity/permissions.md).

## Draft Schema

```ts
executions: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("agents"),
  activationId: v.optional(v.id("activations")),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("blocked"), v.literal("completed"), v.literal("failed")),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
```
