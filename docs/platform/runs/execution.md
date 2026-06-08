# Execution

## Responsibility

Owns the persisted agent-flow record: planning, model calls, tool calls, sandbox activity, state transitions, observability, and completion.

## Includes

- State such as queued, running, blocked, completed, or failed.
- One execution record for every mention-triggered agent flow, including short conversational responses.
- One Daytona sandbox for every execution.
- Console visibility for queued, running, blocked, completed, failed, and stopped executions.
- Agent instances always run inside Daytona sandboxes, never directly inside Milo-owned infrastructure.
- Agent instances started from a mention-triggered activation when no sandboxed agent instance is already active for that conversation scope.
- Actions that change Milo or external tools.
- Artifacts produced by people, agents, or systems.
- Sandbox activity where agent work happens.
- Communication decisions such as staying silent, acknowledging longer work, or posting a completion update back to the source conversation.
- Steering messages sent to an existing Milo instance while work is running.
- Mention and non-mention messages routed to the active instance when they are relevant to the running work.
- Model-based relevancy checks that decide whether any new conversation message should interrupt or steer the running instance.
- Steering intent classified as either abort or amendment.
- Abort steering passed into Milo so it can wind down, summarize progress, and ask about reverting writes when work changed company systems.
- User-requested aborts as steering messages.
- Admin-forced stops as immediate operational kills from the console.
- Dangerous actions handled by asking for verification, recording a review, and winding down until the user confirms in the conversation.

## Boundary

Agent capabilities belong to [Agents](../agents/agents.md). Durable listening state belongs to [Activations](../attention/activations.md). Sandbox lifecycle belongs to [Sandboxes](./sandboxes.md). Review points belong to [Reviews](../attention/reviews.md). Permissions belong to [Permissions](../identity/permissions.md).

## Draft Schema

```ts
executions: defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("agents"),
  activationId: v.optional(v.id("activations")),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("blocked"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  title: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
```
