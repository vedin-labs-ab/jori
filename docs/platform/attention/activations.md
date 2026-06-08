# Activations

## Responsibility

Stores the Slack thread Milo is currently listening to.

## Includes

- One row per activated Slack thread.
- The trigger that created the activation.
- The current execution for that thread, when one is active.

## Draft Schema

```ts
activations: defineTable({
  tenantId: v.string(),
  triggerId: v.id("triggers"),
  integrationId: v.id("integrations"),
  threadId: v.string(),
  executionId: v.optional(v.id("executions")),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
})
```
