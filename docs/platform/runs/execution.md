# Execution

## Responsibility

Owns the persisted Milo run record: state, Daytona sandbox identity, observability, and completion.

## Includes

- State such as queued, running, completed, failed, or stopped.
- One execution record for every mention-triggered Milo run, including short conversational responses.
- Daytona sandbox provider identifiers stored directly on the execution.
- Console visibility for queued, running, completed, failed, and stopped executions.
- Milo runs inside Daytona sandboxes, never directly inside Milo-owned infrastructure.
- Milo starts from a mention-triggered activation when no sandboxed run is already active for that conversation scope.
- Actions that change Milo or external tools.
- Communication decisions such as staying silent, acknowledging longer work, or posting a completion update back to the source conversation.
- Steering messages sent to an existing Milo instance while work is running.
- Mention and non-mention messages routed to the active instance when they are relevant to the running work.
- Model-based relevancy checks that decide whether any new conversation message should interrupt or steer the running instance.
- Steering intent classified as either abort or amendment.
- Abort steering passed into Milo so it can wind down, summarize progress, and ask about reverting writes when work changed company systems.
- User-requested aborts as steering messages.
- Admin-forced stops as immediate operational kills from the console.
- Dangerous actions handled by asking for confirmation in the source conversation and waiting until the user confirms.

## Boundary

Durable listening state belongs to [Activations](../attention/activations.md). Detailed observability belongs to [Traces](./traces.md).

## Draft Schema

```ts
executions: defineTable({
  tenantId: v.string(),
  sandboxId: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("stopped")),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
```
