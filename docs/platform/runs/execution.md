# Execution

## Responsibility

Owns what happens during a run: planning, model calls, tool calls, sandbox activity, state transitions, and completion.

## Includes

- State such as queued, running, blocked, completed, or failed.
- Actions that change Milo or external tools.
- Artifacts produced by people, agents, or systems.
- Sandbox activity where agent work happens.
- Communication decisions such as staying silent, acknowledging longer work, or posting a completion update back to the source conversation.
- Steering messages sent to an existing Milo instance while work is running.
- Model-based relevancy checks that decide whether any new conversation message should interrupt or steer the running instance.
- Steering intent classified as either abort or amendment.
- Abort steering passed into Milo so it can wind down, summarize progress, and ask about reverting writes when work changed company systems.
- User-requested aborts as steering messages.
- Admin-forced stops as immediate operational kills from the console.
- Dangerous actions handled by asking for verification, recording a review, and winding down until the user confirms in the conversation.

## Boundary

Agent capabilities belong to [Agents](../agents/agents.md). Durable listening state belongs to [Activations](../attention/activations.md). Review points belong to [Reviews](../attention/reviews.md). Permissions belong to [Permissions](../identity/permissions.md).

## Draft Schema

```ts
executions: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("agents"),
  activationId: v.optional(v.id("activations")),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("blocked"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
```
