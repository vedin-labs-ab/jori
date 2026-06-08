# Execution

## Responsibility

Owns the persisted agent-flow record: state, active Daytona sandbox identity, review state, observability, and completion.

## Includes

- State such as queued, running, blocked, completed, or failed.
- One execution record for every mention-triggered agent flow, including short conversational responses.
- Daytona sandbox provider identifiers stored directly on the execution.
- Console visibility for queued, running, blocked, completed, failed, and stopped executions.
- Agent instances always run inside Daytona sandboxes, never directly inside Milo-owned infrastructure.
- Agent instances started from a mention-triggered activation when no sandboxed agent instance is already active for that conversation scope.
- Actions that change Milo or external tools.
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

Agent capabilities belong to [Agents](../agents/agents.md). Durable listening state belongs to [Activations](../attention/activations.md). Review points belong to [Reviews](../attention/reviews.md). Detailed observability belongs to [Traces](./traces.md).

## Draft Schema

```ts
executions: defineTable({
  externalTenantId: v.string(),
  agentId: v.id("agents"),
  activationId: v.optional(v.id("activations")),
  startedBySourceId: v.optional(v.id("sources")),
  daytonaSandboxId: v.optional(v.string()),
  daytonaWorkspaceId: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("blocked"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
```
